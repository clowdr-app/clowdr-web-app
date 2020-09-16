// Copied from WholeSchema.ts
const RelationsToTableNames = {
    AttachmentType: {
        conference: "Conference"
    },
    Conference: {
        admin: "_User",
        autoSubscribeToTextChats: "TextChat"
    },
    ConferenceConfiguration: {
        conference: "Conference"
    },
    Flair: {
        conference: "Conference"
    },
    PrivilegedConferenceDetails: {
        conference: "Conference"
    },
    ProgramItem: {
        conference: "Conference",
        authors: "ProgramPerson",
        track: "ProgramTrack",
        session: "ProgramSession"
    },
    ProgramItemAttachment: {
        attachmentType: "AttachmentType",
        programItem: "ProgramItem"
    },
    ProgramPerson: {
        conference: "Conference",
        profile: "UserProfile",
    },
    ProgramRoom: {
        conference: "Conference",
        zoomRoom: "ZoomRoom",
        textChat: "TextChat",
        videoRoom: "VideoRoom",
    },
    ProgramSession: {
        conference: "Conference",
        track: "ProgramTrack",
        room: "ProgramRoom"
    },
    ProgramSessionEvent: {
        conference: "Conference",
        item: "ProgramItem",
        session: "ProgramSession",
    },
    ProgramTrack: {
        conference: "Conference",
    },
    Registration: {
        conference: "Conference",
    },
    _Role: {
        conference: "Conference",
        users: "_User",
        roles: "_Role"
    },
    _User: {
        profiles: "UserProfile"
    },
    UserPresence: {
        profile: "UserProfile",
    },
    UserProfile: {
        conference: "Conference",
        presence: "UserPresence",
        primaryFlair: "Flair",
        user: "_User",
        flairs: "Flair"
    },
    ZoomHostAccount: {
        conference: "Conference",
    },
    ZoomRoom: {
        conference: "Conference",
        hostAccount: "ZoomHostAccount",
    },
    TextChat: {
        conference: "Conference"
    },
    TextChatMessage: {
        chat: "TextChat"
    },
    VideoRoom: {
        conference: "Conference"
    }
};

function generateMockPassword(userId) {
    return "admin";
}

function generateAttachmentTypes() {
    let result = [];

    result.push({
        extra: undefined,
        fileTypes: ["image/png"],
        conference: "mockConference1",
        id: "mockAttachmentType1",
        createdAt: new Date(1),
        displayAsLink: true,
        isCoverImage: false,
        name: "Mock AttachmentType",
        ordinal: 0,
        supportsFile: false,
        updatedAt: new Date(1),

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "role:mockConference1-RoleManager": { w: true },
            "mockUser1": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "role:mockConference1-RoleManager",
            "mockUser1",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    return result;
}

function generateConferences() {
    let result = [];

    result.push({
        admin: "mockUser1",
        autoSubscribeToTextChats: [],
        details: ["mockPrivilegedConferenceDetails1"],

        name: "Mock Conference Name 1",
        shortName: "CONFA 2020",
        createdAt: new Date(),
        headerImage: null,
        id: "mockConference1",
        isInitialized: false,
        landingPage: "A mock landing page",
        updatedAt: new Date(),
        welcomeText: "Welcome to this mock conference!",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "role:mockConference1-RoleManager": { w: true },
            "*": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "role:mockConference1-RoleManager"
        ],
        _rperm: ["*"],
    });

    result.push({
        admin: "mockUser2",
        autoSubscribeToTextChats: [],
        details: ["mockPrivilegedConferenceDetails2"],

        name: "Mock Conference Name 2",
        shortName: "CONFB 2020",
        createdAt: new Date(),
        headerImage: null,
        id: "mockConference2",
        isInitialized: false,
        landingPage: "A second mock landing page",
        updatedAt: new Date(),
        welcomeText: "Welcome to this second mock conference!",

        _acl: {
            "role:mockConference2-admin": { w: true },
            "role:mockConference2-manager": { w: true },
            "*": { r: true }
        },
        _wperm: [
            "role:mockConference2-admin",
            "role:mockConference2-manager"
        ],
        _rperm: ["*"],
    });

    return result;
}

function generateFlairs() {
    let result = [];

    result.push({
        createdAt: new Date(),
        id: "mockFlair1",
        updatedAt: new Date(),
        color: "#FF00FF",
        label: "mock flair label",
        tooltip: "mock flair tooltip",
        priority: 1,
        conference: "mockConference1",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "role:mockConference1-RoleManager": { w: true },
            "mockUser1": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "role:mockConference1-RoleManager",
            "mockUser1",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    return result;
}

function generatePrivilegedConferenceDetails() {
    let result = [];

    result.push({
        conference: "mockConference1",
        createdAt: new Date(),
        id: "mockPrivilegedConferenceDetails1",
        key: "LOGGED_IN_TEXT",
        updatedAt: new Date(),
        value: "Welcome to this mock conference logged in text.",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "role:mockConference1-RoleManager": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "role:mockConference1-RoleManager",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    result.push({
        conference: "mockConference2",
        createdAt: new Date(),
        id: "mockPrivilegedConferenceDetails2",
        key: "LOGGED_IN_TEXT",
        updatedAt: new Date(),
        value: "Welcome to this mock conference logged in text.",

        _acl: {},
        _wperm: [],
        _rperm: [],
    });

    return result;
}

function generateRoles() {
    let result = [];

    result.push({
        id: "mockConference1-RoleAdmin",
        name: "mockConference1-RoleAdmin",
        conference: "mockConference1",
        _wperm: ["mockConference1-RoleAdmin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-RoleAdmin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: ["mockUser1"],
        roles: []
    });

    result.push({
        id: "mockConference1-RoleManager",
        name: "mockConference1-RoleManager",
        conference: "mockConference1",
        _wperm: ["mockConference1-RoleAdmin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-RoleAdmin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        roles: ["mockConference1-RoleAdmin"]
    });

    result.push({
        id: "mockConference1-RoleAttendee",
        name: "mockConference1-RoleAttendee",
        conference: "mockConference1",
        _wperm: ["mockConference1-RoleAdmin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-RoleAdmin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [],
        roles: ["mockConference1-RoleManager"]
    });

    return result;
}

function generateUsers() {
    let result = [];

    result.push({
        email: "mock@mock.com",
        emailVerified: true,
        createdAt: new Date(),
        id: "mockUser1",
        passwordSet: true,
        updatedAt: new Date(),
        username: "mockUser1",
        profiles: ["mockUserProfile1"],
        // Password is 'admin'
        _hashed_password: "$2b$10$U1dOIN.fger7QO4sS9kwSelJdQgrr7D2hUCX5G4oMNR7uAPFQeXS2",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "mockUser1": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "mockUser1",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    return result;
}

function generateUserPresences() {
    let result = [];

    result.push({
        createdAt: new Date(),
        id: "mockUserPresence1",
        updatedAt: new Date(),
        isDNT: false,
        lastSeen: new Date(),
        profile: "mockUserProfile1",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "mockUser1": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "mockUser1",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    return result;
}

function generateUserProfiles() {
    let result = [];

    result.push({
        dataConsentGiven: true,
        flairs: ["mockFlair1"],

        id: "mockUserProfile1",
        createdAt: new Date(),
        updatedAt: new Date(),
        affiliation: "mock affiliation",
        bio: "mock bio",
        country: "mock country",
        displayName: "mock display name",
        position: "mock position",
        profilePhoto: null, // TODO: Mock profile photo file
        pronouns: ["test", "pronouns"],
        realName: "mock real name",
        tags: [
            {
                alwaysShow: true,
                label: "mock tag label 1",
                priority: 1,
                tooltip: "mock tag tooltip 1"
            }, {
                alwaysShow: false,
                label: "mock tag label 2",
                priority: 2,
                tooltip: "mock tag tooltip 2"
            }
        ],
        webpage: "http://mock.webpage.com/someurl?queryparams=somequery!",
        welcomeModalShown: false,
        conference: "mockConference1",
        primaryFlair: "mockFlair1",
        presence: "mockUserPresence1",
        programPersons: [], // TODO: Mock program persons
        user: "mockUser1",

        _acl: {
            "role:mockConference1-RoleAdmin": { w: true },
            "mockUser1": { w: true },
            "role:mockConference1-RoleAttendee": { r: true }
        },
        _wperm: [
            "role:mockConference1-RoleAdmin",
            "mockUser1",
        ],
        _rperm: ["role:mockConference1-RoleAttendee"],
    });

    return result;
}



function generateProgramItem() {
    let result = [];

    return result;
}

function generateProgramPerson() {
    let result = [];

    return result;
}

function generateProgramRoom() {
    let result = [];

    return result;
}

function generateProgramSession() {
    let result = [];

    return result;
}

function generateProgramSessionEvent() {
    let result = [];

    return result;
}

function generateProgramTrack() {
    let result = [];

    return result;
}




function convertObjectToMongoJSON(tableName, item, result) {
    let RelationFields = RelationsToTableNames[tableName];
    let object = {
    };
    for (let fieldName in item) {
        let fieldValue = item[fieldName];
        if (fieldName === "id") {
            object["_id"] = fieldValue;
        }
        else {
            if (fieldName in RelationFields) {
                let relatedTableName = RelationFields[fieldName];
                if (Array.isArray(fieldValue)) {
                    let ids = fieldValue;
                    let relationName = `_Join:${fieldName}:${tableName}`;
                    if (ids.length > 0) {
                        if (!result[relationName]) {
                            result[relationName] = [];
                        }

                        let finalValue = ids.map(id => ({
                            relatedId: id,
                            owningId: item.id
                        }));

                        result[relationName] = result[relationName].concat(finalValue);
                    }
                    else {
                        result[relationName] = result[relationName] || [];
                    }
                }
                else if (fieldValue) {
                    object[`_p_${fieldName}`] = `${relatedTableName}$${fieldValue}`;
                }
            }
            else {
                if (fieldValue !== null && fieldValue !== undefined) {
                    if (fieldValue instanceof Date) {

                        if (fieldName === "updatedAt") {
                            fieldName = "_updated_at";
                        }
                        else if (fieldName === "createdAt") {
                            fieldName = "_created_at";
                        }

                        object[fieldName] = fieldValue;
                    }
                    else if (fieldValue instanceof Array) {
                        object[fieldName] = fieldValue;
                    }
                    else if (typeof fieldValue === "number") {
                        object[fieldName] = fieldValue.toString();
                    }
                    else if (typeof fieldValue === "string") {
                        object[fieldName] = fieldValue;
                    }
                    else if (typeof fieldValue === "boolean") {
                        object[fieldName] = fieldValue;
                    }
                    else if (typeof fieldValue === "object") {
                        object[fieldName] = fieldValue;
                    }
                    else {
                        throw new Error(`Unhandled field type! ${typeof fieldValue}`);
                    }
                }
            }
        }
    }
    return object;
}

function convertToMongoJSON(tableName, items, result) {
    result[tableName] = items.map(item => {
        return convertObjectToMongoJSON(tableName, item, result);
    });
}

module.exports = {
    generateTestData: () => {
        let result = {
            AttachmentType: [],
            Conference: [],
            ConferenceConfiguration: [],
            Conversation: [],
            Flair: [],
            LiveActivity: [],
            PrivilegedConferenceDetails: [],
            ProgramItem: [],
            ProgramItemAttachment: [],
            ProgramPerson: [],
            ProgramRoom: [],
            ProgramSession: [],
            ProgramSessionEvent: [],
            ProgramTrack: [],
            Registration: [],
            SocialSpace: [],
            _User: [],
            UserPresence: [],
            UserProfile: [],
            ZoomHostAccount: [],
            ZoomRoom: []
        };

        let allItems = {};

        result.AttachmentType = generateAttachmentTypes();
        convertToMongoJSON("AttachmentType", result.AttachmentType, allItems);

        result.Conference = generateConferences();
        convertToMongoJSON("Conference", result.Conference, allItems);

        result.Flair = generateFlairs();
        convertToMongoJSON("Flair", result.Flair, allItems);

        result.PrivilegedConferenceDetails = generatePrivilegedConferenceDetails();
        convertToMongoJSON("PrivilegedConferenceDetails", result.PrivilegedConferenceDetails, allItems);

        result._Role = generateRoles();
        convertToMongoJSON("_Role", result._Role, allItems);

        result._User = generateUsers();
        convertToMongoJSON("_User", result._User, allItems);

        result.UserPresence = generateUserPresences();
        convertToMongoJSON("UserPresence", result.UserPresence, allItems);

        result.UserProfile = generateUserProfiles();
        convertToMongoJSON("UserProfile", result.UserProfile, allItems);

        result.ProgramItem = generateProgramItem();
        convertToMongoJSON("ProgramItem", result.ProgramItem, allItems);

        result.ProgramPerson = generateProgramPerson();
        convertToMongoJSON("ProgramPerson", result.ProgramPerson, allItems);

        result.ProgramRoom = generateProgramRoom();
        convertToMongoJSON("ProgramRoom", result.ProgramRoom, allItems);

        result.ProgramSession = generateProgramSession();
        convertToMongoJSON("ProgramSession", result.ProgramSession, allItems);

        result.ProgramSessionEvent = generateProgramSessionEvent();
        convertToMongoJSON("ProgramSessionEvent", result.ProgramSessionEvent, allItems);

        result.ProgramTrack = generateProgramTrack();
        convertToMongoJSON("ProgramTrack", result.ProgramTrack, allItems);

        return {
            data: result,
            json: allItems
        };
    },
    generateMockPassword: generateMockPassword
}
