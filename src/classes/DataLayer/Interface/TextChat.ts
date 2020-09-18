import { Conference } from ".";
import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";

type SchemaT = Schema.TextChat;
type K = "TextChat";
const K_str: K = "TextChat";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get mirrored(): boolean {
        return this.data.mirrored;
    }

    get name(): string {
        return this.data.name;
    }

    get twilioID(): string {
        return this.data.twilioID;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    static get(id: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }

    static onDataUpdated(conferenceId: string) {
        return StaticBaseImpl.onDataUpdated(K_str, conferenceId);
    }

    static onDataDeleted(conferenceId: string) {
        return StaticBaseImpl.onDataDeleted(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
