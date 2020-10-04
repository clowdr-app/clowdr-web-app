/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");
const { createTextChat, getTextChatByName } = require("./textChat");
const { getUserById, getProfileOfUser } = require("./user");

// TODO: Before delete: Kick any members, delete room in Twilio

// Video rooms are created in Twilio only when they are first needed.
// So they are created when a user requests an access token for a room -
// accounting for whether that room already exists or has expired in Twilio.
//
// This is why below, we create video rooms in Parse but don't allocate them
// a video room inside Twilio.
//
// This is in stark contrast to Twilio Text Chats, where we allocate those
// immediately inside Twilio - partly because they are persistent.

// **** Video Room **** //

async function getRoomById(roomId, confId) {
    const q = new Parse.Query("VideoRoom");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    return await q.get(roomId, { useMasterKey: true });
}

/**
 * @typedef {Object} VideoRoomSpec
 * @property {number} capacity
 * @property {boolean} ephemeral
 * @property {boolean} isPrivate
 * @property {string} name
 * @property {string | undefined} [twilioID]
 * @property {Pointer} conference
 * @property {Pointer | undefined} [textChat]
 */

const createVideoRoomSchema = {
    capacity: "number",
    ephemeral: "boolean",
    isPrivate: "boolean",
    name: "string",
    twilioID: "string?",
    conference: "string",
    textChat: "string?",
};

/**
 * Creates a Video Room.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {VideoRoomSpec} data - The specification of the new Video Room.
 * @returns {Promise<Parse.Object>} - The new Video Room
 */
async function createVideoRoom(data, user) {
    const newObject = new Parse.Object("VideoRoom", data);

    const confId = newObject.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setWriteAccess(user, true);
    if (data.isPrivate) {
        acl.setRoleReadAccess(managerRole, true);
        acl.setRoleReadAccess(adminRole, true);

        acl.setReadAccess(user, true);
    }
    else {
        acl.setRoleReadAccess(attendeeRole, true);
    }
    acl.setRoleWriteAccess(managerRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    newObject.setACL(acl);

    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateVideoRoom(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createVideoRoomSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            // Prevent non-admin/manager from creating persistent rooms
            // Prevent non-admin/manager from creating large rooms
            if (!await isUserInRoles(user.id, confId, ["admin", "manager"])) {
                spec.ephemeral = true;
                spec.capacity = 10;
            }
            // Clamp capacity down to Twilio max size
            spec.capacity = Math.min(spec.capacity, 50);

            // For now, if a text chat is not included, we will automatically create one
            if (!spec.textChat) {
                if (!spec.isPrivate) {
                    const newChatSpec = {
                        autoWatch: false,
                        mirrored: false,
                        name: spec.name,
                        conference: spec.conference,
                    };
                    const existingChat = await getTextChatByName(newChatSpec.name, spec.conference.id);
                    if (existingChat) {
                        if (!existingChat.get("isPrivate")) {
                            spec.textChat = existingChat;
                        }
                        else {
                            throw new Error("Cannot create text chat - conflicting name.");
                        }
                    }
                    else {
                        const newChat = await createTextChat(newChatSpec);
                        spec.textChat = newChat;
                    }
                }
                else {
                    // TODO: Enable creation of text chats that are private in Parse
                    //       (At the moment, we assume all text chats in Parse are public chats)
                }
            }
            else {
                spec.textChat = new Parse.Object("TextChat", { id: spec.textChat });
            }

            const result = await createVideoRoom(spec, user);
            return result.id;
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("videoRoom-create", handleCreateVideoRoom);

/**
 * Gives a user access (ACL) for a video room.
 * 
 * Does nothing if the room is not private.
 * 
 * @param {Parse.Object} room - Video room to modify
 * @param {Parse.User} user - User to grant access
 * @param {boolean} write - Whether to grant write-access or not
 * @param {string} sessionToken - Current user's session token
 */
async function grantAccessToVideoRoom(room, user, write, sessionToken) {
    if (!room.get("isPrivate")) {
        // Public room, nothing to do.
        return;
    }

    const acl = room.getACL();
    acl.setReadAccess(user, true);
    if (write) {
        acl.setWriteAccess(user, true);
    }
    room.setACL(acl);
    await room.save(null, { sessionToken: sessionToken });
}

const inviteToVideoRoomSchema = {
    conference: "string",
    room: "string",
    users: "[string]",
    write: "boolean"
};

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleInviteToVideoRoom(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(inviteToVideoRoomSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;
        const roomId = params.room;

        const room = await getRoomById(roomId, confId);
        const results = {};
        for (const userId of params.users) {
            const targetUser = await getUserById(userId);
            let succeeded = false;
            if (targetUser) {
                if (await getProfileOfUser(targetUser, confId)) {
                    try {
                        await grantAccessToVideoRoom(room, targetUser, params.write, user.getSessionToken());
                        succeeded = true;
                    }
                    catch (e) {
                        succeeded = false;
                    }
                }
            }
            results[userId] = succeeded;
        }
        return results;
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("videoRoom-invite", handleInviteToVideoRoom);
