import Parse from "parse";
import { ProgramRoom as Schema } from "../DBSchema/ProgramRoom";
import ClowdrInstance from "./ClowdrInstance";
import SocialSpace from "./SocialSpace";
import ZoomRoom from "./ZoomRoom";

export default class ProgramRoom
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramRoom");
    }

    get isEventFocusedRoom(): boolean {
        return this.get("isEventFocusedRoom");
    }

    get name(): string {
        return this.get("name");
    }

    get id1(): string {
        return this.get("id1");
    }

    get src1(): string {
        return this.get("src1");
    }

    get pwd1(): string {
        return this.get("pwd1");
    }

    get id2(): string {
        return this.get("id2");
    }

    get src2(): string {
        return this.get("src2");
    }

    get pwd2(): string {
        return this.get("pwd2");
    }

    get qa(): string {
        return this.get("qa");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

    get socialSpace(): SocialSpace {
        return this.get("socialSpace");
    }

    get zoomRoom(): ZoomRoom {
        return this.get("zoomRoom");
    }

}
Parse.Object.registerSubclass('ProgramRoom', ProgramRoom);
