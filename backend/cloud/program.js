/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, getRoleByName } = require("./role");

// TODO: Before delete of track/item/session/event: Cleanup unused content feed(s)
// TODO: Before save: Give authors write access to their program items/events

// TODO: Before save of ProgramItemAttachment: If type AttachmentType `isCoverImage`, update associated program item's `posterImage` field
// TODO: Before delete of ProgramItemAttachment: If type AttachmentType `isCoverImage`, clear associated program item's `posterImage` field

// TODO: Authenticate actions against roles

// TODO: Create
//       * Content feed
//       * Item attachments
//       * Session
//       * Event

/**
 * @typedef {Parse.Object} Pointer
 */

async function configureDefaultProgramACLs(object) {
    const confId = object.get("conference").id;
    const adminRole = await getRoleByName(confId, "admin");
    const managerRole = await getRoleByName(confId, "manager");
    const attendeeRole = await getRoleByName(confId, "attendee");

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(attendeeRole, true);
    acl.setRoleWriteAccess(managerRole, true);
    acl.setRoleWriteAccess(adminRole, true);
    object.setACL(acl);
}

// TODO: configureDefaultProgramACLs_AllowAuthors

// **** Attachment Type **** //

/**
 * @typedef {Object} AttachmentTypeSpec
 * @property {boolean} supportsFile
 * @property {string} name
 * @property {boolean} isCoverImage
 * @property {boolean} displayAsLink
 * @property {string | undefined} [extra]
 * @property {number} ordinal
 * @property {Pointer} conference
 * @property {Array<string> | undefined} [fileTypes]
 */

const createAttachmentTypeSchema = {
    supportsFile: "boolean",
    name: "string",
    isCoverImage: "boolean",
    displayAsLink: "boolean",
    extra: "string?",
    ordinal: "number",
    conference: "string",
    fileTypes: "[string]?",
};

/**
 * Creates an attachment type.
 * 
 * Note: You must perform authentication prior to calling this.
 * 
 * @param {AttachmentTypeSpec} data - The specification of the new attachment type.
 * @returns {Promise<Parse.Object>} - The new attachment type
 */
async function createAttachmentType(data) {
    const newObject = new Parse.Object("AttachmentType", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}
/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateAttachmentType(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createAttachmentTypeSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.fileTypes = spec.fileTypes || [];
            const result = await createAttachmentType(spec);
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
Parse.Cloud.define("attachmentType-create", handleCreateAttachmentType);

// **** Program Track **** //

/**
 * @typedef {Object} ProgramTrackSpec
 * @property {string} shortName
 * @property {string} name
 * @property {string} colour
 * @property {Pointer} conference
 * @property {Pointer | undefined} [feed]
 */

const createTrackSchema = {
    shortName: "string",
    name: "string",
    colour: "string",
    conference: "string",
    feed: "string?",
};

/**
 * Creates a program track.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramTrackSpec} data - The specification of the new track.
 * @returns {Promise<Parse.Object>} - The new track
 */
async function createProgramTrack(data) {
    const newObject = new Parse.Object("ProgramTrack", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateTrack(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createTrackSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.feed) {
                spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            }
            const result = await createProgramTrack(spec);
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
Parse.Cloud.define("track-create", handleCreateTrack);

// **** Program Person **** //

/**
 * @typedef {Object} ProgramPersonSpec
 * @property {string} shortName
 * @property {string} name
 * @property {Pointer} conference
 * @property {Pointer | undefined} [profile]
 */

const createPersonSchema = {
    name: "string",
    conference: "string",
    profile: "string?",
};

/**
 * Creates a program person.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramPersonSpec} data - The specification of the new person.
 * @returns {Promise<Parse.Object>} - The new person
 */
async function createProgramPerson(data) {
    const newObject = new Parse.Object("ProgramPerson", data);
    // TODO: ACLs: Allow authors to edit their own peron records
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreatePerson(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createPersonSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.profile) {
                spec.profile = new Parse.Object("UserProfile", { id: spec.profile });
            }
            const result = await createProgramPerson(spec);
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
Parse.Cloud.define("person-create", handleCreatePerson);

// **** Program Item **** //

/**
 * @typedef {Object} ProgramItemSpec
 * @property {string} abstract
 * @property {boolean} exhibit
 * @property {Parse.File | undefined} posterImage
 * @property {string} title
 * @property {Array<Pointer>} authors
 * @property {Pointer} conference
 * @property {Pointer | undefined} [feed]
 * @property {Pointer} track
 */

const createItemSchema = {
    "abstract": "string",
    "exhibit": "boolean",
    "title": "string",
    "authors": "[string]",
    "conference": "string",
    "feed": "string?",
    "track": "string",
};

/**
 * Creates a program item.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramItemSpec} data - The specification of the new item.
 * @returns {Promise<Parse.Object>} - The new item
 */
async function createProgramItem(data) {
    const authorIds = data.authors;
    delete data.authors;

    const newObject = new Parse.Object("ProgramItem", data);
    // TODO: ACLs: Allow authors to edit their own item records
    await configureDefaultProgramACLs(newObject);
    const authorsRel = newObject.relation("authors");
    authorIds.forEach(id => {
        authorsRel.add(new Parse.Object("ProgramPerson", { id }));
    });
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateItem(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createItemSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.feed) {
                spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            }
            if (spec.track) {
                spec.track = new Parse.Object("ProgramTrack", { id: spec.track });
            }
            const result = await createProgramItem(spec);
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
Parse.Cloud.define("item-create", handleCreateItem);
