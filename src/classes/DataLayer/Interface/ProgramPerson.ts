import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT } from "./Base";
import { Conference, ProgramItem } from ".";

type SchemaT = Schema.ProgramPerson;
type K = "ProgramPerson";
const K_str: K = "ProgramPerson";

type T = InstanceT & SchemaT;

interface StaticT extends StaticCachedBase<K, T> {
}

interface InstanceT extends CachedBase<K, T> {
}

export default class Class extends CachedBase<K, T> implements T {
    constructor(
        conferenceId: string,
        data: FieldDataT<K, T>,
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get name(): string {
        return this.data.name;
    }

    get programItems(): Promise<ProgramItem[]> {
        throw new Error("Method not implemented");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    static get(id: string, conferenceId: string): Promise<T | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<T>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticT = Class;
