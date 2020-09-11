import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, CachedBase, PromisesRemapped, FieldDataT } from "./Base";
import { Conference } from ".";

type SchemaT = Schema.PrivilegedInstanceDetails;
type K = "PrivilegedInstanceDetails";
const K_str: K = "PrivilegedInstanceDetails";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get key(): string {
        return this.data.key;
    }

    get value(): string {
        return this.data.value;
    }

    get instance(): Promise<Conference> {
        return this.uniqueRelated("instance");
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
const _: StaticCachedBase<K> = Class;
