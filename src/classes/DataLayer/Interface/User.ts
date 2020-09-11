import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT, CachedBase } from "./Base";
import { UserProfile } from ".";

type SchemaT = Schema.User;
type K = "User";
const K_str: K = "User";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get email(): string {
        return this.data.email;
    }

    get loginKey(): string {
        return this.data.loginKey;
    }

    get passwordSet(): boolean {
        return this.data.passwordSet;
    }

    get username(): string {
        return this.data.username;
    }

    get isBanned(): "Yes" | "No" {
        return this.data.isBanned;
    }

    get profiles(): Promise<UserProfile[]> {
        return this.nonUniqueRelated("profiles");
    }

    static get(id: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
