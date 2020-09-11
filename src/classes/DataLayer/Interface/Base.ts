import { keys } from "ts-transformer-keys";

import Parse from "parse";
import CachedSchema from "../CachedSchema";
import { KnownKeys, PromisedKeys, NotPromisedKeys } from "../../Util";
import * as Schema from "../Schema";
import Caches, { Cache } from "../Cache";
import UncachedSchema from "../UncachedSchema";

/*
 * 2020-09-09 A note to future developers on constructors
 *
 * At the time of writing, TypeScript fails to enforce type checking for the
 * kind of `new` on an interface when defined in the slightly weird style that
 * this data layer uses. It is unknown to me (Ed) why this is the case, since
 * all other type checking (that the data layer currently relies upon) appears
 * to work just fine. At any rate, some care must be taken to ensure the
 * constructor types (arguments and return type) all mactch up in: StaticBase,
 * Constructor, and Base.
 */

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

export const RelationsToTableNames: RelationsToTableNamesT = {
    AttachmentType: {
        conference: "ClowdrInstance"
    },
    ProgramPerson: {
        conference: "ClowdrInstance",
        programItems: "ProgramItem"
    },
    ProgramItem: {
        conference: "ClowdrInstance",
        authors: "ProgramPerson",
        track: "ProgramTrack"
    },
    ProgramTrack: {
        conference: "ClowdrInstance"
    },
    ClowdrInstance: {
        loggedInText: "PrivilegedInstanceDetails",
    },
    PrivilegedInstanceDetails: {
        instance: "ClowdrInstance"
    }
};

export type CachedSchemaKeys = KnownKeys<CachedSchema>;
export type UncachedSchemaKeys = KnownKeys<UncachedSchema>;
export type WholeSchemaKeys = KnownKeys<RelationsToTableNamesT>;
export type WholeSchema = CachedSchema & UncachedSchema;

export const CachedStoreNames = keys<CachedSchema>() as Array<CachedSchemaKeys>;

export type FieldDataT
    = {
        [K in CachedSchemaKeys]: {
            [K2 in NotPromisedKeys<CachedSchema[K]["value"]>]: CachedSchema[K]["value"][K2]
        } & {
            [K in NotPromisedKeys<Schema.Base>]: Schema.Base[K]
        }
    } & {
        [K in UncachedSchemaKeys]: {
            [K2 in NotPromisedKeys<UncachedSchema[K]["value"]>]: UncachedSchema[K]["value"][K2]
        } & {
            [K in NotPromisedKeys<Schema.Base>]: Schema.Base[K]
        }
    };

export type RelatedDataT
    = {
        [K in CachedSchemaKeys]: {
            [K2 in PromisedKeys<CachedSchema[K]["value"]>]: CachedSchema[K]["value"][K2] extends Promise<infer Q> ? Q : never
        }
    } & {
        [K in UncachedSchemaKeys]: {
            [K2 in PromisedKeys<UncachedSchema[K]["value"]>]: UncachedSchema[K]["value"][K2] extends Promise<infer Q> ? Q : never
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

export interface StaticBase<K extends WholeSchemaKeys> {
}

export interface StaticCachedBase<K extends CachedSchemaKeys> extends StaticBase<K> {
    // Must match the type of `CachedConstructor` below
    new(conferenceId: string,
        data: FieldDataT[K],
        parse?: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null): IBase<K>;

    get(id: string, conferenceId: string): Promise<IBase<K> | null>;
    getAll(conferenceId: string): Promise<Array<IBase<K>>>;
}

export type CachedConstructor<K extends CachedSchemaKeys>
    = new (
        conferenceId: string,
        data: FieldDataT[K],
        parse?: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null) => IBase<K>;

export type UncachedConstructor<K extends UncachedSchemaKeys>
    = new (parse: Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>) => IBase<K>;

export type Constructor<K extends WholeSchemaKeys>
    = K extends CachedSchemaKeys ? CachedConstructor<K>
    : K extends UncachedSchemaKeys ? UncachedConstructor<K>
    : never;

export interface StaticUncachedBase<K extends UncachedSchemaKeys> extends StaticBase<K> {
    // Must match the type of `UncachedConstructor` below
    new(parse: Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>): IBase<K>;

    get(id: string): Promise<IBase<K> | null>;
    getAll(): Promise<Array<IBase<K>>>;
}

/**
 * Provides a vanilla reusable implementation of the static base methods.
 */
export abstract class StaticBaseImpl {
    private static IsCachable(
        tableName: WholeSchemaKeys,
        conferenceId?: string
    ): conferenceId is string {
        return CachedStoreNames.includes(tableName as any) && !!conferenceId;
    }

    static async get<K extends WholeSchemaKeys, T extends IBase<K>>(
        tableName: K,
        id: string,
        conferenceId?: string,
    ): Promise<T | null> {
        // Yes these casts are safe
        if (StaticBaseImpl.IsCachable(tableName, conferenceId) || tableName === "ClowdrInstance") {
            let _tableName = tableName as CachedSchemaKeys;
            let cache = await Caches.get(conferenceId ? conferenceId : id);
            return cache.get(_tableName, id) as unknown as T;
        }
        else {
            let query = new Parse.Query<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>(tableName);
            return query.get(id).then(async parse => {
                if (CachedStoreNames.includes(tableName as CachedSchemaKeys)) {
                    const _parse = parse as Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>;
                    conferenceId = _parse.get("conference" as any).id as string;
                    let _tableName = tableName as CachedSchemaKeys;
                    let cache = await Caches.get(conferenceId);
                    return cache.addItemToCache(_parse as any, _tableName) as unknown as T;
                }
                else {
                    const constr = Cache.Constructors[tableName as UncachedSchemaKeys];
                    const _parse = parse as Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>;
                    // @ts-ignore - //TODO: Remove this ignore when an uncached table exists
                    return new constr(_parse) as T;
                }
            }).catch(reason => {
                console.warn("Fetch from database of uncached item failed", {
                    tableName: tableName,
                    id: id,
                    reason: reason
                });

                return null;
            });
        }
    }

    static async getAll<K extends WholeSchemaKeys, T extends IBase<K>>(
        tableName: K,
        conferenceId?: string): Promise<Array<T>> {
        if (StaticBaseImpl.IsCachable(tableName, conferenceId)) {
            let cache = await Caches.get(conferenceId);
            return cache.getAll(tableName as any) as any;
        }
        else {
            let query = new Parse.Query<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>(tableName);
            return query.map(async parse => {
                if (CachedStoreNames.includes(tableName as any)) {
                    const _parse = parse as Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>;
                    if (tableName === "ClowdrInstance") {
                        conferenceId = _parse.id;
                    }
                    else {
                        conferenceId = _parse.get("conference" as any).id as string;
                    }

                    let _tableName = tableName as CachedSchemaKeys;
                    let cache = await Caches.get(conferenceId);
                    return cache.addItemToCache(_parse as any, _tableName) as unknown as T;
                }
                else {
                    const constr = Cache.Constructors[tableName as UncachedSchemaKeys];
                    const _parse = parse as Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>;
                    // @ts-ignore - //TODO: Remove this ignore when an uncached table exists
                    return new constr(_parse) as T;
                }
            }).catch(reason => {
                console.warn("Fetch all from database of uncached table failed", {
                    tableName: tableName,
                    reason: reason
                });

                throw new Error("Fetch all from database of uncached table failed");
            });
        }
    }
}

export interface IBase<K extends WholeSchemaKeys> extends Schema.Base {
    getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>;
}

/**
 * Provides the methods and properties common to all data objects (e.g. `id`).
 */
export abstract class CachedBase<K extends CachedSchemaKeys> implements IBase<K> {
    constructor(
        protected conferenceId: string,
        protected tableName: K,
        protected data: FieldDataT[K],
        protected parse: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null = null) {
    }

    /**
     * DO NOT USE THIS without consulting the lead development team! This
     * function is not recommended for use! This bypasses the cache!
     * 
     * This function exists only for scenarios where high-performance database
     * queries are required, such as complex lookups that the cache cannot
     * handle.
     * 
     * @deprecated Do not use - see doc comment.
     */
    async getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>> {
        if (this.parse) {
            return this.parse;
        }
        else {
            let query = new Parse.Query<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>>(this.tableName);
            return query.get(this.id);
        }
    }

    get id(): string {
        return this.data.id;
    }

    get createdAt(): Date {
        return this.data.createdAt;
    }

    get updatedAt(): Date {
        return this.data.updatedAt;
    }

    protected async uniqueRelated<S extends keyof RelatedDataT[K]>(field: S): Promise<RelatedDataT[K][S]> {
        let cache = await Caches.get(this.conferenceId);
        let r2t: Record<string, string> = RelationsToTableNames[this.tableName];
        let targetTableName = r2t[field as any];
        let targetId = this.data[field as unknown as keyof FieldDataT[K]] as any as string;
        if (CachedStoreNames.includes(targetTableName as any)) {
            return cache.get(targetTableName as any, targetId).then(result => {
                if (!result) {
                    throw new Error("Target of uniquely related field not found!");
                }
                return result;
            }) as unknown as RelatedDataT[K][S];
        }
        else {
            // Lookup in parse
            throw new Error("Method not implemented");
        }
    }
    // TODO: nonUniqueRelated
}

export abstract class UncachedBase<K extends UncachedSchemaKeys> implements IBase<K> {
    constructor(
        protected tableName: K,
        protected parse: Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>) {
    }

    async getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>> {
        return this.parse;
    }

    get id(): string {
        return this.parse.id;
    }

    get createdAt(): Date {
        return this.parse.createdAt;
    }

    get updatedAt(): Date {
        return this.parse.updatedAt;
    }

    protected async uniqueRelated<S extends keyof RelatedDataT[K]>(field: S): Promise<RelatedDataT[K][S]> {
        let relTableNames = RelationsToTableNames[this.tableName];
        let relTableName = relTableNames[field as unknown as keyof RelationsToTableNamesT[K]];
        if (CachedStoreNames.includes(relTableName as any)) {
            return this.parse.get(field as string).fetch().then(async (result: any) => {
                let confId = result.get("conference");
                if (!confId) {
                    confId = result.get("instance");
                    if (!confId) {
                        throw new Error("Can't handle cachable item that lacks a conference id...");
                    }
                }

                let cache = await Caches.get(confId);
                return cache.addItemToCache(result, relTableName);
            });
        }
        else {
            return this.parse.get(field as any).fetch().then((result: any) => {
                let constr = Cache.Constructors[relTableName as unknown as UncachedSchemaKeys];
                    // @ts-ignore - //TODO: Remove this ignore when an uncached table exists
                return new constr(result) as any;
            });
        }
    }
    // TODO: nonUniqueRelated
}

export type Base<K extends WholeSchemaKeys>
    = K extends CachedSchemaKeys ? CachedBase<K>
    : K extends UncachedSchemaKeys ? UncachedBase<K>
    : never;
