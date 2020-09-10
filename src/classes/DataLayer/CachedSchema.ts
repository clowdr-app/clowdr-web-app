import IDB from 'idb';

import * as Schema from "./Schema";
import { PromisedKeys } from "../Util";
import { CachableBase } from './Schema/Base';

// Note: IndexedDB is very limited - it can only handle 1-to-N indexes

export type Indexes<T> = { [K in PromisedKeys<T>]: "id" };


// IMPORTANT: Whenever changes are made to the schema, the version number should
//            be increased.

// Decimal places are not allowed - only positive integers!
export const SchemaVersion: number = 1;

export interface CachableDBSchema extends IDB.DBSchema {
    [s: string]: DBSchemaValue;
}
interface IndexKeys {
    [s: string]: IDBValidKey;
}
interface DBSchemaValue {
    key: IDBValidKey;
    value: CachableBase;
    indexes?: IndexKeys;
}

export default interface CachedSchema extends CachableDBSchema {
    AttachmentType: {
        key: string;
        value: Schema.AttachmentType;
        indexes: Indexes<Schema.AttachmentType>;
    };
}
