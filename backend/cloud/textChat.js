/* global Parse */
// ^ for eslint

const { getTwilioChatService } = require("./twilio");

// TODO: After save: If auto-subscribe, subscribe existing users
// TODO: Before delete: Delete channel in Twilio
// TODO: Before delete: Delete mirrored TextChatMessage

Parse.Cloud.beforeSave("TextChat", async (req) => {
    if (req.object.isNew()) {
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

// TODO: Create TextChat
