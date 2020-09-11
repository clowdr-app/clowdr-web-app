import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";
import { TwilioChannelMirror } from ".";

type SchemaT = Schema.BondedChannel;
type K = "BondedChannel";
const K_str: K = "BondedChannel";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get masterSID(): string {
        return this.parse.get("masterSID");
    }

    get children(): Promise<TwilioChannelMirror[]> {
        return this.nonUniqueRelated("children");
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
