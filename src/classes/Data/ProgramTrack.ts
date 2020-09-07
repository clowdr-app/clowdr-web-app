import Parse from "parse";
import { ProgramTrack as Schema, ProgramTrackFields } from "../DBSchema/ProgramTrack";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export type Exhibits = "None" | "Grid" | "List";

export class ProgramTrack extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramTrack", ProgramTrackFields, value, dbValue);
    }

    get badgeText(): string | Promise<string> {
        return this.get("badgeText");
    }

    get badgeColor(): string | Promise<string> {
        return this.get("badgeColor");
    }

    get displayName(): string | Promise<string> {
        return this.get("displayName");
    }

    get exhibit(): Exhibits | Promise<Exhibits> {
        return this.get("exhibit");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

    get perProgramItemChat(): boolean | Promise<boolean> {
        return this.get("perProgramItemChat");
    }

    get perProgramItemVideo(): boolean | Promise<boolean> {
        return this.get("perProgramItemVideo");
    }

    get showAsEvents(): boolean | Promise<boolean> {
        return this.get("showAsEvents");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

}
