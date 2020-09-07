import Parse from "parse";
import { ProgramSession as Schema, ProgramSessionFields } from "../DBSchema/ProgramSession";
import { Conference } from "./Conference";
import { ProgramSessionEvent } from "./ProgramSessionEvent";
import { ProgramItem } from "./ProgramItem";
import { ProgramRoom } from "./ProgramRoom";
import { ProgramTrack } from "./ProgramTrack";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { ProgramSessionEvent as ProgramSessionEventSchema, ProgramSessionEventFields } from "../DBSchema/ProgramSessionEvent";
import { ProgramItem as ProgramItemSchema, ProgramItemFields } from "../DBSchema/ProgramItem";
import { ProgramRoom as ProgramRoomSchema, ProgramRoomFields } from "../DBSchema/ProgramRoom";
import { ProgramTrack as ProgramTrackSchema, ProgramTrackFields } from "../DBSchema/ProgramTrack";

export class ProgramSession extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramSession", ProgramSessionFields, value, dbValue);
    }

    get confKey(): string | Promise<string> {
        return this.get("confKey");
    }

    get title(): string | Promise<string> {
        return this.get("title");
    }

    get startTime(): number | Promise<number> {
        return this.get("startTime");
    }

    get endTime(): number | Promise<number> {
        return this.get("endTime");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get events(): Array<ProgramSessionEvent> | Promise<Array<ProgramSessionEvent>> {
        return this.relatedMany<ProgramSessionEventSchema, ProgramSessionEvent>("events", ProgramSessionEventFields, ProgramSessionEvent);
    }

    get items(): Array<ProgramItem> | Promise<Array<ProgramItem>> {
        return this.relatedMany<ProgramItemSchema, ProgramItem>("items", ProgramItemFields, ProgramItem);
    }

    get room(): ProgramRoom | Promise<ProgramRoom> {
        return this.related<ProgramRoomSchema, ProgramRoom>("room", ProgramRoomFields, ProgramRoom);
    }

    get programTrack(): ProgramTrack | Promise<ProgramTrack> {
        return this.related<ProgramTrackSchema, ProgramTrack>("programTrack", ProgramTrackFields, ProgramTrack);
    }
}
