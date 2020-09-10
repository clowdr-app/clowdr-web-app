import Parse from "parse";
import { keys } from "ts-transformer-keys";
import DebugLogger from "../../DebugLogger";
import CachedSchema, { SchemaVersion } from "../CachedSchema";
import * as Interface from "../Interface";
import * as Schema from "../Schema";
import {
    CachedBase, CachedSchemaKeys, PromisesRemapped, CachedStoreNames,
    RelatedDataT, UncachedSchemaKeys, WholeSchemaKeys, WholeSchema,
    RelationsToTableNames, RelationsToTableNamesT, FieldDataT, Constructor
} from "../Interface/Base";
import { PromisedNonArrayFields, PromisedArrayFields, PromisedFields } from "../../Util";
import { IDBPDatabase, openDB, deleteDB, IDBPTransaction } from "idb";
import { OperationResult } from ".";
import assert from "assert";

export default class Cache {
    // The 'any' can't be replaced here - it would require dependent types.
    /**
     * Do not use directly - use `Cache.Constructors` instead.
     * 
     * This variable is the memoized object. It is necessary to generate the
     * object after the page has initialized otherwise the fields will be set
     * to `undefined`.
     */
    private static constructors:
        {
            [K in WholeSchemaKeys]: Constructor<K>;
        } | null = null;
    /**
     * Constructors of both cached and uncached tables.
     */
    static get Constructors() {
        if (!Cache.constructors) {
            Cache.constructors = {
                AttachmentType: Interface.AttachmentType,
                ProgramPerson: Interface.ProgramPerson,
                ProgramItem: Interface.ProgramItem,
                ProgramTrack: Interface.ProgramTrack,
                ClowdrInstance: Interface.Conference,
                PrivilegedInstanceDetails: Interface.PrivilegedInstanceDetails
            };
        }
        return Cache.constructors;
    }

    /**
     * All fields including related fields.
     */
    readonly Fields: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["value"]>;
    } = {
            AttachmentType: keys<Schema.AttachmentType>(),
            ProgramPerson: keys<Schema.ProgramPerson>(),
            ProgramItem: keys<Schema.ProgramItem>(),
            ProgramTrack: keys<Schema.ProgramTrack>(),
        };

    /**
     * All relations including to uncached tables.
     */
    readonly Relations: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["indexes"]>;
    } = {
            AttachmentType: keys<PromisedFields<Schema.AttachmentType>>(),
            ProgramPerson: keys<PromisedFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedFields<Schema.ProgramTrack>>(),
        };

    /**
     * All relations to unique items including to uncached tables.
     */
    readonly UniqueRelations: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["indexes"]>;
    } = {
            AttachmentType: keys<PromisedNonArrayFields<Schema.AttachmentType>>(),
            ProgramPerson: keys<PromisedNonArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedNonArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedNonArrayFields<Schema.ProgramTrack>>(),
        };

    /**
     * All relations to non-unique items including to uncached tables.
     */
    readonly NonUniqueRelations: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["indexes"]>;
    } = {
            AttachmentType: keys<PromisedArrayFields<Schema.AttachmentType>>(),
            ProgramPerson: keys<PromisedArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedArrayFields<Schema.ProgramTrack>>(),
        };

    readonly KEY_PATH: "id" = "id";

    private dbPromise: Promise<IDBPDatabase<CachedSchema>> | null = null;
    private conference: Promise<Parse.Object<PromisesRemapped<Schema.Conference>>> | null = null;

    private isInitialised: boolean = false;

    private logger: DebugLogger = new DebugLogger("Cache");

    constructor(
        public readonly conferenceId: string,
        enableDebug: boolean = false) {
        if (enableDebug) {
            this.logger.enable();
        }
        else {
            this.logger.disable();
        }
    }

    get IsDebugEnabled(): boolean {
        return this.logger.isEnabled;
    }

    set IsDebugEnabled(value: boolean) {
        if (value !== this.logger.isEnabled) {
            if (value) {
                this.logger.enable();
            }
            else {
                this.logger.disable();
            }
        }
    }

    get IsInitialised(): boolean {
        return this.isInitialised;
    }

    get DatabaseName(): string {
        return `clowdr-${this.conferenceId}`;
    }

    /**
     * Initialises the cache.
     * 
     * TODO: Extend tests for this, including the internal database upgrade stuff
     */
    async initialise(): Promise<void> {
        if (!this.isInitialised) {
            if (!this.dbPromise) {
                this.logger.info("Opening database.");
                this.conference = new Promise((resolve, reject) => {
                    this.dbPromise = openDB<CachedSchema>(this.DatabaseName, SchemaVersion, {
                        upgrade: this.upgrade.bind(this),
                        blocked: this.blocked.bind(this),
                        blocking: this.blocking.bind(this),
                        terminated: this.terminated.bind(this)
                    });

                    if (!this.isInitialised) {
                        this.isInitialised = true;

                        this.dbPromise.then(async db => {
                            let conf = await new Parse.Query<Parse.Object<PromisesRemapped<Schema.Conference>>>("ClowdrInstance").get(this.conferenceId) || null;
                            if (!conf) {
                                reject(`Conference ${this.conferenceId} could not be loaded.`);
                                throw new Error(`Conference ${this.conferenceId} could not be loaded.`);
                            }
                            resolve(conf);

                            // TODO: Decide whether to clear the cache or not
                            // If clearing the cache, don't resolve until it's empty
                            // Else resolve early and download new data in the background

                            await Promise.all(CachedStoreNames.map(store => {
                                return this.fillCache(store, db);
                            }));

                            // TODO: Subscribe to live queries
                        });
                    }
                });
            }
        }
        else {
            this.logger.info("Already initialised.");
        }
    }

    private async fillCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        db: IDBPDatabase<CachedSchema> | null = null
    ): Promise<Array<T>> {
        if (!this.IsInitialised || !this.dbPromise || !this.conference) {
            return Promise.reject("Not initialised");
        }

        let itemsQ = await this.newParseQuery(tableName);
        return itemsQ.map(parse => {
            return this.addItemToCache<K, T>(parse, tableName, db);
        });
    }

    async addItemToCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        parse: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>,
        tableName: K,
        _db: IDBPDatabase<CachedSchema> | null = null
    ): Promise<T> {
        // TODO: Test for `id` not being available via `get` function
        let schema: any = {
            id: parse.id
        };
        for (let _key of this.Fields[tableName]) {
            let key = _key as keyof (FieldDataT[K] | RelatedDataT[K]);
            if (key !== "id") {
                // Yes these casts are safe

                if (this.Relations[tableName].includes(key as any)) {
                    let key2 = key as keyof RelationsToTableNamesT[K];
                    // Exclude uncached relations data
                    if (CachedStoreNames.includes(RelationsToTableNames[tableName][key2] as any)) {
                        if (this.UniqueRelations[tableName].includes(key as any)) {
                            schema[key] = parse.get(key as any).id;
                        }
                        else {
                            schema[key] = parse.get(key as any).map((x: any) => x.id);
                        }
                    }
                }
                else {
                    schema[key] = parse.get(key as any);
                }
            }
        }

        if (_db) {
            this.logger.info("Filling item", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: parse.id,
                value: schema
            });
            await _db.put(tableName, schema);
        }
        else if (this.dbPromise) {
            this.logger.info("Filling item", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: parse.id,
                value: schema
            });

            let db = await this.dbPromise;
            await db.put(tableName, schema);
        }

        const constr = Cache.Constructors[tableName];
        return new constr(this.conferenceId, schema, parse as any) as unknown as T;
    }

    /**
     * Shuts down cache providers and closes the database connection.
     * 
     * TODO: Test this
     */
    private async closeConnection() {
        if (this.dbPromise) {
            this.conference = null;

            this.logger.warn("Shutting down providers not implemented.");
            // TODO: Shutdown live queries

            this.logger.info("Closing connection to database.");
            const db = await this.dbPromise;
            db.close();
        }

        this.isInitialised = false;
    }

    /**
     * Deletes the underlying IndexedDB database.
     *
     * @param retryDelay Optional. Number of milliseconds to wait before
     * reattepting to delete the database.
     *
     * @returns Success if the database was deleted.
     *
     * All other connections to the database (including in other tabs) must be
     * closed before the database can be deleted. After the first attempt, this
     * function will wait to give other connections time to close, followed by
     * one re-attempt.
     * 
     * TODO: Test this
     */
    public async deleteDatabase(
        reload: boolean = false,
        retryDelay: number = 5000
    ): Promise<OperationResult> {
        let result = OperationResult.Success;

        this.logger.info("Deleting database...");

        await this.closeConnection();

        // Define a local function for attempting to delete the database
        const attemptDeletion = () => deleteDB(this.DatabaseName, {
            blocked: () => {
                result = OperationResult.Fail;
                this.logger.info(`Initial attempt to delete database (${this.DatabaseName}) failed because the operation is blocked by another open connection.`);
            }
        });

        // First attempt to delete the database
        this.logger.info("Commencing first attempt to delete database.");
        await attemptDeletion();

        if (result !== OperationResult.Success) {
            this.logger.info("Commencing second attempt to delete database.");

            // The database couldn't be deleted because there are open
            // connections to it.

            // Wait some time for the connections to close
            await new Promise((resolve) => setTimeout(async () => {
                result = OperationResult.Success;

                // Re-attempt to delete the database
                await attemptDeletion();

                if (result === OperationResult.Success) {
                    this.logger.info("Second attempt to delete database was successful.");
                }
                else {
                    this.logger.error("Second attempt to delete database failed!");
                }

                resolve();
            }, retryDelay));
        }
        else {
            this.logger.info("First attempt to delete database was successful.");
        }

        if (reload && result === OperationResult.Success) {
            window.location.reload();
        }

        return result;
    }

    private async createStore<K extends CachedSchemaKeys>(t: IDBPTransaction<CachedSchema>, name: K) {
        this.logger.info(`Creating store: ${name}`);

        let store = t.db.createObjectStore<K>(name, {
            keyPath: this.KEY_PATH
        });

        let uniqueRels = this.UniqueRelations[name] as Array<keyof CachedSchema[K]["indexes"]>;
        for (let rel of uniqueRels) {
            if (CachedStoreNames.includes(RelationsToTableNames[name][rel as keyof RelationsToTableNamesT[K]] as any)) {
                store.createIndex(rel, this.KEY_PATH, {
                    unique: true,
                    multiEntry: false
                });
            }
        }

        let nonUniqueRels = this.NonUniqueRelations[name] as Array<keyof CachedSchema[K]["indexes"]>;
        for (let rel of nonUniqueRels) {
            if (CachedStoreNames.includes(RelationsToTableNames[name][rel as keyof RelationsToTableNamesT[K]] as any)) {
                store.createIndex(rel, this.KEY_PATH, {
                    unique: false,
                    multiEntry: false
                });
            }
        }
    }

    private async upgradeStore(t: IDBPTransaction<CachedSchema>, name: CachedSchemaKeys) {
        this.logger.info(`Upgrading store: ${name}`);

        let items = await t.objectStore(name).getAll();
        for (let item of items) {
            this.upgradeItem(t, name, item);
        }
    }

    private async deleteStore(t: IDBPTransaction<CachedSchema>, name: string) {
        this.logger.info(`Deleting store: ${name}`);
        t.db.deleteObjectStore(name as any);
    }

    private async upgradeItem<K extends CachedSchemaKeys>(
        t: IDBPTransaction<CachedSchema>,
        name: K,
        item: CachedSchema[K]["value"]): Promise<void> {
        let StoreFieldNames = this.Fields[name] as Array<string>;
        let updatedItem = { ...item };
        let edited = false;
        for (let key in item) {
            if (!StoreFieldNames.includes(key)) {
                delete updatedItem[key];
                edited = true;
            }
        }
        if (edited) {
            await t.objectStore(name).put(updatedItem);
        }
    }

    /**
     * Called if this version of the database has never been opened before. Use
     * it to specify the schema for the database.
     * @param database A database instance that you can use to add/remove stores
     * and indexes.
     * @param oldVersion Last version of the database opened by the user.
     * @param newVersion Whatever new version you provided.
     * @param transaction The transaction for this upgrade. This is useful if
     * you need to get data from other stores as part of a migration.
     */
    private async upgrade(
        db: IDBPDatabase<CachedSchema>,
        oldVersion: number,
        newVersion: number,
        transaction: IDBPTransaction<CachedSchema>
    ): Promise<void> {
        if (oldVersion === 0) {
            this.logger.info(`Creating cache database at version ${newVersion}.`);
        }
        else {
            this.logger.info(`Database upgrade from version ${oldVersion} to ${newVersion}.`);
        }

        transaction.done.catch((reason) => {
            this.logger.error("Database upgrade transaction rejected - not implemented.", reason);
        });

        let toUpgrade: Array<CachedSchemaKeys> = [];
        let toCreate: Array<CachedSchemaKeys> = [];
        let toDelete: Array<string> = [];
        let existingStoreNames: Array<CachedSchemaKeys> = [...db.objectStoreNames];

        // Gather stores to upgrade or delete
        for (let storeName of existingStoreNames) {
            if (CachedStoreNames.includes(storeName)) {
                toUpgrade.push(storeName);
            }
            else {
                toDelete.push(storeName);
            }
        }

        // Gather stores to create
        for (let storeName of CachedStoreNames) {
            if (!existingStoreNames.includes(storeName)) {
                toCreate.push(storeName);
            }
        }

        this.logger.info("Store changes", {
            toCreate: toCreate,
            toUpgrade: toUpgrade,
            toDelete: toDelete
        });

        for (let storeName of toDelete) {
            await this.deleteStore(transaction, storeName);
        }

        for (let storeName of toCreate) {
            this.createStore(transaction, storeName);
        }

        for (let storeName of toUpgrade) {
            this.upgradeStore(transaction, storeName);
        }

        return transaction.done;
    }

    /**
     * Called if there are older versions of the database open on the origin, so
     * this version cannot open.
     */
    private async blocked(): Promise<void> {
        // TODO
        this.logger.error("Database blocked alert - not implemented.");
    }

    /**
     * Called if this connection is blocking a future version of the database
     * from opening.
     */
    private async blocking(): Promise<void> {
        // TODO
        this.logger.error("Database blocking alert - not implemented.");
        if (this.IsDebugEnabled) {
            this.logger.warn("Debug enabled. Closing cache connection.");
            this.closeConnection();
        }
    }

    /**
     * Called if the browser abnormally terminates the connection. This is not
     * called when db.close() is called.
     */
    private async terminated(): Promise<void> {
        // TODO
        this.logger.error("Database terminated alert - not implemented.");
        // TODO: Terminate live queries
        // TODO: Alert user?
    }

    private async getFromCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        id: string
    ): Promise<T> {
        if (!this.IsInitialised || !this.dbPromise) {
            return Promise.reject("Not initialised");
        }

        let db = await this.dbPromise;
        let result = await db.get(tableName, id);
        if (result) {
            this.logger.info("Cache hit", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: id
            });

            return new Cache.Constructors[tableName](this.conferenceId, result as any) as unknown as T;
        }
        else {
            this.logger.info("Cache miss", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: id
            });

            throw new Error(`${id} is not present in ${tableName} cache for conference ${this.conferenceId}`);
        }
    }

    private async getAllFromCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K
    ): Promise<Array<T>> {
        if (!this.IsInitialised || !this.dbPromise) {
            return Promise.reject("Not initialised");
        }

        let db = await this.dbPromise;
        let result = await db.getAll(tableName);
        if (result.length !== 0) {
            this.logger.info("Cache get-all hit", {
                conferenceId: this.conferenceId,
                tableName: tableName
            });

            return result.map(x => {
                return new Cache.Constructors[tableName](this.conferenceId, x as any) as unknown as T;
            });
        }
        else {
            this.logger.info("Cache get-all miss", {
                conferenceId: this.conferenceId,
                tableName: tableName
            });

            return this.fillCache(tableName);
        }
    }

    private async uniqueRelatedFromCache<
        K extends CachedSchemaKeys,
        S extends keyof RelatedDataT[K]>(
            tableName: K,
            field: S,
            id: string
        ): Promise<RelatedDataT[K][S]> {
        if (!this.IsInitialised || !this.dbPromise) {
            return Promise.reject("Not initialised");
        }

        let db = await this.dbPromise;
        let result = await db.getFromIndex(
            tableName,
            field as keyof CachedSchema[K]["indexes"],
            id as any)
            || null;
        if (result) {
            this.logger.info("Cache unique relation hit", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: id,
                field: field
            });

            const relationTableNames = RelationsToTableNames[tableName];
            // @ts-ignore
            const relationTableName: WholeSchemaKeys = relationTableNames[field];
            // It cannot be a cached schema key - it's an uncached relation
            const constr = Cache.Constructors[relationTableName as CachedSchemaKeys];
            return new constr(this.conferenceId, result as any) as unknown as RelatedDataT[K][S];
        }
        else {
            this.logger.info("Cache unique relation miss", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: id,
                field: field
            });

            throw new Error(`Target of ${field} for ${id} is not present in ${tableName} cache for conference ${this.conferenceId}`);
        }
    }

    // TODO: create
    // TODO: nonUniqueRelated

    private async newParseQuery<K extends CachedSchemaKeys>(tableName: K) {
        let query = new Parse.Query<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>>(tableName);
        assert(this.isInitialised);
        assert(this.conference);
        let conf = (await this.conference) as any;
        query.equalTo("conference", conf);
        return query;
    }

    async get<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        id: string
    ): Promise<T | null> {
        return this.getFromCache(tableName, id).catch(async reason => {
            let query = await this.newParseQuery(tableName);
            return query.get(id).then(async parse => {
                return await this.addItemToCache<K, T>(parse, tableName);
            }).catch(reason => {
                this.logger.warn("Fetch from database of cached item failed", {
                    conferenceId: this.conferenceId,
                    tableName: tableName,
                    id: id,
                    reason: reason
                });

                return null;
            });
        }) as Promise<T | null>;
    }

    async getAll<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K
    ): Promise<Array<T>> {
        return this.getAllFromCache(tableName).catch(async reason => {
            let query = await this.newParseQuery(tableName);
            return query.map(async parse => {
                return await this.addItemToCache<K, T>(parse, tableName);
            }).catch(reason => {
                this.logger.warn("Fetch from database of all cached items failed", {
                    conferenceId: this.conferenceId,
                    tableName: tableName,
                    reason: reason
                });

                return [];
            });
        }) as Promise<Array<T>>;
    }

    async uniqueRelated<
        K extends CachedSchemaKeys,
        S extends keyof RelatedDataT[K]>(
            tableName: K,
            field: S,
            id: string,
            parse: Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>> | null = null,
            parseObjectCreated: ((obj: Parse.Object<PromisesRemapped<WholeSchema[K]["value"]>>) => void) | null = null
        ): Promise<RelatedDataT[K][S]> {
        if (CachedStoreNames.includes(RelationsToTableNames[tableName][field as keyof RelationsToTableNamesT[K]] as any)) {
            return this.uniqueRelatedFromCache<K, S>(tableName, field, id).catch(async _ => {
                let query = await this.newParseQuery(tableName);
                let obj = await query.get(id);
                return obj.get(field as any).then(async (parse: any) => {
                    return await this.addItemToCache(parse, tableName as any) as unknown as RelatedDataT[K][S];
                }).catch((reason: any) => {
                    this.logger.warn("Fetch from database of cached unique related item failed", {
                        conferenceId: this.conferenceId,
                        tableName: tableName,
                        id: id,
                        reason: reason
                    });

                    throw new Error("Fetch from database of cached unique related item failed");
                });
            });
        }
        else {
            if (!parse) {
                let query = await this.newParseQuery(tableName);
                parse = await query.get(id);
                if (parseObjectCreated) {
                    parseObjectCreated(parse);
                }
            }

            let result = parse.get(field as any);

            const relationTableNames = RelationsToTableNames[tableName];
            // @ts-ignore
            const relationTableName: WholeSchemaKeys = relationTableNames[field];
            // It cannot be a cached schema key - it's an uncached relation
            const constr = Cache.Constructors[relationTableName as UncachedSchemaKeys];
            return new constr(result as any) as unknown as RelatedDataT[K][S];
        }
    }
}
