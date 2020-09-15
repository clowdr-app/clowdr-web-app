// Copied from WholeSchema.ts
const RelationsToTableNames = {
    AttachmentType: {
        conference: "Conference"
    },
    Conference: {
        loggedInText: "PrivilegedConferenceDetails",
    },
    ConferenceConfiguration: {
        conference: "Conference"
    },
    Conversation: {
        conference: "Conference",
        member1: "UserProfile",
        member2: "UserProfile",
    },
    Flair: {
    },
    LiveActivity: {
    },
    PrivilegedConferenceDetails: {
        conference: "Conference"
    },
    ProgramItem: {
        conference: "Conference",
        authors: "ProgramPerson",
        track: "ProgramTrack",
        attachments: "ProgramItemAttachment",
        breakoutRoom: "BreakoutRoom",
        events: "ProgramSessionEvent",
        programSession: "ProgramSession"
    },
    ProgramItemAttachment: {
        attachmentType: "AttachmentType",
        programItem: "ProgramItem"
    },
    ProgramPerson: {
        conference: "Conference",
        programItems: "ProgramItem",
        userProfile: "UserProfile",
    },
    ProgramRoom: {
        conference: "Conference",
        socialSpace: "SocialSpace",
        zoomRoom: "ZoomRoom"
    },
    ProgramSession: {
        conference: "Conference",
        events: "ProgramSessionEvent",
        items: "ProgramItem",
        programTrack: "ProgramTrack",
        room: "ProgramRoom"
    },
    ProgramSessionEvent: {
        conference: "Conference",
        programItem: "ProgramItem",
        programSession: "ProgramSession"
    },
    ProgramTrack: {
        conference: "Conference"
    },
    Registration: {
    },
    SocialSpace: {
        conference: "Conference"
    },
    _User: {
        profiles: "UserProfile",
        roles: "_Role"
    },
    UserPresence: {
        socialSpace: "SocialSpace",
        user: "UserProfile"
    },
    UserProfile: {
        conference: "Conference",
        presence: "UserPresence",
        primaryFlair: "Flair",
        programPersons: "ProgramPerson",
        user: "_User",
        watchedRooms: "ProgramRoom"
    },
    ZoomHostAccount: {
    },
    ZoomRoom: {
        conference: "Conference",
        hostAccount: "ZoomHostAccount",
        programRoom: "ProgramRoom"
    },
    _Role: {
        users: "_User"
    }
};

function generateMockPassword(userId) {
    return "admin";
}

function generateAttachmentTypes() {
    let result = [];

    result.push({
        conference: "mockConference1",
        id: "mockAttachmentType1",
        createdAt: new Date(1),
        displayAsLink: true,
        isCoverImage: false,
        name: "Mock AttachmentType",
        ordinal: 0,
        supportsFile: false,
        updatedAt: new Date(1)
    });

    return result;
}

function generateConferences() {
    let result = [];

    result.push({
        adminEmail: "mockAdminEmail@mock.com",
        adminName: "mockAdminName",
        conferenceName: "Mock Conference Name",
        createdAt: new Date(),
        headerImage: null,
        id: "mockConference1",
        isInitialized: false,
        landingPage: "A mock landing page",
        loggedInText: "mockPrivilegedConferenceDetails1",
        updatedAt: new Date(),
        welcomeText: "Welcome to this mock conference!"
    });

    result.push({
        adminEmail: "mockAdminEmail2@mock.com",
        adminName: "mockAdminName2",
        conferenceName: "A Second Mock Conference",
        createdAt: new Date(),
        headerImage: null,
        id: "mockConference2",
        isInitialized: false,
        landingPage: "A mock landing page",
        loggedInText: "mockPrivilegedConferenceDetails2",
        updatedAt: new Date(),
        welcomeText: "Welcome to this second mock conference!"
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
        priority: 1
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
        value: "Welcome to this mock conference logged in text."
    });

    result.push({
        conference: "mockConference2",
        createdAt: new Date(),
        id: "mockPrivilegedConferenceDetails2",
        key: "LOGGED_IN_TEXT",
        updatedAt: new Date(),
        value: "Welcome to this mock conference logged in text."
    });

    return result;
}

function generateRoles() {
    let result = [];

    result.push({
        id: "mockSysAdminRole1",
        name: "ClowdrSysAdmin",
        _wperm: ["mockConference1-admin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-admin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: ["ClowdrSysAdmin"]
    });

    result.push({
        id: "mockConference1-RoleAdmin",
        name: "mockConference1-admin",
        _wperm: ["mockConference1-admin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-admin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: ["mockUser1"]
    });

    result.push({
        id: "mockConference1-RoleManager",
        name: "mockConference1-manager",
        _wperm: ["mockConference1-admin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-admin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: ["mockUser1"]
    });

    result.push({
        id: "mockConference1-RoleConference",
        name: "mockConference1-conference",
        _wperm: ["mockConference1-admin"],
        _rperm: ["*"],
        _acl: {
            "mockConference1-admin": { w: true },
            "*": { r: true }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        users: ["mockUser1"]
    });

    return result;
}

function generateUsers() {
    let result = [];

    result.push({
        email: "mock@mock.com",
        createdAt: new Date(),
        id: "mockUser1",
        isBanned: "No",
        loginKey: null,
        passwordSet: true,
        updatedAt: new Date(),
        username: "mockUser1",
        profiles: ["mockUserProfile1"],
        // admin
        _hashed_password: "$2b$10$U1dOIN.fger7QO4sS9kwSelJdQgrr7D2hUCX5G4oMNR7uAPFQeXS2"
    });

    result.push({
        email: "clowdr@sys.admin",
        createdAt: new Date(),
        id: "ClowdrSysAdmin",
        isBanned: "No",
        loginKey: null,
        passwordSet: true,
        updatedAt: new Date(),
        username: "clowdr@localhost",
        profiles: [],
        // admin
        _hashed_password: "$2b$10$U1dOIN.fger7QO4sS9kwSelJdQgrr7D2hUCX5G4oMNR7uAPFQeXS2"
    });

    return result;
}

function generateUserPresences() {
    let result = [];

    result.push({
        createdAt: new Date(),
        id: "mockUserPresence1",
        updatedAt: new Date(),
        isAvailable: false,
        isDND: false,
        isDNT: false,
        isLookingForConversation: false,
        isOnline: false,
        isOpenToConversation: false,
        status: "mock user presence status",
        socialSpace: null,
        user: "mockUser1",
    });

    return result;
}

function generateUserProfiles() {
    let result = [];

    result.push({
        id: "mockUserProfile1",
        createdAt: new Date(),
        updatedAt: new Date(),
        affiliation: "mock affiliation",
        bio: "mock bio",
        country: "mock country",
        displayName: "mock display name",
        position: "mock position",
        profilePhoto: null, // TODO: Mock profile photo file
        pronouns: "test pronouns",
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
        watchedRooms: [] // TODO: Mock watched rooms
    });

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
                        result[relationName] = [];
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
                        object[fieldName] = fieldValue.map(x => convertObjectToMongoJSON(tableName, x, result));
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
                        object[fieldName] = convertObjectToMongoJSON(tableName, fieldValue, result);
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

        return {
            data: result,
            json: allItems
        };
    },
    generateMockPassword: generateMockPassword
}
