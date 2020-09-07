import Parse from "parse";
import { ProgramSessionEvent as Schema, ProgramSessionEventFields } from "../DBSchema/ProgramSessionEvent";
import { Conference } from "./Conference";
import { ProgramItem } from "./ProgramItem";
import { ProgramSession } from "./ProgramSession";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { ProgramItem as ProgramItemSchema, ProgramItemFields } from "../DBSchema/ProgramItem";
import { ProgramSession as ProgramSessionSchema, ProgramSessionFields } from "../DBSchema/ProgramSession";

export class ProgramSessionEvent extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramSessionEvent", ProgramSessionEventFields, value, dbValue);
    }

    get directLink(): string | Promise<string> {
        return this.get("directLink");
    }

    get endTime(): number | Promise<number> {
        return this.get("endTime");
    }

    get startTime(): number | Promise<number> {
        return this.get("startTime");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get programItem(): ProgramItem | Promise<ProgramItem> {
        return this.related<ProgramItemSchema, ProgramItem>("programItem", ProgramItemFields, ProgramItem);
    }

    get programSession(): ProgramSession | Promise<ProgramSession> {
        return this.related<ProgramSessionSchema, ProgramSession>("programSession", ProgramSessionFields, ProgramSession);
    }

}
