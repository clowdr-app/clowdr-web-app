import IDB from 'idb';

import * as Schema from "./Schema";
import { Indexes } from './CachedSchema';

export default interface UncachedSchema extends IDB.DBSchema {
    BondedChannel: {
        key: string;
        value: Schema.BondedChannel;
        indexes: Indexes<Schema.BondedChannel>;
    };
    ConferenceConfiguration: {
        key: string;
        value: Schema.ConferenceConfiguration;
        indexes: Indexes<Schema.ConferenceConfiguration>;
    };
    ConferencePermission: {
        key: string;
        value: Schema.ConferencePermission;
        indexes: Indexes<Schema.ConferencePermission>;
    };
    Flair: {
        key: string;
        value: Schema.Flair;
        indexes: Indexes<Schema.Flair>;
    };
    MeetingRegistration: {
        key: string;
        value: Schema.MeetingRegistration;
        indexes: Indexes<Schema.MeetingRegistration>;
    };
    PrivilegedAction: {
        key: string;
        value: Schema.PrivilegedAction;
        indexes: Indexes<Schema.PrivilegedAction>;
    };
    Registration: {
        key: string;
        value: Schema.Registration;
        indexes: Indexes<Schema.Registration>;
    };
    TwilioChannelMirror: {
        key: string;
        value: Schema.TwilioChannelMirror;
        indexes: Indexes<Schema.TwilioChannelMirror>;
    };
    User: {
        key: string;
        value: Schema.User;
        indexes: Indexes<Schema.User>;
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
