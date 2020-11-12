/* global Parse */
// ^ for eslint

// TODO: Before delete: Prevent deletion if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

async function isInUse_TextChat(conferenceId, id, excludeFeedId) {
    const usedByFeeds =
        await new Parse.Query("ContentFeed")
            .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
            .equalTo("textChat", new Parse.Object("TextChat", { id }))
            .map(x => x.id, { useMasterKey: true });
    const usedByFeedsExcluding = usedByFeeds.filter(x => x !== excludeFeedId);
    return usedByFeedsExcluding.length > 0;
}

async function isInUse_VideoRoom(conferenceId, id, excludeFeedId) {
    const usedByFeeds =
        await new Parse.Query("ContentFeed")
            .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
            .equalTo("videoRoom", new Parse.Object("VideoRoom", { id }))
            .map(x => x.id, { useMasterKey: true });
    const usedBySponsors =
        await new Parse.Query("Sponsor")
            .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
            .equalTo("videoRoom", new Parse.Object("VideoRoom", { id }))
            .map(x => x.id, { useMasterKey: true });
    const usedByFeedsExcluding = usedByFeeds.filter(x => x !== excludeFeedId);
    return usedByFeedsExcluding.length > 0 || usedBySponsors.length > 0;
}

async function isInUse_ZoomRoom(conferenceId, id, excludeFeedId) {
    const usedByFeeds =
        await new Parse.Query("ContentFeed")
            .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
            .equalTo("zoomRoom", new Parse.Object("ZoomRoom", { id }))
            .map(x => x.id, { useMasterKey: true });
    const usedByFeedsExcluding = usedByFeeds.filter(x => x !== excludeFeedId);
    return usedByFeedsExcluding.length > 0;
}

async function isInUse_YouTubeFeed(conferenceId, id, excludeFeedId) {
    const usedByFeeds =
        await new Parse.Query("ContentFeed")
            .equalTo("conference", new Parse.Object("Conference", { id: conferenceId }))
            .equalTo("youtube", new Parse.Object("YouTubeFeed", { id }))
            .map(x => x.id, { useMasterKey: true });
    const usedByFeedsExcluding = usedByFeeds.filter(x => x !== excludeFeedId);
    return usedByFeedsExcluding.length > 0;
}

Parse.Cloud.beforeDelete("ContentFeed", async (request) => {
    const feed = request.object;
    const feedId = feed.id;
    const conferenceId = feed.get("conference").id;

    const textChat = feed.get("textChat");
    if (textChat) {
        const textChatId = textChat.id;
        const textChatInUse = await isInUse_TextChat(conferenceId, textChatId, feedId);
        if (!textChatInUse) {
            await new Parse.Object("TextChat", { id: textChatId }).destroy({ useMasterKey: true });
        }
    }

    const videoRoom = feed.get("videoRoom");
    if (videoRoom) {
        const videoRoomId = videoRoom.id;
        const videoRoomInUse = await isInUse_VideoRoom(conferenceId, videoRoomId, feedId);
        if (!videoRoomInUse) {
            await new Parse.Object("VideoRoom", { id: videoRoomId }).destroy({ useMasterKey: true });
        }
    }

    const zoomRoom = feed.get("zoomRoom");
    if (zoomRoom) {
        const zoomRoomId = zoomRoom.id;
        const zoomRoomInUse = await isInUse_ZoomRoom(conferenceId, zoomRoomId, feedId);
        if (!zoomRoomInUse) {
            await new Parse.Object("ZoomRoom", { id: zoomRoomId }).destroy({ useMasterKey: true });
        }
    }

    const youtubeFeed = feed.get("youtube");
    if (youtubeFeed) {
        const youtubeFeedId = youtubeFeed.id;
        const youtubeFeedInUse = await isInUse_YouTubeFeed(conferenceId, youtubeFeedId, feedId);
        if (!youtubeFeedInUse) {
            await new Parse.Object("YouTubeFeed", { id: youtubeFeedId }).destroy({ useMasterKey: true });
        }
    }
});

// **** Content Feed **** //

/**
 * @typedef {Object} ContentFeedSpec
 * @property {string} name
 * @property {Pointer} conference
 * @property {Pointer | undefined} [textChat]
 * @property {Pointer | undefined} [videoRoom]
 * @property {Pointer | undefined} [youtube]
 * @property {Pointer | undefined} [zoomRoom]
 */

const createContentFeedSchema = {
    name: "string",
    conference: "string",
    textChat: "string?",
    videoRoom: "string?",
    youtube: "string?",
    zoomRoom: "string?",
    originatingID: "string?"
};

/**
 * Creates a Content Feed.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ContentFeedSpec} data - The specification of the new Content Feed.
 * @returns {Promise<Parse.Object>} - The new Content Feed
 */
async function createContentFeed(data) {
    let existing;
    if (data.originatingID) {
        existing
            = await new Parse.Query("ContentFeed")
                .equalTo("conference", data.conference)
                .equalTo("originatingID", data.originatingID)
                .first({ useMasterKey: true });
    }
    else {
        existing
            = await new Parse.Query("ContentFeed")
                .equalTo("conference", data.conference)
                .equalTo("name", data.name)
                .first({ useMasterKey: true });
    }

    if (existing) {
        if (!data.youtube) {
            existing.unset("youtube");
        }
        if (!data.zoomRoom) {
            existing.unset("zoomRoom");
        }
        if (!data.videoRoom) {
            existing.unset("videoRoom");
        }
        if (!data.textChat) {
            existing.unset("textChat");
        }
        await existing.save({
            name: data.name,
            youtube: data.youtube,
            zoomRoom: data.zoomRoom,
            videoRoom: data.videoRoom,
            textChat: data.textChat,
            originatingID: data.originatingID
        }, { useMasterKey: true });
        return existing;
    }

    const newObject = new Parse.Object("ContentFeed", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateContentFeed(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createContentFeedSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.textChat) {
                spec.textChat = new Parse.Object("TextChat", { id: spec.textChat });
            }
            if (spec.videoRoom) {
                spec.videoRoom = new Parse.Object("VideoRoom", { id: spec.videoRoom });
            }
            if (spec.youtube) {
                spec.youtube = new Parse.Object("YouTubeFeed", { id: spec.youtube });
            }
            if (spec.zoomRoom) {
                spec.zoomRoom = new Parse.Object("ZoomRoom", { id: spec.zoomRoom });
            }
            const result = await createContentFeed(spec);
            return result.id;
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("contentFeed-create", handleCreateContentFeed);

module.exports = {
    createContentFeed
};
