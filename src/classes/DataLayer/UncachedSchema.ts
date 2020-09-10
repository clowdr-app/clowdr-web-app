import IDB from 'idb';

import * as Schema from "./Schema";
import { Indexes } from './CachedSchema';

export default interface UncachedSchema extends IDB.DBSchema {
    ClowdrInstance: {
        key: string;
        value: Schema.Conference;
        indexes: Indexes<Schema.Conference>;
    };
    PrivilegedInstanceDetails: {
        key: string;
        value: Schema.PrivilegedInstanceDetails;
        indexes: Indexes<Schema.PrivilegedInstanceDetails>;
    };
}
