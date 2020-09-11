import * as Schema from "../Schema";
import { StaticUncachedBase, StaticBaseImpl, PromisesRemapped, UncachedBase } from "./Base";
import { Conference, ZoomHostAccount, ProgramRoom } from ".";

type SchemaT = Schema.ZoomRoom;
type K = "ZoomRoom";
const K_str: K = "ZoomRoom";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get endTime(): number {
        return this.parse.get("endTime");
    }

    get join_url(): string {
        return this.parse.get("join_url");
    }

    get meetingID(): string {
        return this.parse.get("meetingID");
    }

    get meetingPassword(): string {
        return this.parse.get("meetingPassword");
    }

    get requireRegistration(): boolean {
        return this.parse.get("requireRegistration");
    }

    get startTime(): number {
        return this.parse.get("startTime");
    }

    get start_url(): string {
        return this.parse.get("start_url");
    }

    get conference(): Promise<Conference> {
        return this.uniqueRelated("conference");
    }

    get hostAccount(): Promise<ZoomHostAccount> {
        return this.uniqueRelated("hostAccount");
    }

    get programRoom(): Promise<ProgramRoom> {
        return this.uniqueRelated("programRoom");
    }

    static get(id: string, conferenceId?: string): Promise<Class | null> {
        return StaticBaseImpl.get(K_str, id, conferenceId);
    }

    static getAll(conferenceId?: string): Promise<Array<Class>> {
        return StaticBaseImpl.getAll(K_str, conferenceId);
    }
}

// The line of code below triggers type-checking of Class for static members
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _: StaticUncachedBase<K> = Class;
