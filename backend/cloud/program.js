/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");

// TODO: Before delete of track/item/session/event: Cleanup unused content feed(s)
// TODO: Before save: Give authors write access to their program items/events

// TODO: Before save of ProgramItemAttachment: If type AttachmentType `isCoverImage`, update associated program item's `posterImage` field
// TODO: Before delete of ProgramItemAttachment: If type AttachmentType `isCoverImage`, clear associated program item's `posterImage` field

// TODO: Authenticate actions against roles

// TODO: Create
//       * Item attachments
//       * Session
//       * Event

/**
 * @typedef {Parse.Object} Pointer
 */

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

        // TODO: Auth check: Allow authors to edit their own peron records
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

    // TODO: posterImage: Validate file type? 
    //       Or do we always set it automatically separately in before / after save?
    const requestValidation = validateRequest(createItemSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        // TODO: Auth check: Allow authors to edit their own item records
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

// **** Program Item Attachment **** //

/**
 * @typedef {Object} ProgramItemAttachmentSpec
 * @property {Parse.File | undefined} [file]
 * @property {string | undefined} [url]
 * @property {Pointer} attachmentType
 * @property {Pointer} conference
 * @property {Pointer} programItem
 */

const createItemAttachmentSchema = {
    url: "string?",
    attachmentType: "string",
    conference: "string",
    programItem: "string"
};

/**
 * Creates a program ItemAttachment.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramItemAttachmentSpec} data - The specification of the new ItemAttachment.
 * @returns {Promise<Parse.Object>} - The new ItemAttachment
 */
async function createProgramItemAttachment(data) {
    const newObject = new Parse.Object("ProgramItemAttachment", data);
    // TODO: ACLs: Allow authors to edit their own ItemAttachment records
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateItemAttachment(req) {
    const { params, user } = req;

    // TODO: Handle `file` (`Parse.File`)
    const requestValidation = validateRequest(createItemAttachmentSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        // TODO: Auth check: Allow authors to edit their own ItemAttachment records
        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.attachmentType = new Parse.Object("AttachmentType", { id: spec.attachmentType });
            spec.programItem = new Parse.Object("ProgramItem", { id: spec.programItem });
            // TODO: Handle `file` (`Parse.File`)
            const result = await createProgramItemAttachment(spec);
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
Parse.Cloud.define("itemAttachment-create", handleCreateItemAttachment);

// **** Program Session **** //

/**
 * @typedef {Object} ProgramSessionSpec
 * @property {Date} endTime
 * @property {Date} startTime
 * @property {string} title
 * @property {Pointer} conference
 * @property {Pointer} feed
 * @property {Pointer} track
 */

const createSessionSchema = {
    endTime: "date",
    startTime: "date",
    title: "string",
    conference: "string",
    feed: "string",
    track: "string"
};

/**
 * Creates a program Session.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramSessionSpec} data - The specification of the new Session.
 * @returns {Promise<Parse.Object>} - The new Session
 */
async function createProgramSession(data) {
    const newObject = new Parse.Object("ProgramSession", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateSession(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createSessionSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            spec.track = new Parse.Object("ProgramTrack", { id: spec.track });
            spec.startTime = new Date(spec.startTime);
            spec.endTime = new Date(spec.endTime);
            const result = await createProgramSession(spec);
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
Parse.Cloud.define("session-create", handleCreateSession);

// **** Program SessionEvent **** //

/**
 * @typedef {Object} ProgramSessionEventSpec
 * @property {string | undefined} [directLink]
 * @property {Date} endTime
 * @property {Date} startTime
 * @property {Pointer} conference
 * @property {Pointer} feed
 * @property {Pointer} item
 * @property {Pointer} session
 */

const createSessionEventSchema = {
    directLink: "string?",
    endTime: "date",
    startTime: "date",
    conference: "string",
    feed: "string?",
    item: "string",
    session: "string"
};

/**
 * Creates a program SessionEvent.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramSessionEventSpec} data - The specification of the new SessionEvent.
 * @returns {Promise<Parse.Object>} - The new SessionEvent
 */
async function createProgramSessionEvent(data) {
    const newObject = new Parse.Object("ProgramSessionEvent", data);
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreateSessionEvent(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createSessionEventSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        const authorized = !!user && await isUserInRoles(user.id, confId, ["admin", "manager"]);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.feed) {
                spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            }
            spec.item = new Parse.Object("ProgramItem", { id: spec.item });
            spec.session = new Parse.Object("ProgramSession", { id: spec.session });
            spec.startTime = new Date(spec.startTime);
            spec.endTime = new Date(spec.endTime);
            const result = await createProgramSessionEvent(spec);
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
Parse.Cloud.define("event-create", handleCreateSessionEvent);
