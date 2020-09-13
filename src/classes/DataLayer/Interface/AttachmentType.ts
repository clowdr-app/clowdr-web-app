import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, FieldDataT } from "./Base";
import { Conference } from ".";
import { PromisesRemapped } from "../WholeSchema";

type SchemaT = Schema.AttachmentType;
type K = "AttachmentType";
const K_str: K = "AttachmentType";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

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
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
