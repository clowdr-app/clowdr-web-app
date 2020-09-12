import { KnownKeys, PromisedKeys } from "../Util";
import CachedSchema from "./CachedSchema";
import UncachedSchema from "./UncachedSchema";
import { default as SchemaBase } from "./Schema/Base";

export type CachedSchemaKeys = KnownKeys<CachedSchema>;
export type UncachedSchemaKeys = KnownKeys<UncachedSchema>;
export type WholeSchemaKeys = KnownKeys<RelationsToTableNamesT>;
export type WholeSchema = CachedSchema & UncachedSchema;

export type RelationsToTableNamesT =
    {
        [K in CachedSchemaKeys]: {
            [K2 in PromisedKeys<CachedSchema[K]["value"]>]:
            CachedSchema[K]["value"][K2] extends Promise<any> ? WholeSchemaKeys : never
        }
    } & {
        [K in UncachedSchemaKeys]: {
            [K2 in PromisedKeys<UncachedSchema[K]["value"]>]:
            UncachedSchema[K]["value"][K2] extends Promise<any> ? WholeSchemaKeys : never
        }
    };

/**
 * When retrieving fields from Parse objects that are actually related tables,
 * we don't get back a `Promise<Table>`, we get back a
 * `Parse.Object<Schema.Table>`. So this type transformer remaps fields of type
 * `Promise<Interface<K,_>>` to `Parse.Object<Schema[K]>`.
 *
 * (Note: The `code` / `types` used in this comment are intuitive not accurate.)
 */
export type PromisesRemapped<T>
    = { [K in keyof T]: T[K] extends Promise<infer S>
        ? S extends IBase<infer K2>
        ? Parse.Object<PromisesRemapped<WholeSchema[K2]["value"]>>
        : never
        : T[K]
    };

export const RelationsToTableNames: RelationsToTableNamesT = {
    AttachmentType: {
        conference: "Conference"
    },
    BondedChannel: {
        children: "TwilioChannelMirror"
    },
    BreakoutRoom: {
        conference: "Conference",
        conversation: "Conversation",
        members: "UserProfile",
        programItem: "ProgramItem",
        watchers: "UserProfile"
    },
    Conference: {
        loggedInText: "PrivilegedConferenceDetails",
    },
    ConferenceConfiguration: {
        conference: "Conference"
    },
    ConferencePermission: {
        action: "PrivilegedAction",
        conference: "Conference"
    },
    Conversation: {
        conference: "Conference",
        member1: "UserProfile",
        member2: "UserProfile",
    },
    Flair: {
    },
    LiveActivity: {
    },
    MeetingRegistration: {
        conference: "Conference"
    },
    PrivilegedAction: {
    },
    PrivilegedConferenceDetails: {
        conference: "Conference"
    },
    ProgramItem: {
        conference: "Conference",
        authors: "ProgramPerson",
        track: "ProgramTrack",
        attachments: "ProgramItemAttachment",
        breakoutRoom: "BreakoutRoom",
        events: "ProgramSessionEvent",
        programSession: "ProgramSession"
    },
    ProgramItemAttachment: {
        attachmentType: "AttachmentType",
        programItem: "ProgramItem"
    },
    ProgramPerson: {
        conference: "Conference",
        programItems: "ProgramItem",
        userProfile: "UserProfile",
    },
    ProgramRoom: {
        conference: "Conference",
        socialSpace: "SocialSpace",
        zoomRoom: "ZoomRoom"
    },
    ProgramSession: {
        conference: "Conference",
        events: "ProgramSessionEvent",
        items: "ProgramItem",
        programTrack: "ProgramTrack",
        room: "ProgramRoom"
    },
    ProgramSessionEvent: {
        conference: "Conference",
        programItem: "ProgramItem",
        programSession: "ProgramSession"
    },
    ProgramTrack: {
        conference: "Conference"
    },
    Registration: {
    },
    SocialSpace: {
        conference: "Conference"
    },
    TwilioChannelMirror: {
    },
    _User: {
        profiles: "UserProfile"
    },
    UserPresence: {
        socialSpace: "SocialSpace",
        user: "UserProfile"
    },
    UserProfile: {
        conference: "Conference",
        presence: "UserPresence",
        primaryFlair: "Flair",
        programPersons: "ProgramPerson",
        user: "_User",
        watchedRooms: "ProgramRoom"
    },
    ZoomHostAccount: {
    },
    ZoomRoom: {
        conference: "Conference",
        hostAccount: "ZoomHostAccount",
        programRoom: "ProgramRoom"
    }
};

export interface IBase<K extends WholeSchemaKeys> extends SchemaBase {
    getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>;
}
