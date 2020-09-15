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
    Conference: {
        details: "PrivilegedConferenceDetails",
        admin: "_User",
        autoSubscribeToTextChats: "TextChat"
    },
    ConferenceConfiguration: {
        conference: "Conference"
    },
    Flair: {
        conference: "Conference"
    },
    PrivilegedConferenceDetails: {
        conference: "Conference"
    },
    ProgramItem: {
        conference: "Conference",
        authors: "ProgramPerson",
        track: "ProgramTrack",
        attachments: "ProgramItemAttachment",
        events: "ProgramSessionEvent",
        session: "ProgramSession"
    },
    ProgramItemAttachment: {
        attachmentType: "AttachmentType",
        programItem: "ProgramItem"
    },
    ProgramPerson: {
        conference: "Conference",
        items: "ProgramItem",
        profile: "UserProfile",
    },
    ProgramRoom: {
        conference: "Conference",
        zoomRoom: "ZoomRoom",
        sessions: "ProgramSession",
        textChat: "TextChat",
        videoRoom: "VideoRoom",
    },
    ProgramSession: {
        conference: "Conference",
        events: "ProgramSessionEvent",
        items: "ProgramItem",
        track: "ProgramTrack",
        room: "ProgramRoom"
    },
    ProgramSessionEvent: {
        conference: "Conference",
        item: "ProgramItem",
        session: "ProgramSession",
        track: "ProgramTrack"
    },
    ProgramTrack: {
        conference: "Conference",
        items: "ProgramItem",
        sessions: "ProgramSession"
    },
    Registration: {
        conference: "Conference",
    },
    _Role: {
        conference: "Conference",
        users: "_User",
        roles: "_Role"
    },
    _User: {
        profiles: "UserProfile"
    },
    UserPresence: {
        profile: "UserProfile",
    },
    UserProfile: {
        conference: "Conference",
        presence: "UserPresence",
        primaryFlair: "Flair",
        programPersons: "ProgramPerson",
        user: "_User",
        flairs: "Flair"
    },
    ZoomHostAccount: {
        conference: "Conference",
        rooms: "ZoomRoom"
    },
    ZoomRoom: {
        conference: "Conference",
        hostAccount: "ZoomHostAccount",
        programRoom: "ProgramRoom"
    },
    TextChat: {
        conference: "Conference"
    },
    TextChatMessage: {
        chat: "TextChat"
    },
    VideoRoom: {
        conference: "Conference"
    }
};

export interface IBase<K extends WholeSchemaKeys> extends SchemaBase {
    getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>;
}
