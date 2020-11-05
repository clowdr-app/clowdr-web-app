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

const editSponsorSchema = {
    sponsor: "string",
    colour: "string",
    description: "string?",
    conference: "string",
};

/**
 * @typedef {Object} EditSponsorSpec
 * @property {Pointer} sponsor
 * @property {string} colour
 * @property {string?} description
 * @property {Parse.File?} logo
 * @property {Pointer} conference
 */

/**
 * Edits a Sponsor.
 *
 * Note: you must perform authentication prior to calling this.
 *
 * @param {EditSponsorSpec} data
 * @param {Parse.User} user
 */
async function editSponsor(data) {
    data.sponsor.set("colour", data.colour);
    if (data.description) {
        data.sponsor.set("description", data.description);
    } else {
        data.sponsor.unset("description");
    }

    const existingLogo = await data.sponsor.get("logo");

    if (existingLogo && (!data.logo || data.logo._name !== existingLogo._name)) {
        await existingLogo.destroy();
    }

    if (data.logo && (!existingLogo || data.logo._name !== existingLogo._name)) {
        data.sponsor.set("logo", data.logo);
    } else if (existingLogo && (!data.logo || data.logo._name !== existingLogo._name)) {
        data.sponsor.unset("logo");
    }

    await data.sponsor.save(null, { useMasterKey: true });
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleEditSponsor(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(editSponsorSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;
        const sponsor = await new Parse.Object("Sponsor", { id: params.sponsor }).fetch({ useMasterKey: true });
        const representativeUserIds = await getRepresentativeUserIds(sponsor, confId);

        const authorised =
            !!user && ((await isUserInRoles(user.id, confId, ["admin"])) || representativeUserIds.includes(user.id));

        if (authorised) {
            const spec = {
                sponsor,
                colour: params.colour,
                description: params.description,
                logo: params.logo,
            };
            spec.conference = new Parse.Object("Conference", { id: confId });
            await editSponsor(spec, user);
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("edit-sponsor", handleEditSponsor);

/**
 * Update SponsorContent ACLs whenever Sponsor changes.
 */
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

module.exports = {
    getRepresentativeUserIds: getRepresentativeUserIds,
};
