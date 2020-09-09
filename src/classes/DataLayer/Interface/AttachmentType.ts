import * as Schema from "../Schema";
import { Base, StaticBase, StaticBaseImpl } from "./Base";
import ProgramItem from "./ProgramItem";

type SchemaT = Schema.AttachmentType;
type K = "AttachmentType";
const K_str: K = "AttachmentType";

type T = DynamicT & SchemaT;

interface StaticT extends StaticBase<K, T> {
}

interface DynamicT extends Base<K, T> {
}

export default class Class extends Base<K, T> implements T {

    get displayAsLink(): boolean {
        return this.data.displayAsLink;
    }

    get isCoverImage(): boolean {
        return this.data.isCoverImage;
    }

    get name(): string {
        return this.data.name;
    }

    get ordinal(): number {
        return this.data.ordinal;
    }

    get supportsFile(): boolean {
        return this.data.supportsFile;
    }

    get programItem(): Promise<ProgramItem | null> {
        return this.related("programItem");
    }

    static get(conferenceId: string, id: string): Promise<T | null> {
        return StaticBaseImpl.get(K_str, conferenceId, id);
    }

    // static create(conferenceId, data): Promise<T> {
    //     return StaticBaseImpl.create(conferenceId, data, TheClass);
    // }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticT = Class;
