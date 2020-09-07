import { DBSchema, StoreNames } from 'idb';

import * as Schemas from '../DBSchema';
import { ProgramItemFields } from '../DBSchema/ProgramItem';
import { ProgramSessionEventFields } from '../DBSchema/ProgramSessionEvent';
import { ProgramSessionFields } from '../DBSchema/ProgramSession';
import { ProgramTrackFields } from '../DBSchema/ProgramTrack';
import { ProgramRoomFields } from '../DBSchema/ProgramRoom';
import { ProgramPersonFields } from '../DBSchema/ProgramPerson';
import { UserProfileFields } from '../DBSchema/UserProfile';
import { AttachmentTypeFields } from '../DBSchema/AttachmentType';
import { MeetingRegistrationFields } from '../DBSchema/MeetingRegistration';
import { ZoomHostAccountFields } from '../DBSchema/ZoomHostAccount';
import { ZoomRoomFields } from '../DBSchema/ZoomRoom';
import { objectKeys } from '../Util';
import { Base } from '../Data/Base';
import { ProgramItem, ProgramSessionEvent, ProgramSession, ProgramTrack, ProgramRoom, ProgramPerson, UserProfile, AttachmentType, MeetingRegistration, ZoomHostAccount, ZoomRoom, Conference, User } from '../Data';
import { ConferenceFields } from '../DBSchema/Conference';
import { UserFields } from '../DBSchema/User';

// IMPORTANT: Whenever changes are made to the schema, the version number should
//            be increased.

// IMPORTANT: If adding a table to the IDBSchema, make sure to add the name to
//            the store names array too!

// Decimal places are not allowed - only positive integers!
export const SchemaVersion: number = 1;

// TODO: How to define indexes / relations?

export default interface IDBSchema extends DBSchema {
    // Note: Store names are case sensitive

    ClowdrInstance: {
        value: Schemas.Conference;
        key: string;
    }

    ProgramItem: {
        value: Schemas.ProgramItem;
        key: string;
    }

    ProgramSessionEvent: {
        value: Schemas.ProgramSessionEvent;
        key: string;
    }

    ProgramSession: {
        value: Schemas.ProgramSession;
        key: string;
    }

    ProgramTrack: {
        value: Schemas.ProgramTrack;
        key: string;
    }

    ProgramRoom: {
        value: Schemas.ProgramRoom;
        key: string;
    }

    ProgramPerson: {
        value: Schemas.ProgramPerson;
        key: string;
    }

    User: {
        value: Schemas.User;
        key: string;
    }

    UserProfile: {
        value: Schemas.UserProfile;
        key: string;
    }

    AttachmentType: {
        value: Schemas.AttachmentType;
        key: string;
    }

    MeetingRegistration: {
        value: Schemas.MeetingRegistration;
        key: string;
    }

    ZoomHostAccount: {
        value: Schemas.ZoomHostAccount;
        key: string;
    }

    ZoomRoom: {
        value: Schemas.ZoomRoom;
        key: string;
    }
}

export type IDBSchemaUnion
    = Schemas.Conference
    | Schemas.ProgramItem
    | Schemas.ProgramSessionEvent
    | Schemas.ProgramSession
    | Schemas.ProgramTrack
    | Schemas.ProgramRoom
    | Schemas.ProgramPerson
    | Schemas.User
    | Schemas.UserProfile
    | Schemas.AttachmentType
    | Schemas.MeetingRegistration
    | Schemas.ZoomHostAccount
    | Schemas.ZoomRoom;

export const IDBStoreSpecs: Record<StoreNames<IDBSchema>, string[]> = {
    ClowdrInstance: ConferenceFields,
    ProgramItem: ProgramItemFields,
    ProgramSessionEvent: ProgramSessionEventFields,
    ProgramSession: ProgramSessionFields,
    ProgramTrack: ProgramTrackFields,
    ProgramRoom: ProgramRoomFields,
    ProgramPerson: ProgramPersonFields,
    User: UserFields,
    UserProfile: UserProfileFields,
    AttachmentType: AttachmentTypeFields,
    MeetingRegistration: MeetingRegistrationFields,
    ZoomHostAccount: ZoomHostAccountFields,
    ZoomRoom: ZoomRoomFields,
};

export const IDBStoreNames: Array<StoreNames<IDBSchema>>
    = objectKeys(IDBStoreSpecs);

export const IDBStoreDataConstructors: {
    [K in keyof IDBSchema]: new (schemaValue: IDBSchema[K]["value"], dbValue?: Parse.Object | null) => Pick<Base<IDBSchema[K]["value"]>, any>;
} = {
    ClowdrInstance: Conference,
    ProgramItem: ProgramItem,
    ProgramSessionEvent: ProgramSessionEvent,
    ProgramSession: ProgramSession,
    ProgramTrack: ProgramTrack,
    ProgramRoom: ProgramRoom,
    ProgramPerson: ProgramPerson,
    User: User,
    UserProfile: UserProfile,
    AttachmentType: AttachmentType,
    MeetingRegistration: MeetingRegistration,
    ZoomHostAccount: ZoomHostAccount,
    ZoomRoom: ZoomRoom,
};
