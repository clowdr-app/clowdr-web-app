import Parse from "parse";
import { ProgramSession as Schema } from "../DBSchema/ProgramSession";
import ClowdrInstance from "./ClowdrInstance";
import ProgramSessionEvent from "./ProgramSessionEvent";
import ProgramItem from "./ProgramItem";
import ProgramRoom from "./ProgramRoom";
import ProgramTrack from "./ProgramTrack";

export default class ProgramSession
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramSession");
    }

    get confKey(): string {
        return this.get("confKey");
    }

    get title(): string {
        return this.get("title");
    }

    get startTime(): number {
        return this.get("startTime");
    }

    get endTime(): number {
        return this.get("endTime");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

    get events(): Array<ProgramSessionEvent> {
        return this.get("events");
    }

    get items(): Array<ProgramItem> {
        return this.get("items");
    }

    get room(): ProgramRoom {
        return this.get("room");
    }

    get programTrack(): ProgramTrack {
        return this.get("programTrack");
    }
}
Parse.Object.registerSubclass('ProgramSession', ProgramSession);
