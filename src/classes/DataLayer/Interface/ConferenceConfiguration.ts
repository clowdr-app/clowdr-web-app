import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";
import { Conference } from ".";

type SchemaT = Schema.ConferenceConfiguration;
type K = "ConferenceConfiguration";
const K_str: K = "ConferenceConfiguration";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get key(): string {
        return this.parse.get("key");
    }

    get value(): string {
        return this.parse.get("value");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    static get(id: string, conferenceId?: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId?: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticUncachedBase<K> = Class;
