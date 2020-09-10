import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT } from "./Base";
import { Conference } from ".";

type SchemaT = Schema.AttachmentType;
type K = "AttachmentType";
const K_str: K = "AttachmentType";

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
        throw new Error("Method no implemented");
        // return this.uniqueRelated("conference");
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
