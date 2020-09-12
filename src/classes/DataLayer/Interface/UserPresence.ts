import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";
import { SocialSpace, UserProfile } from ".";

type SchemaT = Schema.UserPresence;
type K = "UserPresence";
const K_str: K = "UserPresence";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get isAvailable(): boolean {
        return this.parse.get("isAvailable");
    }

    get isDND(): boolean {
        return this.parse.get("isDND");
    }

    get isDNT(): boolean {
        return this.parse.get("isDNT");
    }

    get isLookingForConversation(): boolean {
        return this.parse.get("isLookingForConversation");
    }

    get isOnline(): boolean {
        return this.parse.get("isOnline");
    }

    get isOpenToConversation(): boolean {
        return this.parse.get("isOpenToConversation");
    }

    get status(): string {
        return this.parse.get("status");
    }

    get socialSpace(): Promise<SocialSpace> {
        return this.uniqueRelated("socialSpace");
    }

    get user(): Promise<UserProfile> {
        return this.uniqueRelated("user");
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
