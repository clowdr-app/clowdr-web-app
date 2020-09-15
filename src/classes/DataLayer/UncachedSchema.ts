import IDB from 'idb';

import * as Schema from "./Schema";
import { Indexes } from './CachedSchema';

export default interface UncachedSchema extends IDB.DBSchema {
    ConferenceConfiguration: {
        key: string;
        value: Schema.ConferenceConfiguration;
        indexes: Indexes<Schema.ConferenceConfiguration>;
    };
    Flair: {
        key: string;
        value: Schema.Flair;
        indexes: Indexes<Schema.Flair>;
    };
    Registration: {
        key: string;
        value: Schema.Registration;
        indexes: Indexes<Schema.Registration>;
    };
    _Role: {
        key: string;
        value: Schema._Role;
        indexes: Indexes<Schema._Role>;
    };
    _User: {
        key: string;
        value: Schema._User;
        indexes: Indexes<Schema._User>;
    };
    UserPresence: {
        key: string;
        value: Schema.UserPresence;
        indexes: Indexes<Schema.UserPresence>;
    };
    ZoomHostAccount: {
        key: string;
        value: Schema.ZoomHostAccount;
        indexes: Indexes<Schema.ZoomHostAccount>;
    };
    ZoomRoom: {
        key: string;
        value: Schema.ZoomRoom;
        indexes: Indexes<Schema.ZoomRoom>;
    };
}
