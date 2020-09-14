import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";
import { Conference, UserProfile } from ".";

type SchemaT = Schema.Conversation;
type K = "Conversation";
const K_str: K = "Conversation";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get isDM(): boolean {
        return this.data.isDM;
    }

    get sid(): string {
        return this.data.sid;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get member1(): Promise<UserProfile> {
        return this.uniqueRelated("member1");
    }

    get member2(): Promise<UserProfile> {
        return this.uniqueRelated("member2");
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
