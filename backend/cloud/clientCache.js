/* global Parse */
// ^ for eslint

const { isUserInRoles } = require("./role");

async function updateConferenceLastProgramUpdateTime(conference) {
    conference = await conference.fetch({ useMasterKey: true });
    conference.set("lastProgramUpdateTime", new Date());
    await conference.save(null, { useMasterKey: true });
}

const programTableNames = [
    "AttachmentType",
    "ContentFeed",
    "Flair",
    "ProgramItem",
    "ProgramItemAttachment",
    "ProgramPerson",
    "ProgramRoom",
    "ProgramSession",
    "ProgramSessionEvent",
    "ProgramTrack",
    "Flair",
    "YouTubeFeed",
    "ZoomRoom",
];

for (let tableName of programTableNames) {
    Parse.Cloud.afterSave(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });

    Parse.Cloud.afterDelete(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });
}

const currentCaches = {};
let lastCleanTime = Date.now();
const cacheExpiryTime = 1000 * 60;

const programCaches = {};

function generateCacheIdentifier(conference, user) {
    return conference.id + ":" + user.id;
}

async function getCacheData(conference, user) {
    // Cache data is split into two groups
    // Program data: Which is the same for all users
    // Non-program data: Which may contain some content which only that user can access

    // We determine whether the program cache data is stale and if it is,
    // delete the cache data.
    const lastProgramUpdateTime = conference.get("lastProgramUpdateTime").getTime();
    let programCache = programCaches[conference.id];
    if (programCache) {
        if (lastProgramUpdateTime > programCache.time) {
            delete programCaches[conference.id];
            programCache = null;
        }
    }

    // If the program cache does not exist (or was deleted due to staleness)
    if (!programCache) {
        // Fetch all the relevant tables
        const [
            AttachmentType,
            ContentFeed,
            Flair,
            ProgramPerson,
            ProgramItem,
            ProgramItemAttachment,
            ProgramSession,
            ProgramSessionEvent,
            ProgramTrack,
            YouTubeFeed,
            ZoomRoom
        ] = await Promise.all([
            new Parse.Query("AttachmentType")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ContentFeed")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("Flair")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramPerson")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramItem")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramItemAttachment")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramSession")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramSessionEvent")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ProgramTrack")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("YouTubeFeed")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ZoomRoom")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
        ]);

        // Create the cache record
        programCache = {
            time: Date.now(),
            data: {
                Conference: conference,
    
                AttachmentType,
                ContentFeed,
                Flair,
                ProgramPerson,
                ProgramItem,
                ProgramItemAttachment,
                ProgramSession,
                ProgramSessionEvent,
                ProgramTrack,
                YouTubeFeed,
                ZoomRoom
            }
        };
        // Put it into the program cache
        programCaches[conference.id] = programCache;
    }

    // Fetch the user-sensitive tables
    const [
        ConferenceConfiguration,
        PrivilegedConferenceDetails,
        Sponsor,
        SponsorContent,
        TextChat,
        TextChatMessage,
        UserProfile,
        VideoRoom,
        WatchedItems
    ] = await Promise.all([
        new Parse.Query("ConferenceConfiguration")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("PrivilegedConferenceDetails")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("Sponsor")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("SponsorContent")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("TextChat")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("TextChatMessage")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("UserProfile")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("VideoRoom")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
        new Parse.Query("WatchedItems")
            .equalTo("conference", conference)
            .map(x => x, { sessionToken: user.getSessionToken() }),
    ]);

    // Generate the final cache result
    return {
        ...(programCache.data),

        ConferenceConfiguration,
        PrivilegedConferenceDetails,
        Sponsor,
        SponsorContent,
        TextChat,
        TextChatMessage,
        UserProfile,
        VideoRoom,
        WatchedItems,
    };
}

async function updateCache(conference, user) {
    const cacheId = generateCacheIdentifier(conference, user);
    // Fetch the fresh cache data
    const data = await getCacheData(conference, user);
    // Populate the cache
    currentCaches[cacheId] = {
        data,
        time: Date.now()
    };
    // Return only the data
    return data;
}

function cleanOldCaches() {
    const now = Date.now();
    // If the time passed since we last cleaned up is longer than the expiry time
    if (now - lastCleanTime > cacheExpiryTime) {
        lastCleanTime = now;

        // Go through each cache value
        const keys = Object.keys(currentCaches);
        for (const key of keys) {
            const record = currentCaches[key];
            // If it has expired...
            if (now - record.time > cacheExpiryTime) {
                // ...delete it from the cache
                delete currentCaches[key];
            }
        }
    }
}

async function fetchCache(conference, user) {
    // We first quickly clean out any stale caches
    cleanOldCaches();

    // Then we generate the ID for the cache value we want
    const cacheId = generateCacheIdentifier(conference, user);
    // If it exists in the cache...
    if (currentCaches[cacheId]) {
        // ...return the data
        return currentCaches[cacheId].data;
    }

    // Otherwise, update the cache and return the resulting data
    return updateCache(conference, user);
}

Parse.Cloud.define("fetch-cache", async (request) => {
    const { params, user } = request;
    const confId = params.conference;

    const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
    if (authorized) {
        const conference = await new Parse.Object("Conference", { id: confId }).fetch({ useMasterKey: true });

        // We're going to fetch the cache data using the selected conference and
        // current user's privileges
        return fetchCache(conference, user);
    }
    else {
        throw new Error("Permission denied");
    }
});
