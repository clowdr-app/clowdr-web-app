import Parse from "parse";
import { ZoomRoom as Schema, ZoomRoomFields } from "../DBSchema/ZoomRoom";
import { Conference } from "./Conference";
import { ProgramRoom } from "./ProgramRoom";
import { ZoomHostAccount } from "./ZoomHostAccount";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { ZoomHostAccount as ZoomHostAccountSchema, ZoomHostAccountFields } from "../DBSchema/ZoomHostAccount";
import { ProgramRoom as ProgramRoomSchema, ProgramRoomFields } from "../DBSchema/ProgramRoom";

export class ZoomRoom extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ZoomRoom", ZoomRoomFields, value, dbValue);
    }

    get endTime(): number | Promise<number> {
        return this.get("endTime");
    }

    get join_url(): string | Promise<string> {
        return this.get("join_url");
    }

    get meetingID(): string | Promise<string> {
        return this.get("meetingID");
    }

    get meetingPassword(): string | Promise<string> {
        return this.get("meetingPassword");
    }

    get requireRegistration(): boolean | Promise<boolean> {
        return this.get("requireRegistration");
    }

    get startTime(): number | Promise<number> {
        return this.get("startTime");
    }

    get start_url(): string | Promise<string> {
        return this.get("start_url");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get hostAccount(): ZoomHostAccount | Promise<ZoomHostAccount> {
        return this.related<ZoomHostAccountSchema, ZoomHostAccount>("hostAccount", ZoomHostAccountFields, ZoomHostAccount);
    }

    get programRoom(): ProgramRoom | Promise<ProgramRoom> {
        return this.related<ProgramRoomSchema, ProgramRoom>("programRoom", ProgramRoomFields, ProgramRoom);
    }

}
