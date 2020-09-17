import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, LocalDataT, CachedBase } from "./Base";
import { Conference, ProgramSessionEvent, ProgramItem, ProgramRoom, ProgramTrack } from ".";

type SchemaT = Schema.ProgramSession;
type K = "ProgramSession";
const K_str: K = "ProgramSession";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get title(): string {
        return this.data.title;
    }

    get startTime(): Date {
        return this.data.startTime;
    }

    get endTime(): Date {
        return this.data.endTime;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get events(): Promise<ProgramSessionEvent[]> {
        return StaticBaseImpl.getAllByField("ProgramSessionEvent", "session", this.id, this.conferenceId);
    }

    get items(): Promise<ProgramItem[]> {
        return this.events.then(async evs => {
            let items = await Promise.all(evs.map(x => x.item));
            return items.reduce((acc, x) => acc.map(y => y.id).includes(x.id) ? acc : [...acc, x], [] as Array<ProgramItem>);
        });
    }

    get room(): Promise<ProgramRoom> {
        return this.uniqueRelated("room");
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
