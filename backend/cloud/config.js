/* global Parse */
// ^ for eslint

/**
 * @typedef {Object} ClowdrConfig
 * @property {string | undefined} TWILIO_API_KEY
 * @property {string | undefined} TWILIO_API_SECRET
 * @property {string | undefined} TWILIO_ACCOUNT_SID
 * @property {string | undefined} TWILIO_AUTH_TOKEN
 * @property {string | undefined} TWILIO_CHAT_SERVICE_SID
 * @property {string | undefined} TWILIO_ANNOUNCEMENTS_CHANNEL_SID
 */

/**
 * Loads the conference configuration.
 * 
 * @param {string} confId The Id of the conference.
 * @returns {Promise<ClowdrConfig>} The configuration
 */
async function getConfig(confId) {
    const config = {};

    // Load config from the database
    const q = new Parse.Query("ConferenceConfig")
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    const res = await q.find({ useMasterKey: true });
    for (const obj of res) {
        config[obj.get("key")] = obj.get("value");
    }

    return config;
}

module.exports = {
    getConfig: getConfig
};
