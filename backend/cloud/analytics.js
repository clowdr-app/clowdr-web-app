/* global Parse */
// ^ for eslint

const { getTwilioChatService } = require("./twilio");
const { logError } = require("./errors");
const { callWithRetry } = require("./utils");

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
    await forAllConferences("analytics-log-active-room-members", async (conference) => {
        await new Parse.Query("VideoRoom").equalTo("conference", conference).map(async (room) => {
            await logAnalyticsData(conference.id, "active-room-members", room.id, room.get("participants").length);
        }, { useMasterKey: true });
    });
});

Parse.Cloud.job("analytics-log-active-users", async (request) => {
    await forAllConferences("analytics-log-active-users", async (conference) => {
        const service = await getTwilioChatService(conference.id);
        const profileIds = await new Parse.Query("UserProfile").equalTo("conference", conference).map(x => ({
            id: x.id,
            banned: x.get("isBanned")
        }), { useMasterKey: true });
        let onlineCount = 0;
        for (const profile of profileIds) {
            if (!profile.banned) {
                const isOnline = (await service.users(profile.id).fetch()).isOnline;
                if (isOnline) {
                    onlineCount++;
                }
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
            const channel = await callWithRetry(() => service.channels(chat.sid).fetch());
            const messageCount = channel.messagesCount;
            await logAnalyticsData(conference.id, "messages-count", chat.id, messageCount);
        }
    });
});

async function fetchAnalyticsRecords(conferenceId, measurementKey) {
    return new Parse.Query("Analytics")
        .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
        .equalTo("measurementKey", measurementKey)
        .map(x => ({
            time: x.get("createdAt"),
            key: x.get("dataKey"),
            value: x.get("dataValue").dataValue
        }), { useMasterKey: true });
}

Parse.Cloud.define("analytics-summaries", async (request) => {
    const conferenceId = request.params.conference;
    if (conferenceId) {
        const results = {};

        results.errorsCounts = await fetchAnalyticsRecords(conferenceId, "errors-count");
        results.chatsCounts = await fetchAnalyticsRecords(conferenceId, "chats-count");
        results.roomsCounts = await fetchAnalyticsRecords(conferenceId, "rooms-count");
        results.usersCounts = await fetchAnalyticsRecords(conferenceId, "active-users");

        const timeGroupPeriod = 1000 * 60 * 5;

        const roomMemberCounts = await fetchAnalyticsRecords(conferenceId, "active-room-members");
        const groupedRoomMemberCounts = {};
        for (const count of roomMemberCounts) {
            const t = Math.round(count.time.getTime() / timeGroupPeriod) * timeGroupPeriod;
            if (!groupedRoomMemberCounts[t]) {
                groupedRoomMemberCounts[t] = count.value;
            }
            else {
                groupedRoomMemberCounts[t] = groupedRoomMemberCounts[t] + count.value;
            }
        }
        results.activeRoomMemberCounts = groupedRoomMemberCounts;

        const MessagesCounts = await fetchAnalyticsRecords(conferenceId, "messages-count");
        const groupedMessagesCounts = {};
        for (const count of MessagesCounts) {
            const t = Math.round(count.time.getTime() / timeGroupPeriod) * timeGroupPeriod;
            if (!groupedMessagesCounts[t]) {
                groupedMessagesCounts[t] = count.value;
            }
            else {
                groupedMessagesCounts[t] = groupedMessagesCounts[t] + count.value;
            }
        }
        results.messagesCounts = groupedMessagesCounts;

        return results;
    }
    else {
        return undefined;
    }
});
