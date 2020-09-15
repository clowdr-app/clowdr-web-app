import Parse from "parse";
import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";
import { PromisesRemapped } from "../WholeSchema";
import { Conference, _User } from ".";

type SchemaT = Schema._Role;
type K = "_Role";
const K_str: K = "_Role";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get name(): string {
        return this.parse.get("name");
    }

    get users(): Promise<_User[]> {
        return this.nonUniqueRelated("users");
    }

    get roles(): Promise<Class[]> {
        return this.nonUniqueRelated("roles");
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
