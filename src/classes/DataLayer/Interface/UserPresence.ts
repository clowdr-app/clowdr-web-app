import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";
import { UserProfile } from ".";

type SchemaT = Schema.UserPresence;
type K = "UserPresence";
const K_str: K = "UserPresence";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get isDNT(): boolean {
        return this.parse.get("isDNT");
    }

    get lastSeen(): Date {
        return this.parse.get("lastSeen");
    }

    get profile(): Promise<UserProfile> {
        return this.uniqueRelated("profile");
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
