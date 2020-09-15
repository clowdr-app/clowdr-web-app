import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";
import { Conference, ProgramItem, ProgramSession, ProgramTrack } from ".";

type SchemaT = Schema.ProgramSessionEvent;
type K = "ProgramSessionEvent";
const K_str: K = "ProgramSessionEvent";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get directLink(): string | undefined {
        return this.data.directLink;
    }

    get endTime(): Date {
        return this.data.endTime;
    }

    get startTime(): Date {
        return this.data.startTime;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get item(): Promise<ProgramItem> {
        return this.uniqueRelated("item");
    }

    get session(): Promise<ProgramSession> {
        return this.uniqueRelated("session");
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
