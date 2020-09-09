import * as Schema from "../Schema";
import { Base, StaticBase, StaticBaseImpl } from "./Base";

type SchemaT = Schema.ProgramItem;
type K = "ProgramItem";
const K_str: K = "ProgramItem";

type T = InstanceT & SchemaT;

interface StaticT extends StaticBase<K, T> {
}

interface InstanceT extends Base<K, T> {
}

// TODO: Tests

export default class Class extends Base<K, T> implements T {

    get abstract(): string {
        return this.data.abstract;
    }

    get chatSID(): string {
        return this.data.chatSID;
    }

    get confKey(): string {
        return this.data.confKey;
    }

    get isPrivate(): boolean {
        return this.data.isPrivate;
    }

    get posterImage(): File {
        return this.data.posterImage;
    }

    get title(): string {
        return this.data.title;
    }

    static get(conferenceId: string, id: string): Promise<T | null> {
        return StaticBaseImpl.get(K_str, conferenceId, id);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticT = Class;
