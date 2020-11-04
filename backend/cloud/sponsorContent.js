/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");
const { getUserProfileById } = require("./user");

const createSponsorContentSchema = {
    markdownContents: "string?",
    buttonLink: "string?",
    buttonText: "string?",
    videoURL: "string?",
    sponsor: "string",
    conference: "string",
};

/**
 * @typedef {Object} SponsorContentSpec
 * @property {string?} markdownContents
 * @property {string?} buttonLink
 * @property {string?} buttonText
 * @property {string?} videoURL
 * @property {Pointer} sponsor
 * @property {Pointer} conference
 */

/**
 * Creates a SponsorContent item.
 *
 * Note: you must perform authentication prior to calling this.
 *
 * @param {SponsorContentSpec} data
 * @param {Parse.User} user
 * @returns {Promise<Parse.Object>}
 */
async function createSponsorContent(data, user) {
    const lastItem = await new Parse.Query("SponsorContent")
        .equalTo("conference", data.conference)
        .equalTo("sponsor", data.sponsor)
        .descending("ordering")
        .first({ useMasterKey: true });

    const newData = {};
    newData.markdownContents = data.markdownContents;
    if (data.buttonLink && data.buttonText) {
        newData.buttonContents = { link: data.buttonLink, text: data.buttonText };
    }
    newData.wide = false;
    newData.ordering = (lastItem?.get("ordering") ?? -1) + 1;
    newData.videoURL = data.videoURL;
    newData.sponsor = data.sponsor;
    newData.conference = data.conference;

    const newSponsorContent = new Parse.Object("SponsorContent", newData);

    const adminRole = await getRoleByName(data.conference.id, "admin");
    const managerRole = await getRoleByName(data.conference.id, "manager");
    const attendeeRole = await getRoleByName(data.conference.id, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(adminRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    acl.setRoleReadAccess(managerRole, true);
    acl.setRoleWriteAccess(managerRole, false);
    acl.setRoleReadAccess(attendeeRole, true);
    acl.setRoleWriteAccess(attendeeRole, false);

    const representativeUserIds = await getRepresentativeUserIds(data.sponsor, data.conference.id);

    for (const representativeUserId of representativeUserIds) {
        if (representativeUserId) {
            acl.setWriteAccess(representativeUserId, true);
        }
    }

    newSponsorContent.setACL(acl);

    await newSponsorContent.save(null, { useMasterKey: true });
    return newSponsorContent;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateSponsorContent(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createSponsorContentSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const sponsor = await new Parse.Object("Sponsor", { id: params.sponsor }).fetch({ useMasterKey: true });
        const representativeUserIds = await getRepresentativeUserIds(sponsor, confId);

        const authorised =
            !!user && ((await isUserInRoles(user.id, confId, ["admin"])) || representativeUserIds.includes(user.id));

        if (authorised) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.sponsor = sponsor;
            await createSponsorContent(spec, user);
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("create-sponsorContent", handleCreateSponsorContent);

/**
 * @param {Pointer} sponsor
 * @returns {Promise<string[]>}
 */
async function getRepresentativeUserIds(sponsor, confId) {
    const representativeProfileIds = await sponsor.get("representativeProfileIds");
    return await Promise.all(
        representativeProfileIds.map(async representativeProfileId => {
            const userProfile = await getUserProfileById(representativeProfileId, confId);
            return userProfile.get("user").id;
        })
    );
}
