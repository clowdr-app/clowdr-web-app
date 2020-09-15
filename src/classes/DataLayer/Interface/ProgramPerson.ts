import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, LocalDataT } from "./Base";
import { Conference, ProgramItem, UserProfile } from ".";
import { PromisesRemapped } from "../WholeSchema";

type SchemaT = Schema.ProgramPerson;
type K = "ProgramPerson";
const K_str: K = "ProgramPerson";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get name(): string {
        return this.data.name;
    }

    get items(): Promise<ProgramItem[]> {
        return this.nonUniqueRelated("items");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get profile(): Promise<UserProfile> {
        return this.uniqueRelated("profile");
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
