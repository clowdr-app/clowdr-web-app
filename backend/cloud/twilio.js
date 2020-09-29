const Twilio = require("twilio");
const { getConfig } = require("./config");

/**
 * @typedef { import("./config").ClowdrConfig } ClowdrConfig
 */

/**
 * Creates a Twilio client for the relevant conference (if configured).
 * 
 * @param {string} confId - The Id of the conference.
 * @param {ClowdrConfig} [config] - The existing conference config.
 * @returns {Promise<Twilio.Twilio | undefined>} - The Twilio client.
 */
async function createTwilioClient(confId, config) {
    config = config ?? await getConfig(confId);
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
        return undefined;
    }

    return Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
}

/**
 * Creates a Twilio Chat Service for the relevant conference and chat service (if configured).
 *
 * @param {string} confId - The Id of the conference.
 * @param {ClowdrConfig} [config] - The existing conference config.
 */
async function getTwilioChatService(confId, config) {
    config = config ?? await getConfig(confId);
    if (!config.TWILIO_CHAT_SERVICE_SID) {
        return undefined;
    }

    const client = await createTwilioClient(confId, config);
    if (!client) {
        return undefined;
    }

    return client?.chat.services(config.TWILIO_CHAT_SERVICE_SID);
}

module.exports = {
    createTwilioClient: createTwilioClient,
    getTwilioChatService: getTwilioChatService
};
