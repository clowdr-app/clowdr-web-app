import { IBase, PromisesRemapped, RelationsToTableNames, WholeSchema, WholeSchemaKeys } from "../classes/DataLayer/Interface/Base";

type SchemaRemapped<T> = {
    [K in keyof T]:
    T[K] extends Promise<Array<infer S>>
    ? Array<string> // multiple ids
    : T[K] extends Promise<infer S>
    ? (S extends IBase<any>
    ? string // id
    : never)
    : T[K]
};

type TestDataT<K extends keyof WholeSchema> = Array<SchemaRemapped<WholeSchema[K]["value"]>>;

export type TestDBData = {
    [K in keyof WholeSchema]: TestDataT<K>
};

function generateAttachmentTypes(): TestDataT<"AttachmentType"> {
    let result: TestDataT<"AttachmentType"> = [];

    result.push({
        conference: "",
        id: "mockTestAttachmentType1",
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

async function saveItems<K extends keyof WholeSchema>(tableName: K, items: TestDataT<K>) {
    let tableT = Parse.Object.extend(tableName as string) as new () => Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>;
    let RelationFields = RelationsToTableNames[tableName as WholeSchemaKeys] as Record<string, string>;
    for (let item of items) {
        let object = new tableT();
        for (let fieldName in item) {
            let fieldValue = item[fieldName];
            if (fieldName in RelationFields) {
                let relation = object.relation(fieldName as any);
                if (Array.isArray(fieldValue)) {
                    let ids: Array<string> = fieldValue;
                    for (let id of ids) {
                        relation.add(id as any);
                    }
                }
                else {
                    relation.add(fieldValue as any);
                }
            }
            else {
                object.set(fieldName as any, fieldValue as any);
            }
        }
        object.save(null, { useMasterKey: true });
    }
}

export async function initTestDB(): Promise<TestDBData> {
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

    let schemas = await Parse.Schema.all();
    for (let schema of schemas) {
        schema.purge();
    }

    let newAttachmentTypes = generateAttachmentTypes();
    await saveItems("AttachmentType", newAttachmentTypes);

    return result;
}
