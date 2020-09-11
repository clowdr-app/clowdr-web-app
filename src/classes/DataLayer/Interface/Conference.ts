import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, PromisesRemapped, CachedBase, FieldDataT } from "./Base";
import { PrivilegedConferenceDetails } from ".";

type SchemaT = Schema.Conference;
type K = "Conference";
const K_str: K = "Conference";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get conferenceName(): string {
        return this.data.conferenceName;
    }

    get loggedInText(): Promise<PrivilegedConferenceDetails> {
        return this.uniqueRelated("loggedInText");
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
