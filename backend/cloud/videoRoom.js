/* global Parse */
// ^ for eslint

const { getTwilioChatService } = require("./twilio");
const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

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

/**
 * @typedef {Object} VideoRoomSpec
 * @property {number} capacity
 * @property {boolean} ephemeral
 * @property {string} name
 * @property {string | undefined} [twilioID]
 * @property {Pointer} conference
 * @property {Pointer | undefined} [textChat]
 */

const createVideoRoomSchema = {
    capacity: "number",
    ephemeral: "boolean",
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
async function createVideoRoom(data) {
    const newObject = new Parse.Object("VideoRoom", data);
    await configureDefaultProgramACLs(newObject);
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
            if (spec.textChat) {
                spec.textChat = new Parse.Object("TextChat", { id: spec.textChat });
            }
            const result = await createVideoRoom(spec);
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
