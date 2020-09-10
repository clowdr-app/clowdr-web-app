import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase, PromisesRemapped } from "./Base";

type SchemaT = Schema.Conference;
type K = "ClowdrInstance";
const K_str: K = "ClowdrInstance";

type T = InstanceT & SchemaT;

interface StaticT extends StaticUncachedBase<K, T> {
}

interface InstanceT extends UncachedBase<K, T> {
}

// TODO: Tests

export default class Class extends UncachedBase<K, T> implements T {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get conferenceName(): string {
        return this.parse.get("conferenceName");
    }

    static get(id: string): Promise<T | null> {
        return StaticBaseImpl.get(K_str, id);
    }

    static getAll(): Promise<Array<T>> {
        return StaticBaseImpl.getAll(K_str);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticT = Class;
