import Parse from "parse";
import { ProgramSessionEvent as Schema } from "../DBSchema/ProgramSessionEvent";
import { Conference } from "./Conference";
import { ProgramItem } from "./ProgramItem";
import { ProgramSession } from "./ProgramSession";

export class ProgramSessionEvent
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramSessionEvent");
    }

    get directLink(): string {
        return this.get("directLink");
    }

    get endTime(): number {
        return this.get("endTime");
    }

    get startTime(): number {
        return this.get("startTime");
    }

    get conference(): Conference {
        return this.get("conference");
    }

    get programItem(): ProgramItem {
        return this.get("programItem");
    }

    get programSession(): ProgramSession {
        return this.get("programSession");
    }

}
Parse.Object.registerSubclass('ProgramSessionEvent', ProgramSessionEvent);
