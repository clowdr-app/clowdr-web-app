/* global Parse */
// ^ for eslint

const { getAutoWatchTextChats } = require("./textChat");
const assert = require("assert");

Parse.Cloud.beforeSave("WatchedItems", async (request) => {
    // TODO: If is an author, auto-watch them to the text chats for their papers
    // TODO: Do we want authors to be auto-watching their items & content feeds (video rooms/text chats)

    // We can't run this code on a new WatchedItems as a profile won't have been
    // assigned to it yet.
    if (!request.object.isNew() && request.user) {
        const watched = request.object;
        const conf = watched.get("conference");

        const chatsToAutoWatch = await getAutoWatchTextChats(conf, request.user.getSessionToken());
        const chatsWatching = watched.get("watchedChats") || [];
        const newChatsWatching =
            chatsWatching.reduce(
                (acc, x) => acc.includes(x) ? acc : [...acc, x],
                chatsToAutoWatch.map(x => x.id) || []
            );
        watched.set("watchedChats", newChatsWatching);
    }
});

Parse.Cloud.job("migrate-watchedItems-addToUserProfile", async (request) => {
    const { params, headers, log, message } = request;

    message("Migrating existing user profiles - adding watched items...");

    async function migrateProfile(profile) {
        if (!profile.get("watched")) {
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
            newWatchedItems = await newWatchedItems.save(null, { useMasterKey: true });
            profile.set("watched", newWatchedItems);
            await profile.save(null, { useMasterKey: true });
            // And re-save to trigger the beforeSave event to setup auto watches
            await newWatchedItems.save(null, { useMasterKey: true });
        }
    }

    const existingUserProfiles = new Parse.Query("UserProfile");
    await existingUserProfiles.eachBatch((objs) => Promise.all(objs.map(migrateProfile)), {
        batchSize: 10000,
        useMasterKey: true
    });

    message("Finished migration: adding watched items to existing user profiles.");
});
