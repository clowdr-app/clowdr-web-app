import IDB from 'idb';

import * as Schema from "./Schema";
import { PromisedKeys } from "../Util";

// Note: IndexedDB is very limited - it can only handle 1-to-N indexes

type Indexes<T> = { [K in PromisedKeys<T>]: "id" };

export default interface CachedSchema extends IDB.DBSchema {
    AttachmentType: {
        key: "id";
        value: Schema.AttachmentType;
        indexes: Indexes<Schema.AttachmentType>;
    };

    ProgramItem: {
        key: "id";
        value: Schema.ProgramItem;
        indexes: Indexes<Schema.ProgramItem>;
    };
}
