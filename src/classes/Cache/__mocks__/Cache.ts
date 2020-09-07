import DebugLogger from "../DebugLogger";
import { OperationResult } from "../OperationResult";
import { StoreNames } from "idb";
import IDBSchema, { IDBStoreDataConstructors } from "../Schema";
import { SubscriberCallback } from "../Cache";
import { Base } from "../../Data/Base";

interface IMockCacheData {
    get: (tableName: string, id: string) => Promise<any>;
    getAll: (tableName: string) => Promise<Array<any>>;
    transaction: (tableName: string, mode: string) => { done: Promise<void> };
}

export default class Cache {
    static mockCacheData: IMockCacheData;

    private logger: DebugLogger = new DebugLogger("Cache");

    constructor(
        public readonly conferenceId: string,
        enableDebug: boolean = false
    ) {
        this.debugModeActive = enableDebug;
    }

    get databaseName(): string {
        return `clowdr-${this.conferenceId}`;
    }

    get debugModeActive(): boolean {
        return this.logger.isEnabled;
    }

    set debugModeActive(value: boolean) {
        if (value) {
            this.logger.enable();
            this.logger.info("Debug mode enabled.");
        }
        else {
            this.logger.info("Disabling debug mode.");
            this.logger.disable();
        }
    }

    public async deleteDatabase(
        reload: boolean = false,
        retryDelay: number = 5000
    ): Promise<OperationResult> {
        throw new Error("Not mocked yet");
    }

    public subscribe(name: StoreNames<IDBSchema>, callbackId: string, callback: SubscriberCallback) {
        throw new Error("Not mocked yet");
    }

    public unsubscribe(name: StoreNames<IDBSchema>, callbackId: string) {
        throw new Error("Not mocked yet");
    }

    public async initialiseConferenceCache(
        parseLive: Parse.LiveQueryClient
    ): Promise<void> {
        throw new Error("Not mocked yet");
    }

    public async get<
        K extends StoreNames<IDBSchema>,
        T extends Base<IDBSchema[K]["value"]>>(
            name: K,
            id: string,
            constr?: new (schemaValue: IDBSchema[K]["value"], dbValue?: Parse.Object | null) => Pick<T, any>
        ): Promise<T | undefined> {
        let schemaValue = await Cache.mockCacheData.get(name, id);
        // Cache hit?
        if (schemaValue) {
            // @ts-ignore
            return constr ? new constr(schemaValue) : new IDBStoreDataConstructors[name](schemaValue);
        }
        // Cache miss
        else {
            let query = new Parse.Query(name);
            return query.get(id).then(async dbValue => {
                let transaction = Cache.mockCacheData.transaction(name, "readwrite");
                // @ts-ignore
                this.updateData(name, dbValue, transaction.store);
                await transaction.done;
                // @ts-ignore
                let result: T = constr ? new constr({ id: dbValue.id }, dbValue) : new IDBStoreDataConstructors[name]({ id: dbValue.id }, dbValue);
                return result;
            });
        }
    }

    public async getAll<K extends StoreNames<IDBSchema>>(name: K): Promise<Array<Base<IDBSchema[K]["value"]>>> {
        let all: Array<IDBSchema[K]["value"]> = await Cache.mockCacheData.getAll(name);
        // @ts-ignore
        return all.map(x => new IDBStoreDataConstructors[name](x));
    }
}
