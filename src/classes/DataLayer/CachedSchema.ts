import IDB from 'idb';

import * as Schema from "./Schema";
import { PromisedKeys } from "../Util";

// Note: IndexedDB is very limited - it can only handle 1-to-N indexes

export type Indexes<T> = { [K in PromisedKeys<T>]: "id" };


// IMPORTANT: Whenever changes are made to the schema, the version number should
//            be increased.

// Decimal places are not allowed - only positive integers!
export const SchemaVersion: number = 1;

export default interface CachedSchema extends IDB.DBSchema {
    AttachmentType: {
        key: string;
        value: Schema.AttachmentType;
        indexes: Indexes<Schema.AttachmentType>;
    };
}
