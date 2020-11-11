/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");
const { isUserInRoles, configureDefaultProgramACLs } = require("./role");
const { getProfileOfUser } = require("./user");

// TODO: Before save: Give authors write access to their program items/events

// TODO: Before save of ProgramItemAttachment: If type AttachmentType `isCoverImage`, update associated program item's `posterImage` field
// TODO: Before delete of ProgramItemAttachment: If type AttachmentType `isCoverImage`, clear associated program item's `posterImage` field

async function isInUse_ContentFeed(conferenceId, id, excludeTrackId, excludeSessionId, excludeEventId, excludeItemId) {
    const feed = new Parse.Object("ContentFeed", { id });
    const conference = new Parse.Object("Conference", { id: conferenceId });
    const usedByTracks = await new Parse.Query("ProgramTrack")
        .equalTo("conference", conference)
        .equalTo("feed", feed)
        .map(x => x.id, { useMasterKey: true });
    const usedBySessions = await new Parse.Query("ProgramSession")
        .equalTo("conference", conference)
        .equalTo("feed", feed)
        .map(x => x.id, { useMasterKey: true });
    const usedByEvents = await new Parse.Query("ProgramSessionEvent")
        .equalTo("conference", conference)
        .equalTo("feed", feed)
        .map(x => x.id, { useMasterKey: true });
    const usedByItems = await new Parse.Query("ProgramSessionEvent")
        .equalTo("conference", conference)
        .equalTo("feed", feed)
        .map(x => x.id, { useMasterKey: true });

    const usedByTracksExcluding = excludeTrackId ? usedByTracks.filter(x => x !== excludeTrackId) : usedByTracks;
    const usedBySessionsExcluding = excludeSessionId
        ? usedBySessions.filter(x => x !== excludeSessionId)
        : usedBySessions;
    const usedByEventsExcluding = excludeEventId ? usedByEvents.filter(x => x !== excludeEventId) : usedByEvents;
    const usedByItemsExcluding = excludeItemId ? usedByItems.filter(x => x !== excludeItemId) : usedByItems;

    return (
        usedByTracksExcluding.length > 0 ||
        usedBySessionsExcluding.length > 0 ||
        usedByEventsExcluding.length > 0 ||
        usedByItemsExcluding.length > 0
    );
}

Parse.Cloud.beforeDelete("ProgramTrack", async request => {
    // Don't prevent deleting stuff just because of an error
    //   If things get deleted in the wrong order, the conference may even be missing
    try {
        const track = request.object;
        const conference = track.get("conference");

        await new Parse.Query("WatchedItems").equalTo("conference", conference).map(
            async watched => {
                const watchedIds = watched.get("watchedTracks");
                watched.set(
                    "watchedTracks",
                    watchedIds.filter(x => x !== track.id)
                );
                await watched.save(null, { useMasterKey: true });
            },
            { useMasterKey: true }
        );

        const feed = track.get("feed");
        if (feed) {
            const feedId = feed.id;
            const feedInUse = await isInUse_ContentFeed(
                conference.id,
                feedId,
                track.id,
                undefined,
                undefined,
                undefined
            );
            if (!feedInUse) {
                await new Parse.Object("ContentFeed", { id: feedId }).destroy({ useMasterKey: true });
            }
        }
    } catch (e) {
        console.error(`Error deleting program track! ${e}`);
    }
});

Parse.Cloud.beforeDelete("ProgramSession", async request => {
    // Don't prevent deleting stuff just because of an error
    //   If things get deleted in the wrong order, the conference may even be missing
    try {
        const session = request.object;
        const conference = session.get("conference");

        await new Parse.Query("WatchedItems").equalTo("conference", conference).map(
            async watched => {
                const watchedIds = watched.get("watchedSessions");
                watched.set(
                    "watchedSessions",
                    watchedIds.filter(x => x !== session.id)
                );
                await watched.save(null, { useMasterKey: true });
            },
            { useMasterKey: true }
        );

        const feed = session.get("feed");
        if (feed) {
            const feedId = feed.id;
            const feedInUse = await isInUse_ContentFeed(
                conference.id,
                feedId,
                undefined,
                session.id,
                undefined,
                undefined
            );
            if (!feedInUse) {
                await new Parse.Object("ContentFeed", { id: feedId }).destroy({ useMasterKey: true });
            }
        }
    } catch (e) {
        console.error(`Error deleting program session! ${e}`);
    }
});

Parse.Cloud.beforeDelete("ProgramSessionEvent", async request => {
    // Don't prevent deleting stuff just because of an error
    //   If things get deleted in the wrong order, the conference may even be missing
    try {
        const event = request.object;
        const conference = event.get("conference");

        await new Parse.Query("WatchedItems").equalTo("conference", conference).map(
            async watched => {
                const watchedIds = watched.get("watchedEvents");
                watched.set(
                    "watchedEvents",
                    watchedIds.filter(x => x !== event.id)
                );
                await watched.save(null, { useMasterKey: true });
            },
            { useMasterKey: true }
        );

        const feed = event.get("feed");
        if (feed) {
            const feedId = feed.id;
            const feedInUse = await isInUse_ContentFeed(
                conference.id,
                feedId,
                undefined,
                undefined,
                event.id,
                undefined
            );
            if (!feedInUse) {
                await new Parse.Object("ContentFeed", { id: feedId }).destroy({ useMasterKey: true });
            }
        }
    } catch (e) {
        console.error(`Error deleting program session event! ${e}`);
    }
});

Parse.Cloud.beforeDelete("ProgramItem", async request => {
    // Don't prevent deleting stuff just because of an error
    //   If things get deleted in the wrong order, the conference may even be missing
    try {
        const item = request.object;
        const conference = item.get("conference");

        const feed = item.get("feed");
        if (feed) {
            const feedId = feed.id;
            const feedInUse = await isInUse_ContentFeed(
                conference.id,
                feedId,
                undefined,
                undefined,
                undefined,
                item.id
            );
            if (!feedInUse) {
                await new Parse.Object("ContentFeed", { id: feedId }).destroy({ useMasterKey: true });
            }
        }

        await new Parse.Query("ProgramItemAttachment")
            .equalTo("conference", conference)
            .equalTo("programItem", item)
            .map(attachment => attachment.destroy({ useMasterKey: true }), { useMasterKey: true });
    } catch (e) {
        console.error(`Error deleting program item! ${e}`);
    }
});

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
    const existing = await new Parse.Query("AttachmentType")
        .equalTo("conference", data.conference)
        .equalTo("name", data.name)
        .first({ useMasterKey: true });
    if (existing) {
        if (!data.extra) {
            existing.unset("extra");
        }
        if (!data.fileTypes) {
            existing.unset("fileTypes");
        }
        await existing.save(
            {
                supportsFile: data.supportsFile,
                isCoverImage: data.isCoverImage,
                displayAsLink: data.displayAsLink,
                extra: data.extra,
                ordinal: data.ordinal,
                fileTypes: data.fileTypes,
            },
            { useMasterKey: true }
        );
        return existing;
    }

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

        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.fileTypes = spec.fileTypes || [];
            const result = await createAttachmentType(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
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
    const existing = await new Parse.Query("ProgramTrack")
        .equalTo("conference", data.conference)
        .equalTo("name", data.name)
        .first({ useMasterKey: true });
    if (existing) {
        if (!data.feed) {
            existing.unset("feed");
        }
        await existing.save(
            {
                shortName: data.shortName,
                colour: data.colour,
                feed: data.feed,
            },
            { useMasterKey: true }
        );
        return existing;
    }

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

        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.feed) {
                spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            }
            const result = await createProgramTrack(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("track-create", handleCreateTrack);

// **** Program Person **** //

/**
 * @typedef {Object} ProgramPersonSpec
 * @property {string} shortName
 * @property {string} name
 * @property {string | undefined} email
 * @property {Pointer} conference
 * @property {Pointer | undefined} [profile]
 */

const createPersonSchema = {
    name: "string",
    affiliation: "string?",
    conference: "string",
    profile: "string?",
    email: "string?",
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
    const existing = await new Parse.Query("ProgramPerson")
        .equalTo("conference", data.conference)
        .equalTo("name", data.name)
        .first({ useMasterKey: true });
    if (existing) {
        if (!data.affiliation) {
            existing.unset("affiliation");
        }
        if (!data.profile) {
            existing.unset("profile");
        }
        await existing.save(
            {
                affiliation: data.affiliation,
                profile: data.profile,
                email: data.email,
            },
            { useMasterKey: true }
        );
        return existing;
    }

    const newObject = new Parse.Object("ProgramPerson", data);
    // TODO: ACLs: Allow authors to edit their own peron records
    await configureDefaultProgramACLs(newObject);
    await newObject.save(null, { useMasterKey: true });
    return newObject;
}

Parse.Cloud.beforeSave("ProgramPerson", req => {
    // TODO: update permissions for program item attachments
});

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handleCreatePerson(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(createPersonSchema, params);
    if (requestValidation.ok) {
        const confId = params.conference;

        // TODO: Auth check: Allow authors to edit their own peron records
        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.profile) {
                spec.profile = new Parse.Object("UserProfile", { id: spec.profile });
            }
            const result = await createProgramPerson(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("person-create", handleCreatePerson);

/**
 * @typedef {Object} ProgramPersonSetProfileSpec
 * @property {string} [programPerson]
 * @property {Pointer} profile
 * @property {Pointer} conference
 */

const programPersonSetProfileSchema = {
    programPerson: "string?",
    profile: "string",
    conference: "string",
};

/**
 * Associates the program person with the specified user profile.
 * Unassociates any other program persons from the user profile.
 *
 * Note: You must perform authentication prior to calling this.
 *
 * @param {ProgramPersonSetProfileSpec} data
 * @returns {Promise<Parse.Object>}
 */
async function programPersonSetProfile(data) {
    try {
        // Unassociate any existing program persons from this profile
        let programPersons = await new Parse.Query("ProgramPerson")
            .equalTo("conference", data.conference)
            .equalTo("profile", data.profile)
            .find({ useMasterKey: true });

        for (let programPerson of programPersons) {
            programPerson.unset("profile");
            await programPerson.save({}, { useMasterKey: true });
        }

        // If a new program person is specified, associate them with the profile
        if (data.programPerson) {
            let programPerson = await new Parse.Query("ProgramPerson")
                .equalTo("conference", data.conference)
                .get(data.programPerson.id, { useMasterKey: true });

            await programPerson.save("profile", data.profile, { useMasterKey: true });
        }

        return true;
    } catch (e) {
        console.error("Error while associating profile with program person.", e);
    }
    return false;
}

/**
 * @param {Parse.Cloud.FunctionRequest} req
 */
async function handlePersonSetProfile(req) {
    const { params, user } = req;

    const requestValidation = validateRequest(programPersonSetProfileSchema, params);
    if (requestValidation.ok) {
        const reqUserProfile = await getProfileOfUser(user, params.conference);
        const targetUserProfile = await new Parse.Object("UserProfile", { id: params.profile });

        if (
            !!user &&
            (await isUserInRoles(user.id, params.conference, ["admin", "manager", "attendee"])) &&
            reqUserProfile.equals(targetUserProfile)
        ) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: spec.conference });
            spec.profile = new Parse.Object("UserProfile", { id: spec.profile });
            if (spec.programPerson) {
                spec.programPerson = new Parse.Object("ProgramPerson", { id: spec.programPerson });
            }

            const result = await programPersonSetProfile(spec);
            return result;
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("person-set-profile", handlePersonSetProfile);

// **** Program Item **** //

/**
 * @typedef {Object} ProgramItemSpec
 * @property {string} abstract
 * @property {boolean} exhibit
 * @property {Parse.File | undefined} posterImage
 * @property {string} title
 * @property {Array<string>} authors
 * @property {Pointer} conference
 * @property {Pointer | undefined} [feed]
 * @property {Pointer} track
 */

const createItemSchema = {
    abstract: "string",
    exhibit: "boolean",
    title: "string",
    authors: "[string]?",
    conference: "string",
    feed: "string?",
    track: "string",
    originatingID: "string?",
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
    let existing;
    if (data.originatingID) {
        existing = await new Parse.Query("ProgramItem")
            .equalTo("conference", data.conference)
            .get(data.originatingID, { useMasterKey: true });
        if (!existing) {
            existing = await new Parse.Query("ProgramItem")
                .equalTo("conference", data.conference)
                .equalTo("originatingID", data.originatingID)
                .first({ useMasterKey: true });
        }
    } else {
        existing = await new Parse.Query("ProgramItem")
            .equalTo("conference", data.conference)
            .equalTo("title", data.title)
            .first({ useMasterKey: true });
    }
    if (existing) {
        if (!data.feed) {
            existing.unset("feed");
        }
        await existing.save(
            {
                abstract: data.abstract,
                exhibit: data.exhibit,
                title: data.title,
                authors: data.authors ? data.authors : [],
                feed: data.feed,
                track: data.track,
                originatingID: data.originatingID,
            },
            { useMasterKey: true }
        );
        return existing;
    }

    const newObject = new Parse.Object("ProgramItem", data);
    // TODO: ACLs: Allow authors to edit their own item records
    await configureDefaultProgramACLs(newObject);
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
        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            if (spec.feed) {
                spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            }
            if (spec.track) {
                spec.track = new Parse.Object("ProgramTrack", { id: spec.track });
            }
            if (!spec.authors) {
                spec.authors = [];
            }
            const result = await createProgramItem(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("item-create", handleCreateItem);

// **** Program Item Attachment **** //

/**
 *
 * @param {Pointer} user
 * @param {Pointer} programItem
 * @returns {Promise<boolean>}
 */
async function isUserAnAuthorOf(user, programItem, confId) {
    const profile = await getProfileOfUser(user, confId);
    const item = await programItem.fetch({ useMasterKey: true });
    const authors = item.get("authors");
    const matchingProgramPeople = await new Parse.Query("ProgramPerson")
        .equalTo("profile", profile)
        .containedIn("objectId", authors)
        .count({ useMasterKey: true });
    return matchingProgramPeople > 0;
}

/**
 * @param {Pointer} programItemAttachment
 */
async function updateProgramItemAttachmentACLs(programItemAttachment) {
    const programItemPointer = await programItemAttachment.get("programItem");
    if (programItemPointer) {
        const programItem = await programItemPointer.fetch({ useMasterKey: true });
        const authors = programItem.get("authors");
        const matchingProgramPeople = await new Parse.Query("ProgramPerson")
            .containedIn("objectId", authors)
            .find({ useMasterKey: true });

        const profiles = await Promise.all(
            matchingProgramPeople.map(async person => {
                const profile = person.get("profile");
                return profile ? await profile.fetch({ useMasterKey: true }) : undefined;
            })
        );
        const users = await Promise.all(
            profiles.map(async profile => {
                if (profile) {
                    const user = profile.get("user");
                    return (await user) ? await user.fetch({ useMasterKey: true }) : undefined;
                } else {
                    return undefined;
                }
            })
        );

        const acl = programItemAttachment.getACL();
        for (let user of users.filter(u => u !== undefined)) {
            acl.setWriteAccess(user.id, true);
        }
        programItemAttachment.setACL(acl);
    }
}

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
    programItem: "string",
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
        const programItem = new Parse.Object("ProgramItem", { id: params.programItem });
        const userIsAuthorOfProgramItem = await isUserAnAuthorOf(user, programItem, confId);

        // TODO: Auth check: Allow authors to edit their own ItemAttachment records
        const authorized = !!user && ((await isUserInRoles(user.id, confId, ["admin"])) || userIsAuthorOfProgramItem);
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.attachmentType = new Parse.Object("AttachmentType", { id: spec.attachmentType });
            spec.programItem = programItem;
            // TODO: Handle `file` (`Parse.File`)
            const result = await createProgramItemAttachment(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("itemAttachment-create", handleCreateItemAttachment);

Parse.Cloud.beforeSave("ProgramItemAttachment", async req => {
    await updateProgramItemAttachmentACLs(req.object);
});

// **** Program Session **** //

/**
 * @typedef {Object} ProgramSessionSpec
 * @property {string} title
 * @property {Pointer} conference
 * @property {Pointer} feed
 * @property {Pointer} track
 */

const createSessionSchema = {
    title: "string",
    conference: "string",
    feed: "string",
    track: "string",
    chair: "string?",
    originatingID: "string?",
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
    let existing;
    if (data.originatingID) {
        existing = await new Parse.Query("ProgramSession")
            .equalTo("conference", data.conference)
            .get(data.originatingID, { useMasterKey: true });
        if (!existing) {
            existing = await new Parse.Query("ProgramSession")
                .equalTo("conference", data.conference)
                .equalTo("originatingID", data.originatingID)
                .first({ useMasterKey: true });
        }
    } else {
        existing = await new Parse.Query("ProgramSession")
            .equalTo("conference", data.conference)
            .equalTo("title", data.title)
            .first({ useMasterKey: true });
    }
    if (existing) {
        if (!data.feed) {
            existing.unset("feed");
        }
        if (!data.chair) {
            existing.unset("chair");
        }
        await existing.save(
            {
                title: data.title,
                feed: data.feed,
                track: data.track,
                chair: data.chair,
                originatingID: data.originatingID,
            },
            { useMasterKey: true }
        );
        return existing;
    }

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

        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
        if (authorized) {
            const spec = params;
            spec.conference = new Parse.Object("Conference", { id: confId });
            spec.feed = new Parse.Object("ContentFeed", { id: spec.feed });
            spec.track = new Parse.Object("ProgramTrack", { id: spec.track });
            const result = await createProgramSession(spec);
            return result.id;
        } else {
            throw new Error("Permission denied");
        }
    } else {
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
    session: "string",
    chair: "string?",
    originatingID: "string?",
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
    let existing;
    if (data.originatingID) {
        existing = await new Parse.Query("ProgramSessionEvent")
            .equalTo("conference", data.conference)
            .get(data.originatingID, { useMasterKey: true });
        if (!existing) {
            existing = await new Parse.Query("ProgramSessionEvent")
                .equalTo("conference", data.conference)
                .equalTo("originatingID", data.originatingID)
                .first({ useMasterKey: true });
        }
    }
    if (existing) {
        if (!data.feed) {
            existing.unset("feed");
        }
        if (!data.chair) {
            existing.unset("chair");
        }
        if (!data.directLink) {
            existing.unset("directLink");
        }
        await existing.save(
            {
                directLink: data.directLink,
                endTime: data.endTime,
                startTime: data.startTime,
                feed: data.feed,
                item: data.item,
                session: data.session,
                chair: data.chair,
            },
            { useMasterKey: true }
        );
        return existing;
    }

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

        const authorized = !!user && (await isUserInRoles(user.id, confId, ["admin"]));
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
        } else {
            throw new Error("Permission denied");
        }
    } else {
        throw new Error(requestValidation.error);
    }
}
Parse.Cloud.define("event-create", handleCreateSessionEvent);

module.exports = {
    createAttachmentType,
    createProgramItem,
    createProgramItemAttachment,
    createProgramPerson,
    createProgramSession,
    createProgramSessionEvent,
    createProgramTrack,
};
