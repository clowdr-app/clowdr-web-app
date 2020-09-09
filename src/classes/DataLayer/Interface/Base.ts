import CachedSchema from "../CachedSchema";
import { NotPromisedFields, KnownKeys } from "../../Util";
import * as Schema from "../Schema";

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

type CachedSchemaKeys = KnownKeys<CachedSchema>;

type SaveableDataT<K extends CachedSchemaKeys, T extends Base<K, T>>
    = NotPromisedFields<CachedSchema[K]["value"]> & Schema.Base;

/**
 * Defines the statically accessible interface to all data-layer objects.
 * 
 * The intention is the be used via their concrete classes, such as 
 * `User.get`.
 */
export interface StaticBase<K extends CachedSchemaKeys, T extends Base<K, T>> {
    // Must match the type of `Constructor` below
    new(conferenceId: string,
        data: SaveableDataT<K, T>,
        parse?: Parse.Object<CachedSchema[K]["value"]> | null): T;

    get(conferenceId: string, id: string): Promise<T | null>;

    // TODO: create(conferenceId: string, data: SaveableDataT<K, T>): Promise<T | null>;
}

type Constructor<K extends CachedSchemaKeys, T extends Base<K, T>>
    = new (conferenceId: string,
        data: SaveableDataT<K, T>,
        parse?: Parse.Object<CachedSchema[K]["value"]> | null) => Base<K, T>;

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

    static get<K extends CachedSchemaKeys, T extends Base<K, T>>(
        tableName: K,
        conferenceId: string,
        id: string
    ): Promise<T | null> {
        // TODO: Call into Caches
        throw new Error("Method not implemented");
    }
}

/**
 * Provides the methods and properties common to all data objects (e.g. `id`).
 */
export abstract class Base<K extends CachedSchemaKeys, T extends Base<K, T>> {
    // Must match the type of `Constructor` above
    constructor(
        protected conferenceId: string,
        protected data: SaveableDataT<K, T>,
        protected parse: Parse.Object<CachedSchema[K]["value"]> | null = null) {
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
}
