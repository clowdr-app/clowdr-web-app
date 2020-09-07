import { ProgramItem as Schema, ProgramItemFields as FieldNames } from "../DBSchema/ProgramItem";
import { ProgramPerson } from "./ProgramPerson";
import { ProgramItemAttachment } from "./ProgramItemAttachment";
import { BreakoutRoom } from "./BreakoutRoom";
import { Conference } from "./Conference";
import { ProgramSessionEvent } from "./ProgramSessionEvent";
import { ProgramSession } from "./ProgramSession";
import { ProgramTrack } from "./ProgramTrack";
import { Base } from "./Base";
import { BreakoutRoom as BreakoutRoomSchema, BreakoutRoomFields } from "../DBSchema/BreakoutRoom";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { ProgramItemAttachment as ProgramItemAttachmentSchema, ProgramItemAttachmentFields } from "../DBSchema/ProgramItemAttachment";
import { ProgramPerson as ProgramPersonSchema, ProgramPersonFields } from "../DBSchema/ProgramPerson";
import { ProgramSessionEvent as ProgramSessionEventSchema, ProgramSessionEventFields } from "../DBSchema/ProgramSessionEvent";
import { ProgramSession as ProgramSessionSchema, ProgramSessionFields } from "../DBSchema/ProgramSession";
import { ProgramTrack as ProgramTrackSchema, ProgramTrackFields } from "../DBSchema/ProgramTrack";

export class ProgramItem extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramItem", FieldNames, value);
    }

    get abstract(): string | Promise<string> {
        return this.get("abstract");
    }

    get chatSID(): string | Promise<string> {
        return this.get("chatSID");
    }

    get confKey(): string | Promise<string> {
        return this.get("confKey");
    }

    get isPrivate(): boolean | Promise<boolean> {
        return this.get("isPrivate");
    }

    get posterImage(): Parse.File | Promise<Parse.File> {
        return this.get("posterImage");
    }

    get title(): string | Promise<string> {
        return this.get("title");
    }

    get authors(): Array<ProgramPerson> | Promise<Array<ProgramPerson>> {
        return this.relatedMany<ProgramPersonSchema, ProgramPerson>(
            "authors", ProgramPersonFields, ProgramPerson);
    }

    get attachments(): Array<ProgramItemAttachment> | Promise<Array<ProgramItemAttachment>> {
        return this.relatedMany<ProgramItemAttachmentSchema, ProgramItemAttachment>(
            "attachments", ProgramItemAttachmentFields, ProgramItemAttachment);
    }

    get breakoutRoom(): BreakoutRoom | Promise<BreakoutRoom> {
        return this.related<BreakoutRoomSchema, BreakoutRoom>("breakoutRoom", BreakoutRoomFields, BreakoutRoom);
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get events(): Array<ProgramSessionEvent> | Promise<Array<ProgramSessionEvent>> {
        return this.relatedMany<ProgramSessionEventSchema, ProgramSessionEvent>("events", ProgramSessionEventFields, ProgramSessionEvent);
    }

    get programSession(): ProgramSession | Promise<ProgramSession> {
        return this.related<ProgramSessionSchema, ProgramSession>("programSession", ProgramSessionFields, ProgramSession);
    }

    get track(): ProgramTrack | Promise<ProgramTrack> {
        return this.related<ProgramTrackSchema, ProgramTrack>("track", ProgramTrackFields, ProgramTrack);
    }

}
