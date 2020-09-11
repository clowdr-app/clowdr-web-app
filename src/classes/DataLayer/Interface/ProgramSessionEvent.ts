import * as Schema from "../Schema";
import { StaticCachedBase, StaticBaseImpl, PromisesRemapped, FieldDataT, CachedBase } from "./Base";
import { Conference, ProgramItem, ProgramSession } from ".";

type SchemaT = Schema.ProgramSessionEvent;
type K = "ProgramSessionEvent";
const K_str: K = "ProgramSessionEvent";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get directLink(): string {
        return this.data.directLink;
    }

    get endTime(): number {
        return this.data.endTime;
    }

    get startTime(): number {
        return this.data.startTime;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get programItem(): Promise<ProgramItem> {
        return this.uniqueRelated("programItem");
    }

    get programSession(): Promise<ProgramSession> {
        return this.uniqueRelated("programSession");
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
