/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, generateRoleDBName } = require("./role");
const assert = require("assert");
const { logRequestError } = require("./errors");

//const { getAutoWatchTextChats } = require("./user");
// Dunno why but Live Query just doesn't respond with correct data when using this
// so I'm giving up on it for now. It may not be desirable anyway - e.g. people
// may want to unfollow lobby chats or admins unfollow announcements.
// Parse.Cloud.beforeSave("WatchedItems", async (request) => {
//     // TODO: If is an author, auto-watch them to the text chats for their papers
//     // TODO: Do we want authors to be auto-watching their items & content feeds (video rooms/text chats)

//     // We can't run this code on a new WatchedItems as a profile won't have been
//     // assigned to it yet.
//     if (!request.object.isNew() && request.user) {
//         const watched = request.object;
//         const conf = watched.get("conference");

//         const chatsToAutoWatch = await getAutoWatchTextChats(conf, request.user.getSessionToken());
//         const chatsWatching = watched.get("watchedChats") || [];
//         const newChatsWatching =
//             chatsWatching.reduce(
//                 (acc, x) => acc.includes(x) ? acc : [...acc, x],
//                 chatsToAutoWatch.map(x => x.id) || []
//             );
//         watched.set("watchedChats", newChatsWatching);
//     }
// });

Parse.Cloud.job("migrate-watchedItems-isBanned-addToUserProfile", async (request) => {
    const { message: _message } = request;
    const message = (msg) => {
        console.log(msg);
        _message(msg);
    };

    message("Migrating existing user profiles - adding watched items and isBanned...");

    try {
        async function migrateProfile(profile) {
            if (!profile.get("watched")) {
                message(`Migrating ${profile.id}`);

                const user = profile.get("user");
                const conference = profile.get("conference");
                let newWatchedItems = new Parse.Object("WatchedItems", {
                    conference
                });
                let newWatchedItemsACL = new Parse.ACL();
                newWatchedItemsACL.setPublicReadAccess(false);
                newWatchedItemsACL.setPublicWriteAccess(false);
                newWatchedItemsACL.setReadAccess(user, true);
                newWatchedItemsACL.setWriteAccess(user, true);
                newWatchedItems.setACL(newWatchedItemsACL);

                message(`Migrating ${profile.id} - Point 1`);

                newWatchedItems = await newWatchedItems.save(null, { useMasterKey: true });

                message(`Migrating ${profile.id} - Point 2`);

                profile.set("watched", newWatchedItems);
                profile.set("isBanned", false);

                message(`Migrating ${profile.id} - Point 3`);

                await profile.save(null, { useMasterKey: true });

                message(`Migrating ${profile.id} - Point 4`);

                // And re-save to trigger the beforeSave event to setup auto watches
                await newWatchedItems.save(null, { useMasterKey: true });

                message(`Migrated ${profile.id}`);
            }
            else {
                message(`Ignoring ${profile.id}`);
            }
        }

        const existingUserProfiles = new Parse.Query("UserProfile");
        await existingUserProfiles.each(migrateProfile, {
            useMasterKey: true
        });

        message("Finished migration: adding watched items to existing user profiles.");
    }
    catch (e) {
        await logRequestError(request, 0, "migrate-watchedItems-isBanned-addToUserProfile", e);
        console.error("Error (error):" + e);
        console.log("Error (log):" + e);
        message("Error:" + e);
        throw e;
    }
});

Parse.Cloud.job("clean-watched-items", async (request) => {
    const { params, message: _message } = request;
    const message = (msg) => {
        console.log(msg);
        _message(msg);
    };

    let conference = null;

    try {
        message("Starting...");

        message("Validating parameters");

        let requestValidation = validateRequest({
            conference: "string"
        }, params);
        if (requestValidation.ok) {
            conference = await new Parse.Object("Conference", { id: params.conference }).fetch({ useMasterKey: true });
            assert(conference);

            const allTextChats
                = await new Parse.Query("TextChat")
                    .equalTo("conference", conference)
                    .map(x => x, { useMasterKey: true });

            const attendeeRoleName = generateRoleDBName(conference.id, "attendee");
            await new Parse.Query("WatchedItems")
                .equalTo("conference", conference)
                .map(async watched => {
                    const userId = Object.keys(watched.getACL().permissionsById).filter(x => !x.startsWith("role:"))[0];
                    const isAdminOrManager = isUserInRoles(userId, conference.id, ["admin", "manager"]);

                    const watchedChatIds = watched.get("watchedChats");
                    watched.set("watchedChats", watchedChatIds.filter(chatId => {
                        const theChat = allTextChats.find(y => chatId === y.id);
                        // The chat exists
                        if (!theChat) {
                            return false;
                        }
                        // And it is... * Public
                        return theChat.getACL().getRoleReadAccess(attendeeRoleName)
                            // * Or, a moderation channel and the user is a moderator
                            || (isAdminOrManager && (theChat.get("mode") === "moderation_hub" || theChat.get("mode") === "moderation"))
                            // * Or, a DM of which the user is one half.
                            || (theChat.get("isDM") && Object.keys(theChat.getACL().permissionsById).includes(userId));
                    }));
                    await watched.save(null, { useMasterKey: true });
                }, { useMasterKey: true });
            
            message("Cleaned up watched items");
        }
    }
    catch (e) {
        await logRequestError(request, 0, "clean-watched-items", e);
        console.error("ERROR: " + e.stack, e);
        message(e);
        throw e;
    }
});
