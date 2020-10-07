/* global Parse */
// ^ for eslint

const { getRoleByName } = require("./role");
const { getUserById, getProfileOfUser } = require("./user");

// TODO: Before delete: Prevent delete if still in use anywhere
// TODO: Before delete: Delete channel in Twilio
// TODO: Before delete: Delete mirrored TextChatMessage

Parse.Cloud.afterSave("TextChat", async (req) => {
    const textChat = req.object;
    if (textChat.get("autoWatch")) {
        const acl = textChat.getACL();
        const conference = textChat.get("conference");
        const attendeeRole = await getRoleByName(conference.id, "attendee");

        if (acl.getRoleReadAccess(attendeeRole)) {
            // Public: everyone should be auto-watching
            const profilesQ = new Parse.Query("UserProfile");
            profilesQ.equalTo("conference", conference);
            profilesQ.includeAll();
            await Promise.all(profilesQ.map(async profile => {
                const watched = profile.get("watched");
                const existingWatchedChats = watched.get("watchedChats");
                const newWatchedChats
                    = existingWatchedChats.includes(textChat.id)
                        ? existingWatchedChats
                        : [...existingWatchedChats, textChat.id];
                await watched.save({
                    watchedChats: newWatchedChats
                }, { useMasterKey: true });
            }, { useMasterKey: true }));
        }
        else {
            // Follow ACL users to determine who to force to watch this chat
            const keys = Object.keys(acl.permissionsById);
            await Promise.all(keys.map(async key => {
                if (!key.startsWith("role:")) {
                    // Key is a user id
                    const user = await getUserById(key);
                    const profile = await getProfileOfUser(user, conference.id);
                    const watched = profile.get("watched");
                    const existingWatchedChats = watched.get("watchedChats");
                    const newWatchedChats
                        = existingWatchedChats.includes(textChat.id)
                            ? existingWatchedChats
                            : [...existingWatchedChats, textChat.id];
                    await watched.save({
                        watchedChats: newWatchedChats
                    }, { useMasterKey: true });
                }
            }));
        }
    }
});

async function getTextChatByName(name, confId) {
    const q = new Parse.Query("TextChat");
    q.equalTo("conference", new Parse.Object("Conference", { id: confId }));
    q.equalTo("name", name);
    return q.first({ useMasterKey: true });
}

async function getAutoWatchTextChats(conference, sessionToken) {
    const query = new Parse.Query("TextChat");
    query.equalTo("conference", conference);
    query.equalTo("autoWatch", true);
    return await query.map(x => x, { sessionToken });
}

module.exports = {
    getTextChatByName: getTextChatByName,
    getAutoWatchTextChats: getAutoWatchTextChats
};
