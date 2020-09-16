import { Conference, ZoomRoom } from ".";
import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";

type SchemaT = Schema.ZoomHostAccount;
type K = "ZoomHostAccount";
const K_str: K = "ZoomHostAccount";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get email(): string {
        return this.parse.get("email");
    }

    get password(): string {
        return this.parse.get("password");
    }

    get name(): string {
        return this.parse.get("name");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get rooms(): Promise<Array<ZoomRoom>> {
        return StaticBaseImpl.getAllByField("ZoomRoom", "hostAccount", this.id);
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
