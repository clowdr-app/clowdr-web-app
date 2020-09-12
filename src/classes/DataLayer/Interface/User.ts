import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";
import { UserProfile } from ".";
import { PromisesRemapped } from "../WholeSchema";

type SchemaT = Schema.User;
type K = "User";
const K_str: K = "User";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get email(): string {
        return this.parse.get("email");
    }

    get loginKey(): string {
        return this.parse.get("loginKey");
    }

    get passwordSet(): boolean {
        return this.parse.get("passwordSet");
    }

    get username(): string {
        return this.parse.get("username");
    }

    get isBanned(): "Yes" | "No" {
        return this.parse.get("isBanned");
    }

    get profiles(): Promise<UserProfile[]> {
        return this.nonUniqueRelated("profiles");
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
