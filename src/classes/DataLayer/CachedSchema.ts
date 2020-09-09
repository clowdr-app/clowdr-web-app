import IDB from 'idb';

import * as Schema from "./Schema";
import { PromisedFields } from "../Util";

// Note: IndexedDB is very limited - it can only handle 1-to-N indexes

export default interface CachedSchema extends IDB.DBSchema {
    AttachmentType: {
        key: string;
        value: Schema.AttachmentType;
        indexes: PromisedFields<Schema.AttachmentType>;
    }
}
