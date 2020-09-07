import Parse from "parse";
import { ProgramRoom as Schema, ProgramRoomFields } from "../DBSchema/ProgramRoom";
import { Conference } from "./Conference";
import { SocialSpace } from "./SocialSpace";
import { ZoomRoom } from "./ZoomRoom";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { SocialSpace as SocialSpaceSchema, SocialSpaceFields } from "../DBSchema/SocialSpace";
import { ZoomRoom as ZoomRoomSchema, ZoomRoomFields } from "../DBSchema/ZoomRoom";

export class ProgramRoom extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramRoom", ProgramRoomFields, value, dbValue);
    }

    get isEventFocusedRoom(): boolean | Promise<boolean> {
        return this.get("isEventFocusedRoom");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

    get id1(): string | Promise<string> {
        return this.get("id1");
    }

    get src1(): string | Promise<string> {
        return this.get("src1");
    }

    get pwd1(): string | Promise<string> {
        return this.get("pwd1");
    }

    get id2(): string | Promise<string> {
        return this.get("id2");
    }

    get src2(): string | Promise<string> {
        return this.get("src2");
    }

    get pwd2(): string | Promise<string> {
        return this.get("pwd2");
    }

    get qa(): string | Promise<string> {
        return this.get("qa");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get socialSpace(): SocialSpace | Promise<SocialSpace> {
        return this.related<SocialSpaceSchema, SocialSpace>("socialSpace", SocialSpaceFields, SocialSpace);
    }

    get zoomRoom(): ZoomRoom | Promise<ZoomRoom> {
        return this.related<ZoomRoomSchema, ZoomRoom>("zoomRoom", ZoomRoomFields, ZoomRoom);
    }

}
