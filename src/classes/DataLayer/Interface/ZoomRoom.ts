import * as Schema from "../Schema";
import { PromisesRemapped } from "../WholeSchema";
import { StaticUncachedBase, StaticBaseImpl, UncachedBase } from "./Base";
import { Conference, ZoomHostAccount } from ".";

type SchemaT = Schema.ZoomRoom;
type K = "ZoomRoom";
const K_str: K = "ZoomRoom";

export default class Class extends UncachedBase<K> implements SchemaT {
    constructor(parse: Parse.Object<PromisesRemapped<SchemaT>>) {
        super(K_str, parse);
    }

    get endTime(): Date {
        return this.parse.get("endTime");
    }

    get join_url(): string {
        return this.parse.get("join_url");
    }

    get registration_url(): string | undefined {
        return this.parse.get("registration_url");
    }

    get start_url_expiration(): Date {
        return this.parse.get("start_url_expiration");
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

    get startTime(): Date {
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
