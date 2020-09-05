import Parse from 'parse';
import { openDB, deleteDB, IDBPDatabase, IDBPTransaction, StoreNames, IDBPObjectStore } from 'idb';
import { OperationResult } from './OperationResult';
import IDBSchema, { SchemaVersion, IDBSchemaUnion, IDBStoreSpecs, IDBStoreNames } from './Schema';
import DebugLogger from './DebugLogger';
import { ClowdrInstance } from '../ParseObjects';

export enum SubscriptionEvent {
    Fetched,
    Created,
    Updated,
    Deleted
}

export type SubscriberCallback = (event: SubscriptionEvent, ids: Array<string>) => Promise<void>;

export default class ClowdrCache {
    private dbPromise: Promise<IDBPDatabase<IDBSchema>> | null;
    private logger: DebugLogger = new DebugLogger("Cache");

    // Note: Don't change this - it matches MongoDB
    private readonly KEY_PATH = "id";

    // TODO: Test multi-tab interaction

    constructor(
        public readonly conferenceId: string,
        // TODO: Disable debug by default
        enableDebug: boolean = true
    ) {
        this.debugModeActive = enableDebug;

        this.logger.info("Opening database.");
        this.dbPromise = openDB<IDBSchema>(this.databaseName, SchemaVersion, {
            upgrade: this.upgrade.bind(this),
            blocked: this.blocked.bind(this),
            blocking: this.blocking.bind(this),
            terminated: this.terminated.bind(this)
        });
    }

    get databaseName(): string {
        return `clowdr-${this.conferenceId}`;
    }

    /**
     * True if the cache is running in debug mode.
     */
    get debugModeActive(): boolean {
        return this.logger.isEnabled;
    }

    set debugModeActive(value: boolean) {
        if (value) {
            this.logger.enable();
            // @ts-ignore - A small hack for debugging purposes.
            window.clowdrCache = this;
            this.logger.info("Debug mode enabled.");
        }
        else {
            this.logger.info("Disabling debug mode.");
            // @ts-ignore - A small hack for debugging purposes.
            delete window.clowdrCache;
            this.logger.disable();
        }
    }

    /**
     * Shuts down cache providers and closes the database connection.
     */
    private async closeConnection() {
        if (this.dbPromise) {
            this.logger.warn("Shutting down providers not implemented.");
            // TODO: Shutdown live queries

            this.logger.info("Closing connection to database.");
            const db = await this.dbPromise;
            db.close();
        }
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
     */
    public async deleteDatabase(
        reload: boolean = false,
        retryDelay: number = 5000
    ): Promise<OperationResult> {
        let result = OperationResult.Success;

        this.logger.info("Deleting database...");

        await this.closeConnection();

        // Define a local function for attempting to delete the database
        const attemptDeletion = () => deleteDB(this.databaseName, {
            blocked: () => {
                result = OperationResult.Fail;
                this.logger.info(`Initial attempt to delete database (${this.databaseName}) failed because the operation is blocked by another open connection.`);
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


    private async createStore(db: IDBPDatabase<IDBSchema>, name: StoreNames<IDBSchema>) {
        this.logger.info(`Creating store: ${name}`);

        db.createObjectStore(name, {
            keyPath: this.KEY_PATH
        });
        // TODO: What indexes do we need to create?
        //       How do we safely specify them?
    }

    private async upgradeStore(db: IDBPDatabase<IDBSchema>, name: StoreNames<IDBSchema>) {
        this.logger.info(`Upgrading store: ${name}`);

        let items = await db.getAll(name);
        for (let item of items) {
            this.upgradeItem(db, name, item);
        }
    }

    private async deleteStore(db: IDBPDatabase<IDBSchema>, name: string) {
        this.logger.info(`Deleting store: ${name}`);
        // @ts-ignore - `name` won't be in the schema anymore - by design!
        db.deleteObjectStore(name);
    }

    private async upgradeItem(
        db: IDBPDatabase<IDBSchema>,
        name: StoreNames<IDBSchema>,
        item: IDBSchemaUnion): Promise<void> {
        let StoreFieldNames = IDBStoreSpecs[name];
        let updatedItem = { ...item };
        let edited = false;
        for (let key in item) {
            if (StoreFieldNames.indexOf(key) === -1) {
                // @ts-ignore - Yes, it's okay, we're deleting a key that's not
                //              supposed to be part of the item anyway!
                delete updatedItem[key];
                edited = true;
            }
        }
        if (edited) {
            await db.put(name, updatedItem);
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
        db: IDBPDatabase<IDBSchema>,
        oldVersion: number,
        newVersion: number,
        transaction: IDBPTransaction<IDBSchema>
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

        let toUpgrade: Array<StoreNames<IDBSchema>> = [];
        let toCreate: Array<StoreNames<IDBSchema>> = [];
        let toDelete: Array<string> = [];
        let existingStoreNames: Array<StoreNames<IDBSchema>> = [...db.objectStoreNames];

        // Gather stores to upgrade or delete
        for (let storeName of existingStoreNames) {
            if (IDBStoreNames.indexOf(storeName) > -1) {
                toUpgrade.push(storeName);
            }
            else {
                toDelete.push(storeName);
            }
        }

        // Gather stores to create
        for (let storeName of IDBStoreNames) {
            if (existingStoreNames.indexOf(storeName) === -1) {
                toCreate.push(storeName);
            }
        }

        this.logger.info("Store changes", {
            toCreate: toCreate,
            toUpgrade: toUpgrade,
            toDelete: toDelete
        });

        for (let storeName of toDelete) {
            await this.deleteStore(db, storeName);
        }

        for (let storeName of toCreate) {
            this.createStore(db, storeName);
        }

        for (let storeName of toUpgrade) {
            this.upgradeStore(db, storeName);
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

    private subscribers: { [k in StoreNames<IDBSchema>]?: {
        callbackIds: string[];
        callbacks: { [k: string]: SubscriberCallback };
    } } = {};

    public subscribe(name: StoreNames<IDBSchema>, callbackId: string, callback: SubscriberCallback) {
        callbackId = "callback_" + callbackId;

        let obj = this.subscribers[name];
        if (!obj) {
            this.subscribers[name] = obj = {
                callbackIds: [],
                callbacks: {}
            };
        }

        obj.callbackIds.push(callbackId);
        obj.callbacks[callbackId] = callback;
    }

    public unsubscribe(name: StoreNames<IDBSchema>, callbackId: string) {
        callbackId = "callback_" + callbackId;

        let obj = this.subscribers[name];
        if (obj) {
            let idx = obj.callbackIds.indexOf(callbackId);
            if (idx > -1) {
                delete obj.callbacks[callbackId];
                obj.callbackIds = obj.callbackIds.splice(idx, 1);
            }
        }
    }

    private liveQueries: Partial<Record<StoreNames<IDBSchema>, Parse.LiveQuerySubscription>> = {};

    public async initialiseConferenceCache(
        parseLive: Parse.LiveQueryClient
    ): Promise<void> {
        for (let name of IDBStoreNames) {
            this.initialiseStore(name, parseLive);
        }
    }

    private updateData(
        name: StoreNames<IDBSchema>,
        item: Parse.Object,
        store: IDBPObjectStore<IDBSchema, any>
    ) {
        let itemToStore: any = {};
        for (let key of IDBStoreSpecs[name]) {
            if (key === "id") {
                itemToStore.id = item.id;
            }
            else {
                itemToStore[key] = item.get(key) || null;
            }
        }
        store.put(itemToStore);
    }

    notifySubscribers(name: StoreNames<IDBSchema>, event: SubscriptionEvent, ids: Array<string>) {
        let obj = this.subscribers[name];
        if (obj) {
            for (let id of obj.callbackIds) {
                obj.callbacks[id](event, ids);
            }
        }
    }

    private async liveQueryCreate(name: StoreNames<IDBSchema>, item: Parse.Object) {
        let db = await this.dbPromise;
        if (!db) {
            this.logger.warn(`Received new live query data for ${name} but cache is not connected.`);
            return;
        }
        let transaction = db.transaction(name, "readwrite");
        this.updateData(name, item, transaction.store);
        await transaction.done.catch((reason) => {
            this.logger.error(`Failed to save new ${name} live query item to the cache!`, reason);
        });

        this.notifySubscribers(name, SubscriptionEvent.Created, [item.id]);
    }

    private async liveQueryUpdate(name: StoreNames<IDBSchema>, item: Parse.Object) {
        // TODO: Do we really want to be caching all attachments?
        // if ("attachments" in obj &&
        //     obj.attachments.length > 0) {
        //     await Parse.Object.fetchAllIfNeeded(obj.attachments);
        // }

        let db = await this.dbPromise;
        if (!db) {
            this.logger.warn(`Received new live query data for ${name} but cache is not connected.`);
            return;
        }
        let transaction = db.transaction(name, "readwrite");
        this.updateData(name, item, transaction.store);
        await transaction.done.catch((reason) => {
            this.logger.error(`Failed to save new ${name} live query item to the cache!`, reason);
        });

        this.notifySubscribers(name, SubscriptionEvent.Updated, [item.id]);
    }

    private async liveQueryDelete(name: StoreNames<IDBSchema>, item: Parse.Object) {
        let db = await this.dbPromise;
        if (!db) {
            this.logger.warn(`Received deleted live query data for ${name} but cache is not connected.`);
            return;
        }
        let transaction = db.transaction(name, "readwrite");
        transaction.store.delete(item.id);
        await transaction.done.catch((reason) => {
            this.logger.error(`Failed to delete ${name} live query item from the cache!`, reason);
        });

        this.notifySubscribers(name, SubscriptionEvent.Deleted, [item.id]);
    }

    private async initialiseStore(
        name: StoreNames<IDBSchema>,
        parseLive: Parse.LiveQueryClient
    ): Promise<void> {
        if (this.liveQueries[name]) {
            this.liveQueries[name]?.unsubscribe();
            delete this.liveQueries[name];
        }

        let conferencesQuery = new Parse.Query<ClowdrInstance>("ClowdrInstance");
        conferencesQuery.get(this.conferenceId);
        let query = new Parse.Query(name);
        query.matchesKeyInQuery("conference.id", "id", conferencesQuery);
        query.limit(10000);

        // TODO: Determine if the data is so stale that it should be fully deleted
        // TODO: Determine if the data actually needs fetching (i.e. 'isn't too stale')
        // TODO: For partially stale data, fetch only stuff updated since the last full update

        let initialFetchPromise = query.find().then(async (data) => {
            this.logger.info(`Fetched ${name}, received ${data.length} items.`, data);

            if (!this.dbPromise) {
                this.logger.warn(`dbPromise was null when fetch data query completed for ${name}.`);
                return;
            }

            let db = await this.dbPromise;
            let transaction = db.transaction(name, "readwrite");

            for (let item of data) {
                this.updateData(name, item, transaction.store);
            }

            await transaction.done.catch((reason) => {
                this.logger.error(`Failed to save ${name} items to the cache!`, reason);
            });

            this.logger.info(`Saved ${name} items to cache.`);

            this.notifySubscribers(name, SubscriptionEvent.Fetched, data.map((x) => x.id));
        }).catch((reason) => {
            this.logger.error(`Failed to save ${name} items to the cache!`, reason);
        });

        let sub = parseLive.subscribe(query);
        sub.on("create", this.liveQueryCreate.bind(this, name));
        sub.on("delete", this.liveQueryDelete.bind(this, name));
        sub.on("update", this.liveQueryUpdate.bind(this, name));
        this.liveQueries[name] = sub;

        await initialFetchPromise;
    }

    public async get<K extends StoreNames<IDBSchema>>(name: K, id: string): Promise<IDBSchema[K]["value"] | undefined> {
        let db = await this.dbPromise;
        if (!db) {
            let msg = `Attempted to get all items of ${name} but the cache is not connected.`;
            this.logger.error(msg);
            throw new Error(msg);
        }
        return await db.get(name, id);
    }

    public async getAll<K extends StoreNames<IDBSchema>>(name: K): Promise<Array<IDBSchema[K]["value"]>> {
        let db = await this.dbPromise;
        if (!db) {
            let msg = `Attempted to get all items of ${name} but the cache is not connected.`;
            this.logger.error(msg);
            throw new Error(msg);
        }
        return await db.getAll(name);
    }
}
