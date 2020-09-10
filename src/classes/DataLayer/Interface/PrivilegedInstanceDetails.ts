import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase, PromisesRemapped } from "./Base";
import { Conference } from ".";

type SchemaT = Schema.PrivilegedInstanceDetails;
type K = "PrivilegedInstanceDetails";
const K_str: K = "PrivilegedInstanceDetails";

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


    static get(id: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id);
    }

    static getAll(): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticUncachedBase<K> = Class;
