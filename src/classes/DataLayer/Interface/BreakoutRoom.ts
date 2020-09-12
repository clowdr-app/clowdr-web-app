import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticCachedBase, StaticBaseImpl, FieldDataT, CachedBase } from "./Base";
import { Conference, Conversation, UserProfile, ProgramItem } from ".";

type SchemaT = Schema.BreakoutRoom;
type K = "BreakoutRoom";
const K_str: K = "BreakoutRoom";

export default class Class extends CachedBase<K> implements SchemaT {
    constructor(
        conferenceId: string,
        data: FieldDataT[K],
        parse: Parse.Object<PromisesRemapped<SchemaT>> | null = null) {
        super(conferenceId, K_str, data, parse);
    }

    get capacity(): number {
        return this.data.capacity;
    }

    get isPrivate(): boolean {
        return this.data.isPrivate;
    }

    get mode(): Schema.RoomModes {
        return this.data.mode;
    }

    get persistence(): Schema.RoomPersistence {
        return this.data.persistence;
    }

    get title(): string {
        return this.data.title;
    }

    get twilioChatID(): string {
        return this.data.twilioChatID;
    }

    get twilioID(): string {
        return this.data.twilioID;
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get conversation(): Promise<Conversation> {
        return this.uniqueRelated("conversation");
    }

    get members(): Promise<UserProfile[]> {
        return this.nonUniqueRelated("members");
    }

    get programItem(): Promise<ProgramItem> {
        return this.uniqueRelated("programItem");
    }

    get watchers(): Promise<UserProfile[]> {
        return this.nonUniqueRelated("watchers");
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
