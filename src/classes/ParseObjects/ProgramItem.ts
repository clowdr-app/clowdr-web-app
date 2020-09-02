import Parse from "parse";
import { ProgramItem as Schema } from "../DBSchema/ProgramItem";
import ProgramPerson from "./ProgramPerson";
import ProgramItemAttachment from "./ProgramItemAttachment";
import BreakoutRoom from "./BreakoutRoom";
import ClowdrInstance from "./ClowdrInstance";
import ProgramSessionEvent from "./ProgramSessionEvent";
import ProgramSession from "./ProgramSession";
import ProgramTrack from "./ProgramTrack";

export default class ProgramItem
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramItem");
    }

    get abstract(): string {
        return this.get("abstract");
    }

    get chatSID(): string {
        return this.get("chatSID");
    }

    get confKey(): string {
        return this.get("confKey");
    }

    get isPrivate(): boolean {
        return this.get("isPrivate");
    }

    get posterImage(): Parse.File {
        return this.get("posterImage");
    }

    get title(): string {
        return this.get("title");
    }

    get authors(): Array<ProgramPerson> {
        return this.get("authors");
    }

    get attachments(): Array<ProgramItemAttachment> {
        return this.get("attachments");
    }

    get breakoutRoom(): BreakoutRoom {
        return this.get("breakoutRoom");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

    get events(): Array<ProgramSessionEvent> {
        return this.get("events");
    }

    get programSession(): ProgramSession {
        return this.get("programSession");
    }

    get track(): ProgramTrack {
        return this.get("track");
    }

}
Parse.Object.registerSubclass('ProgramItem', ProgramItem);
