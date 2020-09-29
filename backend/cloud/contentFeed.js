/* global Parse */
// ^ for eslint

// TODO: Before delete: Delete Twilio text channel and/or video room
// TODO: Before delete: Clean up any content feeds
// TODO: Before delete: Prevent deletion if still in use anywhere

// TODO: Create TextChat/VideoRoom
// TODO: And then Create content feed

/* global Parse */
// ^ for eslint

// TODO: Before delete: Prevent delete if still in use anywhere

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
    zoomRoom: "string?"
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
