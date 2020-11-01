/* global Parse */
// ^ for eslint

// TODO: Before delete: Prevent delete if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

// **** Youtube Feed **** //

/**
 * @typedef {Object} YouTubeFeedSpec
 * @property {string} videoId
 * @property {Pointer} conference
 */

const createYouTubeFeedSchema = {
    videoId: "string",
    conference: "string"
};

/**
 * Creates a Youtube Feed.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {YouTubeFeedSpec} data - The specification of the new Youtube Feed.
 * @returns {Promise<Parse.Object>} - The new Youtube Feed
 */
async function createYouTubeFeed(data) {
    const existing
        = await new Parse.Query("YouTubeFeed")
            .equalTo("conference", data.conference)
            .equalTo("videoId", data.videoId)
            .first({ useMasterKey: true });
    if (existing) {
        return existing;
    }

    const newObject = new Parse.Object("YouTubeFeed", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateYouTubeFeed(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createYouTubeFeedSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            const result = await createYouTubeFeed(spec);
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
Parse.Cloud.define("youtubeFeed-create", handleCreateYouTubeFeed);

module.exports = {
    createYouTubeFeed
};
