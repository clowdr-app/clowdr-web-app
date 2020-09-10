import * as Schema from "../Schema";
import { Base, StaticBase, StaticBaseImpl } from "./Base";

type SchemaT = Schema.Conference;
type K = "ClowdrInstance";
const K_str: K = "ClowdrInstance";

type T = InstanceT & SchemaT;

interface StaticT extends StaticBase<K, T> {
}

interface InstanceT extends Base<K, T> {
}

// TODO: Tests

export default class Class extends Base<K, T> implements T {

    static get(conferenceId: string, id: string): Promise<T | null> {
        return StaticBaseImpl.get(K_str, conferenceId, id);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticT = Class;
