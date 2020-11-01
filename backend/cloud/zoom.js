/* global Parse */
// ^ for eslint

// TODO: Before delete: Prevent delete if still in use anywhere

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");
const { getConfig } = require('./config');
const crypto = require('crypto')

// **** Zoom Room **** //

/**
 * @typedef {Object} ZoomRoomSpec
 * @property {string} url
 * @property {Pointer} conference
 */

const createZoomRoomSchema = {
    url: "string",
    conference: "string"
};

/**
 * Creates a Zoom Room.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ZoomRoomSpec} data - The specification of the new Zoom Room.
 * @returns {Promise<Parse.Object>} - The new Zoom Room
 */
async function createZoomRoom(data) {
    const existing
        = await new Parse.Query("ZoomRoom")
            .equalTo("conference", data.conference)
            .equalTo("url", data.url)
            .first({ useMasterKey: true });
    if (existing) {
        return existing;
    }

    const newObject = new Parse.Object("ZoomRoom", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateZoomRoom(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createZoomRoomSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            const result = await createZoomRoom(spec);
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
Parse.Cloud.define("zoomRoom-create", handleCreateZoomRoom);


/**
 * @typedef {Object} GenerateZoomSignatureSpec
 * @property {string} meetingNumber
 * @property {string} role
 * @property {Pointer} conference
 */

const generateZoomSignatureSchema = {
    meetingNumber: "string",
    conference: "string"
};

/**
 * Generate a Zoom signature.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {GenerateZoomSignatureSpec} data
 * @returns {Promise<string>}
 */
async function generateZoomSignature(data) {
    const config = await getConfig(data.conference.id);

    if (!config.ZOOM_API_KEY) {
        throw new Error("No Zoom API key specified.");
    }

    if (!config.ZOOM_API_SECRET) {
        throw new Error("No Zoom API secret specified.");
    }

    // Prevent time sync issue between client signature generation and zoom
    const timestamp = new Date().getTime() - 30000
    const msg = Buffer.from(config.ZOOM_API_KEY + data.meetingNumber + timestamp + data.role).toString('base64')
    const hash = crypto.createHmac('sha256', config.ZOOM_API_SECRET).update(msg).digest('base64')
    const signature = Buffer.from(`${config.ZOOM_API_KEY}.${data.meetingNumber}.${timestamp}.${data.role}.${hash}`).toString('base64')

    return signature;
}


/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleGenerateZoomSignature(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(generateZoomSignatureSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager", "attendee"]);
        if (authorized) {
            const spec = {};
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.meetingNumber = params.meetingNumber;
            spec.role = "0";
            const signature = await generateZoomSignature(spec);
            const config = await getConfig(spec.conference.id);
            return {
                signature: signature,
                apiKey: config.ZOOM_API_KEY,
            };
        }
        else {
            throw new Error("Permission denied");
        }
    }
    else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("zoom-generate-signature", handleGenerateZoomSignature);

module.exports = {
    createZoomRoom
};
