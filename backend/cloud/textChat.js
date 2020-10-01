/* global Parse */
// ^ for eslint

// TODO: After save: If auto-watch, add watches for existing users
// TODO: Before delete: Prevent delete if still in use anywhere
// TODO: Before delete: Delete channel in Twilio
// TODO: Before delete: Delete mirrored TextChatMessage

const { getTwilioChatService } = require("./twilio");
const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

Parse.Cloud.beforeSave("TextChat", async (req) => {
    if (req.object.isNew() && !req.object.get("twilioID")) {
        const parseChat = req.object;
        const confId = parseChat.get("conference").id;
        const twilioChatService = await getTwilioChatService(confId);
        if (twilioChatService) {
            const friendlyName = req.object.get("name");
            const uniqueName = friendlyName;
            const createdBy = "system";
            const mode = "public";
            const attributes = {
                isDM: false
            };

            let existingChannel;
            try {
                existingChannel = await twilioChatService.channels.get(uniqueName).fetch();
            }
            catch {
                existingChannel = undefined;
            }

            if (!existingChannel) {
                const newTwilioChannel = await twilioChatService.channels.create({
                    friendlyName,
                    uniqueName,
                    createdBy,
                    type: mode,
                    attributes: JSON.stringify(attributes)
                });

                req.object.set("twilioID", newTwilioChannel.sid);
            }
            else {
                req.object.set("twilioID", existingChannel.sid);
            }
        }
        else {
            throw new Error("Cannot create TextChat because conference does not have Twilio configured.");
        }
    }
});

// **** Text Chat **** //

/**
 * @typedef {Object} TextChatSpec
 * @property {boolean} autoWatch
 * @property {boolean | undefined} [mirrored]
 * @property {string} name
 * @property {string | undefined} [twilioID]
 * @property {Pointer} conference
 */

const createTextChatSchema = {
    autoWatch: "boolean",
    mirrored: "boolean?",
    name: "string",
    conference: "string",
    twilioID: "string?",
};

/**
 * Creates a Text Chat.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {TextChatSpec} data - The specification of the new Text Chat.
 * @returns {Promise<Parse.Object>} - The new Text Chat
 */
async function createTextChat(data) {
    const newObject = new Parse.Object("TextChat", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateTextChat(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createTextChatSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (!spec.mirrored) {
                spec.mirrored = false;
            }
            if (!await isUserInRoles(user.id, confId, ["admin", "manager"])) {
                spec.mirrored = false;
                spec.autoWatch = false;
                if (!spec.twilioID) {
                    throw new Error("Refusing to create TextChat record for attendee for a channel that doesn't exist in Twilio.");
                }
                else {
                    // TODO: Validate the TwilioID using the Twilio API
                }
            }

            const result = await createTextChat(spec);
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
Parse.Cloud.define("textChat-create", handleCreateTextChat);

module.exports = {
    createTextChat: createTextChat
};
