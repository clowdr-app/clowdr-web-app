/* global Parse */
// ^ for eslint

const { getTwilioChatService } = require("./twilio");
const { logError } = require("./errors");

async function logAnalyticsData(conferenceId, measurementKey, dataKey, dataValue) {
    const newObj = new Parse.Object("Analytics", {
        conference: conferenceId ? new Parse.Object("Conference", { id: conferenceId }) : undefined,
        measurementKey,
        dataKey,
        dataValue: { dataValue }
    });
    const newACL = new Parse.ACL();
    newObj.setACL(newACL);
    await newObj.save(null, { useMasterKey: true });
}

async function forAllConferences(caller, f) {
    try {
        await new Parse.Query("Conference").map(async conference => {
            try {
                await f(conference);
            }
            catch (e) {
                await logError(conference.id, undefined, 0, `${caller}:single-conference`, e);
            }
        }, { useMasterKey: true });
    }
    catch (e) {
        console.error(`Error in ${caller}: ${e.toString()}`);
        await logError(undefined, undefined, 0, caller, e);
    }
}

Parse.Cloud.job("analytics-log-errors-count", async (request) => {
    {
        const count = await new Parse.Query("Errors").doesNotExist("conference").count({ useMasterKey: true });
        await logAnalyticsData(undefined, "errors-count", "-", count);
    }

    await forAllConferences("analytics-log-errors-count", async (conference) => {
        const count = await new Parse.Query("Errors").equalTo("conference", conference).count({ useMasterKey: true });
        await logAnalyticsData(conference.id, "errors-count", "-", count);
    });
});

Parse.Cloud.job("analytics-log-chats-count", async (request) => {
    await forAllConferences("analytics-log-chats-count", async (conference) => {
        const count = await new Parse.Query("TextChat").equalTo("conference", conference).count({ useMasterKey: true });
        await logAnalyticsData(conference.id, "chats-count", "-", count);
    });
});

Parse.Cloud.job("analytics-log-rooms-count", async (request) => {
    await forAllConferences("analytics-log-rooms-count", async (conference) => {
        const count = await new Parse.Query("VideoRoom").equalTo("conference", conference).count({ useMasterKey: true });
        await logAnalyticsData(conference.id, "rooms-count", "-", count);
    });
});

Parse.Cloud.job("analytics-log-active-room-members", async (request) => {
    await forAllConferences("analytics-log-chats-count", async (conference) => {
        await new Parse.Query("VideoRoom").equalTo("conference", conference).map(async (room) => {
            await logAnalyticsData(conference.id, "active-room-members", room.id, room.get("participants").length);
        }, { useMasterKey: true });
    });
});

Parse.Cloud.job("analytics-log-active-users", async (request) => {
    await forAllConferences("analytics-log-active-users", async (conference) => {
        const service = await getTwilioChatService(conference.id);
        const profileIds = await new Parse.Query("UserProfile").equalTo("conference", conference).map(x => x.id, { useMasterKey: true });
        let onlineCount = 0;
        for (const profileId of profileIds) {
            const isOnline = (await service.users(profileId).fetch()).isOnline;
            if (isOnline) {
                onlineCount++;
            }
        }
        await logAnalyticsData(conference.id, "active-users", "-", onlineCount);
    });
});

Parse.Cloud.job("analytics-log-message-counts", async (request) => {
    await forAllConferences("analytics-log-message-counts", async (conference) => {
        const service = await getTwilioChatService(conference.id);
        const chats = await new Parse.Query("TextChat").equalTo("conference", conference).map(x => ({
            id: x.id,
            sid: x.get("twilioID")
        }), { useMasterKey: true });
        for (const chat of chats) {
            const channel = await service.channels(chat.sid).fetch();
            const messageCount = channel.messages.length;
            await logAnalyticsData(conference.id, "messages-count", chat.id, messageCount);
        }
    });
});
