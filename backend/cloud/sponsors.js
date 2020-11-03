/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");
const { getUserProfileById } = require("./user");

const createSponsorSchema = {
    name: "string",
    colour: "string",
    level: "number",
    description: "string?",
    representativeProfileIds: "[string]",
    conference: "string",
};

/**
 * @typedef {Object} SponsorSpec
 * @property {string} name
 * @property {string} colour
 * @property {number} level
 * @property {string?} description
 * @property {string} [representativeProfileIds]
 * @property {Pointer} conference
 */

/**
 * Creates a Sponsor.
 *
 * Note: you must perform authentication prior to calling this.
 *
 * @param {SponsorSpec} data
 * @param {Parse.User} user
 * @returns {Promise<Parse.Object>}
 */
async function createSponsor(data, user) {
    const newSponsor = new Parse.Object("Sponsor", data);
    const confId = newSponsor.get("conference").id;

    const videoRoomId = await Parse.Cloud.run(
        "videoRoom-create",
        {
            capacity: 10,
            ephemeral: false,
            isPrivate: false,
            name: `Sponsor: ${data.name}`,
            conference: confId,
        },
        { sessionToken: user.getSessionToken() }
    );

    newSponsor.set({ videoRoom: new Parse.Object("VideoRoom", { id: videoRoomId }) });

    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(adminRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    acl.setRoleReadAccess(managerRole, true);
    acl.setRoleWriteAccess(managerRole, false);
    acl.setRoleReadAccess(attendeeRole, true);
    acl.setRoleWriteAccess(attendeeRole, false);

    newSponsor.setACL(acl);

    await newSponsor.save(null, { useMasterKey: true });
    return newSponsor;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateSponsor(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createSponsorSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorised = !!user && (await isUserInRoles(user.id, confId, ["admin"]));

        if (authorised) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            await createSponsor(spec, user);
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("create-sponsor", handleCreateSponsor);

Parse.Cloud.afterSave("Sponsor", async request => {
    const contentItems = await new Parse.Query("SponsorContent")
        .equalTo("sponsor", request.object)
        .find({ useMasterKey: true });

    const confId = request.object.get("conference").id;

    const representativeProfileIds = request.object.get("representativeProfileIds");
    const representativeUserIds = await Promise.all(
        representativeProfileIds.map(async representativeProfileId => {
            const userProfile = await getUserProfileById(representativeProfileId, confId);
            return userProfile.get("user").id;
        })
    );

    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    await Promise.all(
        contentItems.map(contentItem => {
            const acl = new Parse.ACL();
            acl.setPublicReadAccess(false);
            acl.setPublicWriteAccess(false);
            acl.setRoleReadAccess(adminRole, true);
            acl.setRoleWriteAccess(adminRole, true);
            acl.setRoleReadAccess(managerRole, true);
            acl.setRoleWriteAccess(managerRole, false);
            acl.setRoleReadAccess(attendeeRole, true);
            acl.setRoleWriteAccess(attendeeRole, false);

            for (const representativeUserId of representativeUserIds) {
                if (representativeUserId) {
                    acl.setWriteAccess(representativeUserId, true);
                }
            }
            contentItem.setACL(acl);
            return contentItem.save(null, { useMasterKey: true });
        })
    );
});
