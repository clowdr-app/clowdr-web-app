/* global Parse */
// ^ for eslint

// TODO: Before delete: Delete Twilio text channel and/or video room
// TODO: Before delete: Clean up any content feeds
// TODO: Before delete: Prevent deletion if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

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
