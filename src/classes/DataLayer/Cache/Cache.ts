import Parse, { LiveQueryClient, LiveQuerySubscription } from "parse";
import { keys } from "ts-transformer-keys";
import DebugLogger from "../../DebugLogger";
import CachedSchema, { SchemaVersion } from "../CachedSchema";
import { CachedSchemaKeys, PromisesRemapped, RelationsToTableNames, WholeSchemaKeys } from "../WholeSchema";
import * as Interface from "../Interface";
import * as Schema from "../Schema";
import { CachedBase, CachedStoreNames, LocalDataT, Constructor } from "../Interface/Base";
import { PromisedNonArrayFields, PromisedArrayFields, PromisedFields, KnownKeys } from "../../Util";
import { IDBPDatabase, openDB, deleteDB, IDBPTransaction } from "idb";
import { OperationResult } from ".";
import assert from "assert";
import { ISimpleEvent, SimpleEventDispatcher } from "strongly-typed-events";

type ExtendedCachedSchema
    = CachedSchema
    & {
        LocalRefillTimes: {
            key: string;
            value: {
                // Must be called `id` to work with the current implementation
                // of createStore
                id: CachedSchemaKeys,
                lastRefillAt: Date
            }
        }
    };

type ExtendedCachedSchemaKeys = KnownKeys<ExtendedCachedSchema>;

export type DataUpdatedEventDetails<K extends CachedSchemaKeys> = {
    table: K;
    object: CachedBase<K>;
};

export type DataDeletedEventDetails<K extends CachedSchemaKeys> = {
    table: K;
    objectId: string;
};

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
                ConferenceConfiguration: Interface.ConferenceConfiguration,
                Conference: Interface.Conference,
                Flair: Interface.Flair,
                PrivilegedConferenceDetails: Interface.PrivilegedConferenceDetails,
                ProgramItem: Interface.ProgramItem,
                ProgramItemAttachment: Interface.ProgramItemAttachment,
                ProgramPerson: Interface.ProgramPerson,
                ProgramRoom: Interface.ProgramRoom,
                ProgramSession: Interface.ProgramSession,
                ProgramSessionEvent: Interface.ProgramSessionEvent,
                ProgramTrack: Interface.ProgramTrack,
                Registration: Interface.Registration,
                _Role: Interface._Role,
                TextChat: Interface.TextChat,
                TextChatMessage: Interface.TextChatMessage,
                VideoRoom: Interface.VideoRoom,
                _User: Interface._User,
                UserPresence: Interface.UserPresence,
                UserProfile: Interface.UserProfile,
                ZoomHostAccount: Interface.ZoomHostAccount,
                ZoomRoom: Interface.ZoomRoom
            };
        }
        return Cache.constructors;
    }

    /**
     * All fields including related fields.
     */
    readonly Fields: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["value"]>>;
    } = {
            AttachmentType: keys<Schema.AttachmentType>(),
            Flair: keys<Schema.Flair>(),
            ProgramItemAttachment: keys<Schema.ProgramItemAttachment>(),
            ProgramRoom: keys<Schema.ProgramRoom>(),
            ProgramSession: keys<Schema.ProgramSession>(),
            ProgramSessionEvent: keys<Schema.ProgramSessionEvent>(),
            TextChat: keys<Schema.TextChat>(),
            TextChatMessage: keys<Schema.TextChatMessage>(),
            VideoRoom: keys<Schema.VideoRoom>(),
            UserProfile: keys<Schema.UserProfile>(),
            ProgramPerson: keys<Schema.ProgramPerson>(),
            ProgramItem: keys<Schema.ProgramItem>(),
            ProgramTrack: keys<Schema.ProgramTrack>(),
            Conference: keys<Schema.Conference>(),
            PrivilegedConferenceDetails: keys<Schema.PrivilegedConferenceDetails>(),
        };

    /**
     * All relations including to uncached tables.
     */
    readonly Relations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedFields<Schema.AttachmentType>>(),
            Flair: keys<PromisedFields<Schema.Flair>>(),
            ProgramItemAttachment: keys<PromisedFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedFields<Schema.ProgramSessionEvent>>(),
            TextChat: keys<PromisedFields<Schema.TextChat>>(),
            TextChatMessage: keys<PromisedFields<Schema.TextChatMessage>>(),
            VideoRoom: keys<PromisedFields<Schema.VideoRoom>>(),
            UserProfile: keys<PromisedFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedFields<Schema.PrivilegedConferenceDetails>>(),
        };

    /**
     * All relations to unique items including to uncached tables.
     */
    readonly UniqueRelations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedNonArrayFields<Schema.AttachmentType>>(),
            Flair: keys<PromisedNonArrayFields<Schema.Flair>>(),
            ProgramItemAttachment: keys<PromisedNonArrayFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedNonArrayFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedNonArrayFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedNonArrayFields<Schema.ProgramSessionEvent>>(),
            TextChat: keys<PromisedNonArrayFields<Schema.TextChat>>(),
            TextChatMessage: keys<PromisedNonArrayFields<Schema.TextChatMessage>>(),
            VideoRoom: keys<PromisedNonArrayFields<Schema.VideoRoom>>(),
            UserProfile: keys<PromisedNonArrayFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedNonArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedNonArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedNonArrayFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedNonArrayFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedNonArrayFields<Schema.PrivilegedConferenceDetails>>(),
        };

    /**
     * All relations to non-unique items including to uncached tables.
     */
    readonly NonUniqueRelations: {
        [K in CachedSchemaKeys]: Array<KnownKeys<CachedSchema[K]["indexes"]>>;
    } = {
            AttachmentType: keys<PromisedArrayFields<Schema.AttachmentType>>(),
            Flair: keys<PromisedArrayFields<Schema.Flair>>(),
            ProgramItemAttachment: keys<PromisedArrayFields<Schema.ProgramItemAttachment>>(),
            ProgramRoom: keys<PromisedArrayFields<Schema.ProgramRoom>>(),
            ProgramSession: keys<PromisedArrayFields<Schema.ProgramSession>>(),
            ProgramSessionEvent: keys<PromisedArrayFields<Schema.ProgramSessionEvent>>(),
            TextChat: keys<PromisedArrayFields<Schema.TextChat>>(),
            TextChatMessage: keys<PromisedArrayFields<Schema.TextChatMessage>>(),
            VideoRoom: keys<PromisedArrayFields<Schema.VideoRoom>>(),
            UserProfile: keys<PromisedArrayFields<Schema.UserProfile>>(),
            ProgramPerson: keys<PromisedArrayFields<Schema.ProgramPerson>>(),
            ProgramItem: keys<PromisedArrayFields<Schema.ProgramItem>>(),
            ProgramTrack: keys<PromisedArrayFields<Schema.ProgramTrack>>(),
            Conference: keys<PromisedArrayFields<Schema.Conference>>(),
            PrivilegedConferenceDetails: keys<PromisedArrayFields<Schema.PrivilegedConferenceDetails>>(),
        };

    // If changing this list, remember to update the `afterSave` callbacks in
    // `backend/cloud/cacheStatus.js`
    readonly ProgramTableNames: Array<CachedSchemaKeys> = [
        "ProgramItem",
        "ProgramItemAttachment",
        "ProgramPerson",
        "ProgramRoom",
        "ProgramSession",
        "ProgramSessionEvent",
        "ProgramTrack",
        "Flair"
    ];

    readonly KEY_PATH: "id" = "id";

    private dbPromise: Promise<IDBPDatabase<ExtendedCachedSchema>> | null = null;
    private conference: Promise<Parse.Object<PromisesRemapped<Schema.Conference>>> | null = null;

    private isInitialised: boolean = false;
    private isUserAuthenticated: boolean = false;
    private userSessionToken: string | null = null;
    private isRefreshRunning: boolean = false;

    private logger: DebugLogger = new DebugLogger("Cache");
    private readonly cacheStaleTime = 1000 * 60 * 5; // 5 minutes
    private readonly cacheInactiveTime = 1000 * 60 * 1; // 1 minutes

    private static parseLive: Parse.LiveQueryClient | null = null;
    private liveQuerySubscriptions: {
        [K in CachedSchemaKeys]?: LiveQuerySubscription;
    } = {};

    public _onDataUpdated: {
        [K in CachedSchemaKeys]: SimpleEventDispatcher<DataUpdatedEventDetails<K>>
    };

    public _onDataDeleted: {
        [K in CachedSchemaKeys]: SimpleEventDispatcher<DataDeletedEventDetails<K>>
    };

    public onDataUpdated<K extends CachedSchemaKeys>(tableName: K): ISimpleEvent<DataUpdatedEventDetails<K>> {
        return (this._onDataUpdated[tableName] as SimpleEventDispatcher<DataUpdatedEventDetails<K>>).asEvent();
    }

    public onDataDeleted<K extends CachedSchemaKeys>(tableName: K): ISimpleEvent<DataDeletedEventDetails<K>> {
        return (this._onDataDeleted[tableName] as SimpleEventDispatcher<DataDeletedEventDetails<K>>).asEvent();
    }

    constructor(
        public readonly conferenceId: string,
        enableDebug: boolean = false) {
        if (enableDebug) {
            this.logger.enable();
        }
        else {
            this.logger.disable();
        }

        this._onDataUpdated = {} as any;
        for (let key of CachedStoreNames) {
            this._onDataUpdated[key as CachedSchemaKeys] = new SimpleEventDispatcher() as any;
        }

        this._onDataDeleted = {} as any;
        for (let key of CachedStoreNames) {
            this._onDataDeleted[key as CachedSchemaKeys] = new SimpleEventDispatcher() as any;
        }
    }

    public async createTestAttachmentType() {
        let x = new Parse.Object<PromisesRemapped<Schema.AttachmentType>>("AttachmentType", {
            conference: await this.conference,
            createdAt: undefined,
            displayAsLink: true,
            extra: undefined,
            fileTypes: [],
            id: undefined,
            isCoverImage: false,
            name: "Test type",
            ordinal: 0,
            supportsFile: false,
            updatedAt: undefined
        } as any);
        x.save();
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

    get Ready(): Promise<void> {
        if (this.dbPromise) {
            // Wrap in a new promise to hide the internal one
            return new Promise(async (resolve, reject) => {
                try {
                    await this.dbPromise;
                    resolve();
                }
                catch {
                    reject("Cache failed to initialise.");
                }
            });
        }
        else {
            return Promise.reject("You must call `initialise` first.");
        }
    }

    get IsUserAuthenticated(): boolean {
        return this.isUserAuthenticated;
    }

    public async updateUserAuthenticated(value: { authed: false } | { authed: true; sessionToken: string }) {
        this.isUserAuthenticated = value.authed;
        if (value.authed) {
            this.userSessionToken = value.sessionToken;
            this.refresh();
        }
        else {
            await this.unsubscribeFromUpdates();
            this.userSessionToken = null;
        }
    }

    get DatabaseName(): string {
        return `clowdr-${this.conferenceId}`;
    }

    /**
     * Initialises the cache.
     */
    async initialise(): Promise<void> {
        if (!this.isInitialised) {
            if (!this.dbPromise) {
                this.logger.info("Opening database.");
                this.conference = new Promise(async (resolve, reject) => {
                    try {
                        this.dbPromise = openDB<ExtendedCachedSchema>(this.DatabaseName, SchemaVersion, {
                            upgrade: this.upgrade.bind(this),
                            blocked: this.blocked.bind(this),
                            blocking: this.blocking.bind(this),
                            terminated: this.terminated.bind(this)
                        });

                        // These should have already been asserted in index.ts
                        // but we do so again here to make TypeScript happy.
                        assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
                        assert(process.env.REACT_APP_PARSE_DOMAIN, "REACT_APP_PARSE_DOMAIN not provided.");
                        assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");

                        if (!Cache.parseLive) {
                            // @ts-ignore
                            Cache.parseLive = new LiveQueryClient({
                                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY
                            });
                            // @ts-ignore
                            Cache.parseLive.on('error', (error) => { this.logger.error('Parse LiveQuery Error', error); });
                            Cache.parseLive.open();
                        }

                        this.isInitialised = true;

                        try {
                            let confP = new Parse.Query<Parse.Object<PromisesRemapped<Schema.Conference>>>("Conference").get(this.conferenceId) || null;
                            let conf = await confP;
                            if (!conf) {
                                resolve(undefined);
                                return;
                            }

                            resolve(conf);
                        }
                        catch (e) {
                            this.logger.error("Error getting conference instance", e);
                            resolve(undefined);
                        }
                    }
                    catch (e) {
                        this.logger.error(`Error initialising cache.`, e);
                        reject(e);
                    }
                });
            }
        }
        else {
            this.logger.info("Already initialised.");
        }
    }

    private async getLocalRefillTimes(db: IDBPDatabase<ExtendedCachedSchema>): Promise<{
        [K in CachedSchemaKeys]: Date | undefined
    }> {
        let localRefillTimes = await db.getAll("LocalRefillTimes");
        let result: any = {};
        localRefillTimes.forEach(x => {
            result[x.id] = x.lastRefillAt;
        });
        return result;
    }

    public async refresh(): Promise<void> {
        if (!this.isInitialised || !this.dbPromise) {
            throw new Error("You must call initialised first!");
        }

        if (this.IsUserAuthenticated && !this.isRefreshRunning) {
            this.isRefreshRunning = true;

            this.isRefreshRunning = await this.dbPromise.then(async db => {
                let freshConference = await this.conference;
                if (freshConference) {
                    let remoteLastProgramUpdateTime = freshConference.get("lastProgramUpdateTime") ?? new Date(0);
                    try {
                        let localRefillTimes = await this.getLocalRefillTimes(db);
                        const now = Date.now();
                    
                        await Promise.all(CachedStoreNames.map(async store => {
                            try {
                                await this.subscribeToUpdates(store, db);

                                let localRefillTime = localRefillTimes[store] ?? new Date(0);
                                let isProgramTable = this.ProgramTableNames.includes(store);
                                let shouldUpdate =
                                        isProgramTable
                                        ? remoteLastProgramUpdateTime > localRefillTime
                                        : localRefillTime.getTime() + this.cacheInactiveTime < now;

                                if (shouldUpdate) {
                                    let shouldClear = isProgramTable || localRefillTime.getTime() + this.cacheStaleTime < now;
                                    let fillFrom = localRefillTimes[store];
                                    if (shouldClear) {
                                        await db.clear(store);
                                        fillFrom = new Date(0);
                                    }

                                    return this.fillCache(store, db, fillFrom);
                                }

                                db.put("LocalRefillTimes", { id: store, lastRefillAt: new Date(now) });
                            }
                            catch (e) {
                                this.logger.error(`Could not update cache table ${store} for conference ${this.conferenceId}`, e);
                            }
                            return void 0;
                        }));
                    }
                    catch (e) {
                        if (e.toString().includes("'LocalRefillTimes' is not a known object store name")) {
                            this.deleteDatabase(true);
                        }
                        else {
                            throw e;
                        }
                    }
                }

                return false;
            }).catch(reason => {
                this.logger.error(`Error refreshing cache`, reason);

                return false;
            });
        }
    }

    private async subscribeToUpdates<K extends CachedSchemaKeys>(
        tableName: K,
        db: IDBPDatabase<ExtendedCachedSchema>): Promise<void> {
        if (!Cache.parseLive) {
            throw new Error("Cannot subscribe to Live Query when client is not initialised.");
        }

        if (!this.userSessionToken) {
            throw new Error("Cannot subscribe to Live Query when user is not authorized.");
        }

        if (!this.liveQuerySubscriptions[tableName]) {
            let query = await this.newParseQuery(tableName);
            let subscription = Cache.parseLive.subscribe(query, this.userSessionToken);
            this.liveQuerySubscriptions[tableName] = subscription;

            subscription.on("create", (parseObj) => {
                this.logger.info(`Parse Live Query: ${tableName} created in conference ${this.conferenceId}`, parseObj);
                this.addItemToCache(parseObj as any, tableName);
            });

            subscription.on("update", (parseObj) => {
                this.logger.info(`Parse Live Query: ${tableName} updated in conference ${this.conferenceId}`, parseObj);
                this.addItemToCache(parseObj as any, tableName);
            });

            subscription.on("delete", (parseObj) => {
                this.logger.info(`Parse Live Query: ${tableName} deleted from conference ${this.conferenceId}`, parseObj);
                this.removeItemFromCache(tableName, parseObj.id);
            });

            // This isn't in the TypeScript types, but it is in the docs & API.
            // https://docs.parseplatform.org/js/guide/#error-event-1
            subscription.on("error" as any, (error) => {
                this.logger.error(`Parse Live Query: Error encountered for ${tableName} and conference ${this.conferenceId}`, error);
            });

            await (subscription as any).subscribePromise;
        }
    }

    private async unsubscribeFromUpdates() {
        for (let key in this.liveQuerySubscriptions) {
            this.liveQuerySubscriptions[key]?.unsubscribe?.();
            delete this.liveQuerySubscriptions[key];
        }
    }

    private async fillCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        db: IDBPDatabase<ExtendedCachedSchema> | null = null,
        fillFrom?: Date
    ): Promise<Array<T>> {
        if (!this.IsInitialised || !this.dbPromise) {
            return Promise.reject("Not initialised");
        }

        if (!this.IsUserAuthenticated) {
            throw new Error("Cannot refresh cache when not authenticated");
        }

        if (!db && this.dbPromise) {
            db = await this.dbPromise;
        }

        let itemsQ = await this.newParseQuery(tableName);
        if (fillFrom) {
            itemsQ.greaterThanOrEqualTo("updatedAt", fillFrom as any);
        }

        let results = itemsQ.map(async parse => {
            return this.addItemToCache<K, T>(parse, tableName, db);
        });

        if (db && fillFrom) {
            db.put("LocalRefillTimes", { id: tableName, lastRefillAt: new Date() });
        }

        return results;
    }

    async addItemToCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        parse: Parse.Object<PromisesRemapped<CachedSchema[K]["value"]>>,
        tableName: K,
        _db: IDBPDatabase<ExtendedCachedSchema> | null = null,
        conferenceLastProgramUpdateTimeOverride?: Date
    ): Promise<T> {
        let schema: any = {
            id: parse.id
        };
        for (let _key of this.Fields[tableName]) {
            let key = _key as KnownKeys<LocalDataT[K]>;
            if (key !== "id") {
                // Yes these casts are safe

                let rels = this.Relations[tableName] as Array<string>;
                if (rels.includes(key as string)) {
                    let uniqRels = this.UniqueRelations[tableName] as Array<string>;
                    try {
                        if (uniqRels.includes(key as string)) {
                            let xs = parse.get(key as any);
                            // It is possible for the pointer to be optional 
                            // e.g. `ProgramPerson.profile: UserProfile | undefined`
                            if (xs) {
                                schema[key] = xs.id;
                            }
                        }
                        // Avoid attempting to fetch data that we aren't allowed to access
                        else if (this.IsUserAuthenticated) {
                            let r = parse.relation(key as any);
                            schema[key] = await r.query().map(x => x.id);
                        }
                    }
                    catch (e) {
                        try {
                            if (!e.toString().includes("Permission denied")) {
                                this.logger.error(e);
                                throw e;
                            }
                        }
                        catch {
                            this.logger.error(e);
                            throw e;
                        }
                    }
                }
                else {
                    schema[key] = parse.get(key as any);
                }
            }
        }

        try {
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
        }
        catch (e) {
            // Occurs when we get back data (like Conference) before the cache
            // has been initialised (likely on first unauthenticated load of a
            // conference).
            if (!e.toString().includes("not a known object store name")) {
                throw e;
            }
        }

        const constr = Cache.Constructors[tableName];
        let result = new constr(this.conferenceId, schema, parse as any) as unknown as T;

        let ev = this._onDataUpdated[tableName] as SimpleEventDispatcher<DataUpdatedEventDetails<K>>;
        ev.dispatchAsync({
            table: tableName,
            object: result
        });

        return result;
    }

    private async removeItemFromCache<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K,
        id: string): Promise<void> {
        let db = await this.dbPromise;
        await db?.delete(tableName, id);

        let ev = this._onDataDeleted[tableName] as SimpleEventDispatcher<DataDeletedEventDetails<K>>;
        ev.dispatchAsync({
            table: tableName,
            objectId: id
        });
    }

    /**
     * Shuts down cache providers and closes the database connection.
     */
    private async closeConnection() {
        if (this.dbPromise) {
            await this.unsubscribeFromUpdates();

            this.conference = null;

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

    private async createStore<K extends ExtendedCachedSchemaKeys>(t: IDBPTransaction<ExtendedCachedSchema>, name: K) {
        this.logger.info(`Creating store: ${name}`);

        t.db.createObjectStore<K>(name, {
            keyPath: this.KEY_PATH
        });
        
        // TODO: For 'find' (getByField / getAllByField) we will need to create indexes
    }

    private async upgradeStore(t: IDBPTransaction<ExtendedCachedSchema>, name: CachedSchemaKeys) {
        this.logger.info(`Upgrading store: ${name}`);

        let items = await t.objectStore(name).getAll();
        for (let item of items) {
            this.upgradeItem(t, name, item);
        }
    }

    private async deleteStore(t: IDBPTransaction<ExtendedCachedSchema>, name: string) {
        this.logger.info(`Deleting store: ${name}`);
        t.db.deleteObjectStore(name as any);
    }

    private async upgradeItem<K extends CachedSchemaKeys>(
        t: IDBPTransaction<ExtendedCachedSchema>,
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
        db: IDBPDatabase<ExtendedCachedSchema>,
        oldVersion: number,
        newVersion: number,
        transaction: IDBPTransaction<ExtendedCachedSchema>
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
        let existingStoreNames: Array<ExtendedCachedSchemaKeys> = [...db.objectStoreNames];

        if (!existingStoreNames.includes("LocalRefillTimes")) {
            this.createStore(transaction, "LocalRefillTimes");
        }

        // Gather stores to upgrade or delete
        for (let storeName of existingStoreNames) {
            if (CachedStoreNames.includes(storeName as CachedSchemaKeys)) {
                toUpgrade.push(storeName as CachedSchemaKeys);
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
        // TODO: blocked
        this.logger.error("Database blocked alert - not implemented.");
    }

    /**
     * Called if this connection is blocking a future version of the database
     * from opening.
     */
    private async blocking(): Promise<void> {
        // TODO: blocking
        this.logger.error("Database blocking alert - not implemented.");
        //TODO: Reenable this condition?
        //if (this.IsDebugEnabled) {
        this.logger.warn("Debug enabled. Closing cache connection.");
        this.closeConnection();
        //}
    }

    /**
     * Called if the browser abnormally terminates the connection. This is not
     * called when db.close() is called.
     */
    private async terminated(): Promise<void> {
        // TODO: terminated
        this.logger.error("Database terminated alert - not implemented.");
        //TODO: Reenable this condition?
        //if (this.IsDebugEnabled) {
        this.logger.warn("Debug enabled. Closing cache connection.");
        this.closeConnection();
        //}
        // TODO: Alert user to termination?
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

            return Promise.reject(`${id} is not present in ${tableName} cache for conference ${this.conferenceId}`);
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

            if (this.isUserAuthenticated) {
                return this.fillCache(tableName);
            }
            else {
                return [];
            }
        }
    }

    private async newParseQuery<K extends CachedSchemaKeys>(tableName: K) {
        assert(this.isInitialised);
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
        try {
            return await this.getFromCache(tableName, id) as T;
        }
        catch {
            let query = await this.newParseQuery(tableName);
            try {
                let resultP = query.get(id);
                let result = await resultP;
                return await this.addItemToCache<K, T>(result, tableName);
            }
            catch (reason) {
                this.logger.warn("Fetch from database of cached item failed", {
                    conferenceId: this.conferenceId,
                    tableName: tableName,
                    id: id,
                    reason: reason
                });

                return null;
            }
        }
    }

    async getAll<K extends CachedSchemaKeys, T extends CachedBase<K>>(
        tableName: K
    ): Promise<Array<T>> {
        return this.getAllFromCache(tableName).catch(async () => {
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
}
