import IDB from 'idb';

import * as Schema from "./Schema";
import { PromisedKeys } from "../Util";
import Base from './Schema/Base';

// Note: IndexedDB is very limited - it can only handle 1-to-N indexes

export type Indexes<T> = { [K in PromisedKeys<T>]: "id" };


// IMPORTANT: Whenever changes are made to the schema, the version number should
//            be increased.

// Decimal places are not allowed - only positive integers!
export const SchemaVersion: number = 2;

export interface CachableDBSchema extends IDB.DBSchema {
    [s: string]: DBSchemaValue;
}
interface IndexKeys {
    [s: string]: IDBValidKey;
}
interface DBSchemaValue {
    key: IDBValidKey;
    value: Base;
    indexes?: IndexKeys;
}

export default interface CachedSchema extends CachableDBSchema {
    AttachmentType: {
        key: string;
        value: Schema.AttachmentType;
        indexes: Indexes<Schema.AttachmentType>;
    };
    BreakoutRoom: {
        key: string;
        value: Schema.BreakoutRoom;
        indexes: Indexes<Schema.BreakoutRoom>;
    };
    Conference: {
        key: string;
        value: Schema.Conference;
        indexes: Indexes<Schema.Conference>;
    };
    Conversation: {
        key: string;
        value: Schema.Conversation;
        indexes: Indexes<Schema.Conversation>;
    };
    LiveActivity: {
        key: string;
        value: Schema.LiveActivity;
        indexes: Indexes<Schema.LiveActivity>;
    };
    PrivilegedConferenceDetails: {
        key: string;
        value: Schema.PrivilegedConferenceDetails;
        indexes: Indexes<Schema.PrivilegedConferenceDetails>;
    };
    ProgramPerson: {
        key: string;
        value: Schema.ProgramPerson;
        indexes: Indexes<Schema.ProgramPerson>;
    };
    ProgramItem: {
        key: string;
        value: Schema.ProgramItem;
        indexes: Indexes<Schema.ProgramItem>;
    };
    ProgramItemAttachment: {
        key: string;
        value: Schema.ProgramItemAttachment;
        indexes: Indexes<Schema.ProgramItemAttachment>;
    };
    ProgramRoom: {
        key: string;
        value: Schema.ProgramRoom;
        indexes: Indexes<Schema.ProgramRoom>;
    };
    ProgramSession: {
        key: string;
        value: Schema.ProgramSession;
        indexes: Indexes<Schema.ProgramSession>;
    };
    ProgramSessionEvent: {
        key: string;
        value: Schema.ProgramSessionEvent;
        indexes: Indexes<Schema.ProgramSessionEvent>;
    };
    ProgramTrack: {
        key: string;
        value: Schema.ProgramTrack;
        indexes: Indexes<Schema.ProgramTrack>;
    };
    SocialSpace: {
        key: string;
        value: Schema.SocialSpace;
        indexes: Indexes<Schema.SocialSpace>;
    };
    UserProfile: {
        key: string;
        value: Schema.UserProfile;
        indexes: Indexes<Schema.UserProfile>;
    };
}
