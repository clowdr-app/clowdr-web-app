// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IBase, RelationsToTableNames, WholeSchema, WholeSchemaKeys } from "../classes/DataLayer/WholeSchema";
import initParseNode from "./initParseNode";
import Parse from "parse";

type SchemaRemapped<T> = {
    [K in keyof T]:
    T[K] extends Promise<Array<infer S>>
    ? (S extends IBase<any> ? Array<string> : never) // multiple ids
    : T[K] extends Promise<infer S>
    ? (S extends IBase<any> ? string : never) // id
    : T[K]
};

export type TestDataT<K extends keyof WholeSchema> = SchemaRemapped<WholeSchema[K]["value"]>;

export type TestDBData = {
    [K in keyof WholeSchema]: Array<TestDataT<K>>
};

type ParseRestRequestObject = {
    method: "POST",
    path: string,
    body: any
};

function generatePrivilegedConferenceDetails(): Array<TestDataT<"PrivilegedConferenceDetails">> {
    let result: Array<TestDataT<"PrivilegedConferenceDetails">> = [];

    result.push({
        conference: "mockConference1",
        createdAt: new Date(),
        id: "mockPrivilegedConferenceDetails1",
        key: "LOGGED_IN_TEXT",
        updatedAt: new Date(),
        value: "Welcome to this mock conference logged in text."
    });

    return result;
}

function generateConferences(): Array<TestDataT<"Conference">> {
    let result: Array<TestDataT<"Conference">> = [];

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

    return result;
}

function generateAttachmentTypes(): Array<TestDataT<"AttachmentType">> {
    let result: Array<TestDataT<"AttachmentType">> = [];

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

function convertToRequestObjs<K extends keyof WholeSchema>(tableName: K, items: Array<TestDataT<K>>): Array<ParseRestRequestObject> {
    let RelationFields = RelationsToTableNames[tableName as WholeSchemaKeys] as Record<string, string>;
    return items.map(item => {
        let object: ParseRestRequestObject = {
            method: "POST",
            path: "/parse/classes/" + tableName,
            body: {}
        };
        for (let fieldName in item) {
            let fieldValue = item[fieldName];
            if (fieldName === "id") {
                object.body["objectId"] = fieldValue;
            }
            else {
                if (fieldName in RelationFields) {
                    let finalValue: any;
                    let relatedTableName = RelationFields[fieldName];
                    if (Array.isArray(fieldValue)) {
                        let ids: Array<string> = fieldValue;
                        finalValue = ids.map(id => ({
                            __type: "Pointer",
                            className: relatedTableName,
                            objectId: id
                        }));
                    }
                    else {
                        finalValue = {
                            __type: "Pointer",
                            className: relatedTableName,
                            objectId: fieldValue
                        };
                    }
                    object.body[fieldName] = finalValue;
                }
                else {
                    let _fieldValue = fieldValue as any;
                    if (_fieldValue instanceof Date) {
                        object.body[fieldName] = {
                            __type: "Date",
                            iso: _fieldValue.toISOString()
                        };
                    }
                    else if (_fieldValue instanceof File) {
                        throw new Error("File fields not supported");
                    }
                    else {
                        object.body[fieldName] = fieldValue;
                    }
                }
            }
        }
        return object;
    });
}

export async function initTestDB(updateDB: boolean = true): Promise<TestDBData> {
    if (updateDB) {
        initParseNode();
    }

    let result: TestDBData = {
        AttachmentType: [],
        BondedChannel: [],
        BreakoutRoom: [],
        Conference: [],
        ConferenceConfiguration: [],
        ConferencePermission: [],
        Conversation: [],
        Flair: [],
        LiveActivity: [],
        MeetingRegistration: [],
        PrivilegedAction: [],
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
        TwilioChannelMirror: [],
        User: [],
        UserPresence: [],
        UserProfile: [],
        ZoomHostAccount: [],
        ZoomRoom: []
    };

    let purgePromises = [];
    for (let tableName in result) {
        try {
            let schema = new Parse.Schema(tableName);
            purgePromises.push(schema.purge());
        }
        catch (e) {
            console.warn(e);
        }
    }
    await Promise.all(purgePromises);

    let allItems: Array<ParseRestRequestObject> = [];
    result.Conference = generateConferences();
    allItems = allItems.concat(convertToRequestObjs("Conference", result.Conference));

    result.PrivilegedConferenceDetails = generatePrivilegedConferenceDetails();
    allItems = allItems.concat(convertToRequestObjs("PrivilegedConferenceDetails", result.PrivilegedConferenceDetails));

    result.AttachmentType = generateAttachmentTypes();
    allItems = allItems.concat(convertToRequestObjs("AttachmentType", result.AttachmentType));

    if (allItems.length > 50) {
        throw new Error("Test data too long.");
    }

    if (updateDB) {
        const RESTController = require('parse/lib/node/RESTController');
        await RESTController.request('POST', 'batch', {
            requests: allItems
        });
    }

    return result;
}
