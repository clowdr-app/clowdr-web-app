import Parse from "parse";
import { keys } from "ts-transformer-keys";
import DebugLogger from "../../DebugLogger";
import CachedSchema, { SchemaVersion } from "../CachedSchema";
import * as Interface from "../Interface";
import * as Schema from "../Schema";
import { CachedBase, CachedSchemaKeys, CachedConstructor, PromisesRemapped, CachedStoreNames } from "../Interface/Base";
import { NotPromisedFields, NotPromisedKeys, PromisedNonArrayFields, PromisedArrayFields } from "../../Util";
import { IDBPDatabase, openDB, deleteDB, IDBPTransaction } from "idb";
import { OperationResult } from ".";

export default class Cache {
    readonly CachedConstructors: {
        // The 'any' can't be replaced here - it would require dependent types.
        [K in CachedSchemaKeys]: CachedConstructor<K, any>;
    } = {
            AttachmentType: Interface.AttachmentType
        };

    readonly Fields: {
        [K in CachedSchemaKeys]: Array<NotPromisedKeys<CachedSchema[K]["value"]>>;
    } = {
            AttachmentType: keys<NotPromisedFields<Schema.AttachmentType>>()
        };

    readonly UniqueRelations: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["indexes"]>;
    } = {
            AttachmentType: keys<PromisedNonArrayFields<Schema.AttachmentType>>()
        };

    readonly NonUniqueRelations: {
        [K in CachedSchemaKeys]: Array<keyof CachedSchema[K]["indexes"]>;
    } = {
            AttachmentType: keys<PromisedArrayFields<Schema.AttachmentType>>()
        };

    readonly KEY_PATH: "id" = "id";

    private dbPromise: Promise<IDBPDatabase<CachedSchema>> | null = null;
    private isInitialised: boolean = false;

    private logger: DebugLogger = new DebugLogger("Cache");

    constructor(
        public readonly conferenceId: string,
        // TODO: Disable debugging by default
        enableDebug: boolean = true) {
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
                return new Promise((resolve, reject) => {
                    this.logger.info("Opening database.");
                    this.dbPromise = openDB<CachedSchema>(this.DatabaseName, SchemaVersion, {
                        upgrade: this.upgrade.bind(this),
                        blocked: this.blocked.bind(this),
                        blocking: this.blocking.bind(this),
                        terminated: this.terminated.bind(this)
                    }).then((db) => {
                        this.isInitialised = true;

                        // TODO: Decide whether to clear the cache or not
                        // If clearing the cache, don't resolve until it's empty
                        // Else resolve early and download new data in the background

                        resolve();

                        return db;
                    }).catch(reason => {
                        this.logger.error("Could not open database", reason);
                        reject(reason);
                        return Promise.reject(reason);
                    });;
                });
            }
        }
        else {
            this.logger.info("Already initialised.");
        }
    }

    /**
     * Shuts down cache providers and closes the database connection.
     * 
     * TODO: Test this
     */
    private async closeConnection() {
        if (this.dbPromise) {
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

    private async createStore<Name extends CachedSchemaKeys>(t: IDBPTransaction<CachedSchema>, name: Name) {
        this.logger.info(`Creating store: ${name}`);

        let store = t.db.createObjectStore<Name>(name, {
            keyPath: this.KEY_PATH
        });

        let uniqueRels = this.UniqueRelations[name] as Array<keyof CachedSchema[Name]["indexes"]>;
        for (let rel of uniqueRels) {
            store.createIndex(rel, this.KEY_PATH, {
                unique: true,
                multiEntry: false
            });
        }

        let nonUniqueRels = this.NonUniqueRelations[name] as Array<keyof CachedSchema[Name]["indexes"]>;
        for (let rel of nonUniqueRels) {
            store.createIndex(rel, this.KEY_PATH, {
                unique: false,
                multiEntry: false
            });
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
        // @ts-ignore - `name` won't be in the schema anymore - by design!
        t.db.deleteObjectStore(name);
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
                // @ts-ignore - Yes, it's okay, we're deleting a key that's not
                //              supposed to be part of the item anyway!
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

    private async getFromCache<K extends CachedSchemaKeys, T extends CachedBase<K, T>>(
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

            // @ts-ignore - This is fine, TypeScript's type inference just isn't
            // quite good enough
            return new this.CachedConstructors[tableName](this.conferenceId, tableName, result);
        }
        else {
            this.logger.info("Cache miss", {
                conferenceId: this.conferenceId,
                tableName: tableName,
                id: id
            });

            return Promise.reject(`${id} is not present in ${tableName} cache for conference ${this.conferenceId}`);
        }
    }

    // private async relatedFromCache<
    //     K extends CachedCachedSchemaKeys,
    //     T extends Base<K, T>,
    //     F extends keyof RelatedDataT<K, T>
    // >(
    //     tableName: K,
    //     id: string,
    //     field: F
    // ): Promise<RelatedDataT<K, T>[F]> {
    //     if (!this.IsInitialised || !this.dbPromise) {
    //         return Promise.reject("Not initialised");
    //     }

    //     let db = await this.dbPromise;
    //     let result = await db.getAllFromIndex(
    //         tableName,
    //         field as unknown as keyof CachedSchema[K]["indexes"],
    //         id as any);
    //     return result as any;
    // }

    // TODO: create
    // TODO: getAll
    // TODO: uniqueRelated
    // TODO: nonUniqueRelated

    async get<K extends CachedSchemaKeys, T extends CachedBase<K, T>>(
        tableName: K,
        id: string
    ): Promise<T | null> {
        return this.getFromCache(tableName, id).catch(reason => {
            let query = new Parse.Query<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>>(tableName);
            return query.get(id).then(async parse => {
                // TODO: Test for `id` not being available via `get` function
                let schema: any = {
                    id: parse.id
                };
                for (let key of this.Fields[tableName]) {
                    if (key !== "id") {
                        // Yes this cast is safe
                        schema[key] = parse.get(key as any);
                    }
                }

                if (this.dbPromise) {
                    this.logger.info("Filling item", {
                        conferenceId: this.conferenceId,
                        tableName: tableName,
                        id: id,
                        value: schema
                    });

                    let db = await this.dbPromise;
                    await db.put(tableName, schema);
                }

                const constr = this.CachedConstructors[tableName];
                return new constr(this.conferenceId, schema, parse);
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

    // async related<
    //     K extends CachedSchemaKeys,
    //     T extends Base<K, T>,
    //     F extends keyof RelatedDataT<K, T>
    // >(
    //     tableName: K,
    //     id: string,
    //     field: F,
    //     parse: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>> | null = null,
    //     parseObjectCreated: ((obj: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>) => void) | null = null
    // ): Promise<RelatedDataT<K, T>[F] | null> {
    //     return this.relatedFromCache<K, T, F>(tableName, id, field).catch(async reason => {
    //         if (parse) {
    //         }
    //         else {
    //             let query = new Parse.Query<Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>>(tableName);
    //             parse = await query.get(id);
    //         }

    //         return null;
    //     });
    // }
}
