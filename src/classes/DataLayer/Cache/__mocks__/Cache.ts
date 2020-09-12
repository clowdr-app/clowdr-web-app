import Parse from "parse";
import { keys } from "ts-transformer-keys";
import CachedSchema from "../../CachedSchema";
import { CachedSchemaKeys, PromisesRemapped, RelationsToTableNames, WholeSchemaKeys } from "../../WholeSchema";
import * as Interface from "../../Interface";
import * as Schema from "../../Schema";
import { CachedBase, RelatedDataT, FieldDataT, Constructor } from "../../Interface/Base";
import { PromisedNonArrayFields, PromisedArrayFields, PromisedFields, KnownKeys } from "../../../Util";
import { OperationResult } from "..";
import assert from "assert";

export default class Cache {

    private static constructors:
        {
            [K in WholeSchemaKeys]: Constructor<K>;
        } | null = null;

    static get Constructors() {
        if (!Cache.constructors) {
            Cache.constructors = {
                AttachmentType: Interface.AttachmentType,
                BondedChannel: Interface.BondedChannel,
                BreakoutRoom: Interface.BreakoutRoom,
                ConferenceConfiguration: Interface.ConferenceConfiguration,
                ConferencePermission: Interface.ConferencePermission,
                Conference: Interface.Conference,
                Conversation: Interface.Conversation,
                Flair: Interface.Flair,
                LiveActivity: Interface.LiveActivity,
                MeetingRegistration: Interface.MeetingRegistration,
                PrivilegedAction: Interface.PrivilegedAction,
                PrivilegedConferenceDetails: Interface.PrivilegedConferenceDetails,
                ProgramItem: Interface.ProgramItem,
                ProgramItemAttachment: Interface.ProgramItemAttachment,
                ProgramPerson: Interface.ProgramPerson,
                ProgramRoom: Interface.ProgramRoom,
                ProgramSession: Interface.ProgramSession,
                ProgramSessionEvent: Interface.ProgramSessionEvent,
                ProgramTrack: Interface.ProgramTrack,
                Registration: Interface.Registration,
                SocialSpace: Interface.SocialSpace,
                TwilioChannelMirror: Interface.TwilioChannelMirror,
                _User: Interface._User,
                UserPresence: Interface.UserPresence,
                UserProfile: Interface.UserProfile,
                ZoomHostAccount: Interface.ZoomHostAccount,
                ZoomRoom: Interface.ZoomRoom
            };
        }
        return Cache.constructors;
    }

    readonly Fields: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["value"]>>;
    } = {
            AttachmentType: keys<Schema.AttachmentType>(),
            BreakoutRoom: keys<Schema.BreakoutRoom>(),
            Conversation: keys<Schema.Conversation>(),
            LiveActivity: keys<Schema.LiveActivity>(),
            ProgramItemAttachment: keys<Schema.ProgramItemAttachment>(),
            ProgramRoom: keys<Schema.ProgramRoom>(),
            ProgramSession: keys<Schema.ProgramSession>(),
            ProgramSessionEvent: keys<Schema.ProgramSessionEvent>(),
            SocialSpace: keys<Schema.SocialSpace>(),
            UserProfile: keys<Schema.UserProfile>(),
            ProgramPerson: keys<Schema.ProgramPerson>(),
            ProgramItem: keys<Schema.ProgramItem>(),
            ProgramTrack: keys<Schema.ProgramTrack>(),
            Conference: keys<Schema.Conference>(),
            PrivilegedConferenceDetails: keys<Schema.PrivilegedConferenceDetails>(),
        };

    readonly Relations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedFields<Schema.AttachmentType>>(),
            BreakoutRoom: keys<PromisedFields<Schema.BreakoutRoom>>(),
            Conversation: keys<PromisedFields<Schema.Conversation>>(),
            LiveActivity: keys<PromisedFields<Schema.LiveActivity>>(),
            ProgramItemAttachment: keys<PromisedFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedFields<Schema.ProgramSessionEvent>>(),
            SocialSpace: keys<PromisedFields<Schema.SocialSpace>>(),
            UserProfile: keys<PromisedFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedFields<Schema.PrivilegedConferenceDetails>>(),
        };

    readonly UniqueRelations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedNonArrayFields<Schema.AttachmentType>>(),
            BreakoutRoom: keys<PromisedNonArrayFields<Schema.BreakoutRoom>>(),
            Conversation: keys<PromisedNonArrayFields<Schema.Conversation>>(),
            LiveActivity: keys<PromisedNonArrayFields<Schema.LiveActivity>>(),
            ProgramItemAttachment: keys<PromisedNonArrayFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedNonArrayFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedNonArrayFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedNonArrayFields<Schema.ProgramSessionEvent>>(),
            SocialSpace: keys<PromisedNonArrayFields<Schema.SocialSpace>>(),
            UserProfile: keys<PromisedNonArrayFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedNonArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedNonArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedNonArrayFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedNonArrayFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedNonArrayFields<Schema.PrivilegedConferenceDetails>>(),
        };

    readonly NonUniqueRelations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedArrayFields<Schema.AttachmentType>>(),
            BreakoutRoom: keys<PromisedArrayFields<Schema.BreakoutRoom>>(),
            Conversation: keys<PromisedArrayFields<Schema.Conversation>>(),
            LiveActivity: keys<PromisedArrayFields<Schema.LiveActivity>>(),
            ProgramItemAttachment: keys<PromisedArrayFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedArrayFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedArrayFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedArrayFields<Schema.ProgramSessionEvent>>(),
            SocialSpace: keys<PromisedArrayFields<Schema.SocialSpace>>(),
            UserProfile: keys<PromisedArrayFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedArrayFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedArrayFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedArrayFields<Schema.PrivilegedConferenceDetails>>(),
        };

    readonly KEY_PATH: "id" = "id";

    private conference: Promise<Parse.Object<PromisesRemapped<Schema.Conference>>> | null = null;

    constructor(
        public readonly conferenceId: string
    ) {
    }

    get IsDebugEnabled(): boolean {
        return false;
    }

    set IsDebugEnabled(value: boolean) {
    }

    get IsInitialised(): boolean {
        return true;
    }

    get Ready(): Promise<void> {
        return Promise.resolve();
    }

    get DatabaseName(): string {
        return `clowdr-${this.conferenceId}`;
    }

    async initialise(): Promise<void> {
        this.conference
            = new Parse.Query<Parse.Object<PromisesRemapped<Schema.Conference>>>("Conference")
            .get(this.conferenceId);
    }

    async addItemToCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        parse: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>,
        tableName: K
    ): Promise<T> {
        let schema: any = {
            id: parse.id
        };
        for (let _key of this.Fields[tableName]) {
            let key = _key as KnownKeys<(FieldDataT[K] | RelatedDataT[K])>;
            if (key !== "id") {
                // Yes these casts are safe

                let rels = this.Relations[tableName] as Array<string>;
                if (rels.includes(key as string)) {
                    let uniqRels = this.UniqueRelations[tableName] as Array<string>;
                    try {
                        let xs = parse.get(key as any);
                        if (xs) {
                            if (uniqRels.includes(key as string)) {
                                schema[key] = xs.id;
                            }
                            else {
                                schema[key] = parse.get(key as any).map((x: any) => x.id);
                            }
                        }
                    }
                    catch (e) {
                        throw e;
                    }
                }
                else {
                    schema[key] = parse.get(key as any);
                }
            }
        }

        const constr = Cache.Constructors[tableName];
        return new constr(this.conferenceId, schema, parse as any) as unknown as T;
    }

    public async deleteDatabase(
        reload: boolean = false,
        retryDelay: number = 5000
    ): Promise<OperationResult> {
        return Promise.reject("Mock cache will always reject");
    }

    private async newParseQuery<K extends CachedSchemaKeys>(tableName: K) {
        assert(this.conference);
        let conf = await this.conference;

        let query = new Parse.Query<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>>(tableName);
        if (tableName !== "Conference") {
            let r2t: Record<string, string> = RelationsToTableNames[tableName];
            if ("conference" in r2t) {
                query.equalTo("conference" as any, conf as any);
            }
        }
        return query;
    }

    async get<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        id: string
    ): Promise<T | null> {
        let query = await this.newParseQuery(tableName);
        try {
            let resultP = query.get(id);
            let result = await resultP;
            return await this.addItemToCache<K, T>(result, tableName);
        }
        catch (reason) {
            return null;
        }
    }

    async getAll<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K
    ): Promise<Array<T>> {
        let query = await this.newParseQuery(tableName);
        return query.map(async parse => {
            return await this.addItemToCache<K, T>(parse, tableName);
        }).catch(_reason => {
            return [];
        });
    }
}
