import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT, CachedBase } from "./Base";
import { Conference } from ".";

type SchemaT = Schema.SocialSpace;
type K = "SocialSpace";
const K_str: K = "SocialSpace";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get chatChannel(): string {
        return this.data.chatChannel;
    }

    get isGlobal(): boolean {
        return this.data.isGlobal;
    }

    get name(): string {
        return this.data.name;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
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
