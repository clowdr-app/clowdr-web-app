import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT } from "./Base";
import { Conference, ProgramPerson, ProgramTrack } from ".";

type SchemaT = Schema.ProgramItem;
type K = "ProgramItem";
const K_str: K = "ProgramItem";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }
    get abstract(): string {
        return this.data.abstract;
    }

    get chatSID(): string {
        return this.data.chatSID;
    }

    get isPrivate(): boolean {
        return this.data.isPrivate;
    }

    get posterImage(): Parse.File {
        return this.data.posterImage;
    }

    get title(): string {
        return this.data.title;
    }

    get authors(): Promise<Array<ProgramPerson>> {
        throw new Error("Method not implemented");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get track(): Promise<ProgramTrack> {
        return this.uniqueRelated("track");
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
