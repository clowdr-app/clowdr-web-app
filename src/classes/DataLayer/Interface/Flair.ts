import { Conference } from ".";
import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, CachedBase, LocalDataT } from "./Base";

type SchemaT = Schema.Flair;
type K = "Flair";
const K_str: K = "Flair";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get color(): string {
        return this.data.color;
    }

    get label(): string {
        return this.data.label;
    }

    get tooltip(): string {
        return this.data.tooltip;
    }

    get priority(): number {
        return this.data.priority;
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
const _: StaticCachedBase<K> = Class;
