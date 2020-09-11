import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";

type SchemaT = Schema.Flair;
type K = "Flair";
const K_str: K = "Flair";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get color(): string {
        return this.parse.get("color");
    }

    get label(): string {
        return this.parse.get("label");
    }

    get tooltip(): string {
        return this.parse.get("tooltip");
    }

    get priority(): number {
        return this.parse.get("priority");
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
