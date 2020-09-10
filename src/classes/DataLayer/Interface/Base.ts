import Parse from "parse";
import CachedSchema from "../CachedSchema";
import { NotPromisedFields, KnownKeys, PromisedFields } from "../../Util";
import * as Schema from "../Schema";
import Caches from "../Cache";
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

// TODO: What's the interface for stuff we aren't going to cache?
//       Ideally, it would be directly compatible with Base, so that if we ever
//       decide to start caching something, it will be an easy switch

export type CachedSchemaKeys = KnownKeys<CachedSchema>;
export type UncachedSchemaKeys = KnownKeys<UncachedSchema>;
export type WholeSchemaKeys = CachedSchemaKeys | UncachedSchemaKeys;

export type WholeSchema = CachedSchema | UncachedSchema;

export type FieldDataT<K extends WholeSchemaKeys, T extends IBase<K, T>>
    = NotPromisedFields<WholeSchema[K]["value"]> & Schema.Base;

export type RelatedDataT<K extends WholeSchemaKeys, T extends IBase<K, T>>
    = PromisedFields<WholeSchema[K]["value"]>;


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
        ? S extends IBase<infer K2, infer T2>
    ? Parse.Object<PromisesRemapped<WholeSchema[K2]["value"]>>
        : never
        : T[K]
    };

export interface StaticBase<K extends WholeSchemaKeys, T extends IBase<K, T>> {
    get(conferenceId: string, id: string): Promise<T | null>;
}

export interface StaticCachedBase<K extends CachedSchemaKeys, T extends CachedBase<K, T>> extends StaticBase<K, T> {
    // Must match the type of `CachedConstructor` below
    new(conferenceId: string,
        tableName: K,
        data: FieldDataT<K, T>,
        parse?: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null): T;
}

export type CachedConstructor<K extends CachedSchemaKeys, T extends CachedBase<K, T>>
    = new (
        conferenceId: string,
        tableName: K,
        data: FieldDataT<K, T>,
        parse?: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null) => CachedBase<K, T>;


export interface StaticUncachedBase<K extends UncachedSchemaKeys, T extends UncachedBase<K, T>> extends StaticBase<K, T> {
    // Must match the type of `UncachedConstructor` below
    new(conferenceId: string,
        tableName: K,
        parse: Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>): T;
}

export type UncachedConstructor<K extends UncachedSchemaKeys, T extends UncachedBase<K, T>>
    = new (
        conferenceId: string,
        tableName: K,
        parse: Parse.Object<PromisesRemapped<UncachedSchema[K]["value"]>>) => UncachedBase<K, T>;


/**
 * Provides a vanilla reusable implementation of the static base methods.
 */
export abstract class StaticBaseImpl {
    // static create
    //     <K extends GlobalSchemaKeys, T extends Base<K, T>>(
    //         conferenceId: string,
    //         data: SaveableDataT<K, T>,
    //         constr: Constructor<K, T>
    //     ): Promise<T | null> {
    //     throw new Error("Method not implemented");
    // }

    static async get<K extends WholeSchemaKeys, T extends IBase<K, T>>(
        tableName: K,
        conferenceId: string,
        id: string
    ): Promise<T | null> {
        // TODO: Write a test for this
        let cache = await Caches.get(conferenceId);
        return cache.get(tableName, id);
    }
}

export interface IBase<K extends WholeSchemaKeys, T extends IBase<K, T>> extends Schema.Base {
    // TODO: Define accessor functions, etc here first

    getUncachedParseObject(): Promise<Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>>;
}

/**
 * Provides the methods and properties common to all data objects (e.g. `id`).
 */
export abstract class CachedBase<K extends CachedSchemaKeys, T extends CachedBase<K, T>> implements IBase<K, T> {
    // Must match the type of `Constructor` above
    constructor(
        protected conferenceId: string,
        protected tableName: K,
        protected data: FieldDataT<K, T>,
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

    // TODO: Define stuff in the interface first
    // protected uniqueRelated<S extends keyof RelatedDataT<K, T>>(field: S): Promise<RelatedDataT<K, T>[S]> {
    //     // TODO: Utilise `parseObjectCreated` to init `this.parse`
    //     throw new Error("Method not implemented");
    // }
    // TODO: nonUniqueRelated
}

export abstract class UncachedBase<K extends UncachedSchemaKeys, T extends UncachedBase<K, T>> implements IBase<K, T> {
    constructor(
        protected conferenceId: string,
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
}

type CachableBase<K extends CachedSchemaKeys, T extends IBase<K, T>>
    = T extends CachedBase<K, infer T2>
    ? CachedBase<K, T>
    : never;

type UncachableBase<K extends UncachedSchemaKeys, T extends IBase<K, T>>
    = T extends UncachedBase<K, infer T2>
    ? UncachedBase<K, T>
    : never;

export type Base<K extends WholeSchemaKeys, T extends IBase<K, T>>
    = K extends CachedSchemaKeys ? CachableBase<K, T>
    : K extends UncachedSchemaKeys ? UncachableBase<K, T>
    : never;
