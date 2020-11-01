/* global Parse */
// ^ for eslint

const { isUserInRoles } = require("./role");

async function updateConferenceLastProgramUpdateTime(conference) {
    conference = await conference.fetch({ useMasterKey: true });
    conference.set("lastProgramUpdateTime", new Date());
    await conference.save(null, { useMasterKey: true });
}

const programTableNames = [
    "ProgramItem",
    "ProgramItemAttachment",
    "ProgramPerson",
    "ProgramRoom",
    "ProgramSession",
    "ProgramSessionEvent",
    "ProgramTrack",
    "Flair",
];

for (let tableName of programTableNames) {
    Parse.Cloud.afterSave(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });

    Parse.Cloud.afterDelete(tableName, async (request) => {
        await updateConferenceLastProgramUpdateTime(request.object.get("conference"));
    });
}

Parse.Cloud.define("fetch-cache", async (request) => {
    const { params, user } = request;
    const confId = params.conference;

    const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
    if (authorized) {
        const conference = new Parse.Object("Conference", { id: confId });

        const [
            AttachmentType,
            ConferenceConfiguration,
            ContentFeed,
            Flair,
            PrivilegedConferenceDetails,
            ProgramPerson,
            ProgramItem,
            ProgramItemAttachment,
            ProgramSession,
            ProgramSessionEvent,
            ProgramTrack,
            Sponsor,
            SponsorContent,
            TextChat,
            TextChatMessage,
            UserProfile,
            VideoRoom,
            WatchedItems,
            YouTubeFeed,
            ZoomRoom
        ] = await Promise.all([
            new Parse.Query("AttachmentType")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ConferenceConfiguration")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ContentFeed")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("Flair")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("PrivilegedConferenceDetails")
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
            new Parse.Query("YouTubeFeed")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
            new Parse.Query("ZoomRoom")
                .equalTo("conference", conference)
                .map(x => x, { sessionToken: user.getSessionToken() }),
        ]);
        return {
            Conference: conference,

            AttachmentType,
            ConferenceConfiguration,
            ContentFeed,
            Flair,
            PrivilegedConferenceDetails,
            ProgramPerson,
            ProgramItem,
            ProgramItemAttachment,
            ProgramSession,
            ProgramSessionEvent,
            ProgramTrack,
            Sponsor,
            SponsorContent,
            TextChat,
            TextChatMessage,
            UserProfile,
            VideoRoom,
            WatchedItems,
            YouTubeFeed,
            ZoomRoom
        };
    }
    else {
        throw new Error("Permission denied");
    }
});
