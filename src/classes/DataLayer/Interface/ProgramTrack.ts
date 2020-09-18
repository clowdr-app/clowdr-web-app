import * as Schema from "../Schema";
import { CachedBase, StaticCachedBase, StaticBaseImpl, LocalDataT } from "./Base";
import { Conference, ProgramItem, ProgramSession } from ".";
import { PromisesRemapped } from "../WholeSchema";

type SchemaT = Schema.ProgramTrack;
type K = "ProgramTrack";
const K_str: K = "ProgramTrack";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: LocalDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get name(): string {
        return this.data.name;
    }

    get shortName(): string {
        return this.data.shortName;
    }

    get colour(): string {
        return this.data.colour;
    }

    get generateTextChatPerItem(): boolean {
        return this.data.generateTextChatPerItem;
    }

    get generateVideoRoomPerItem(): boolean {
        return this.data.generateVideoRoomPerItem;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get sessions(): Promise<Array<ProgramSession>> {
        return StaticBaseImpl.getAllByField("ProgramSession", "track", this.id, this.conferenceId);
    }

    get items(): Promise<Array<ProgramItem>> {
        return StaticBaseImpl.getAllByField("ProgramItem", "track", this.id, this.conferenceId);
    }

    static get(id: string, conferenceId: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }

    static onDataUpdated(conferenceId: string) {
        return StaticBaseImpl.onDataUpdated(K_str, conferenceId);
    }

    static onDataDeleted(conferenceId: string) {
        return StaticBaseImpl.onDataDeleted(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticCachedBase<K> = Class;
