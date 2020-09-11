import Parse from "parse";
import { ZoomRoom as Schema } from "../DBSchema/ZoomRoom";
import { Conference } from "./Conference";
import { ProgramRoom } from "./ProgramRoom";
import { ZoomHostAccount } from "./ZoomHostAccount";

export class ZoomRoom
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ZoomRoom");
    }

    get endTime(): number {
        return this.get("endTime");
    }

    get join_url(): string {
        return this.get("join_url");
    }

    get meetingID(): string {
        return this.get("meetingID");
    }

    get meetingPassword(): string {
        return this.get("meetingPassword");
    }

    get requireRegistration(): boolean {
        return this.get("requireRegistration");
    }

    get startTime(): number {
        return this.get("startTime");
    }

    get start_url(): string {
        return this.get("start_url");
    }

    get conference(): Conference {
        return this.get("conference");
    }

    get hostAccount(): ZoomHostAccount {
        return this.get("hostAccount");
    }

    get programRoom(): ProgramRoom {
        return this.get("programRoom");
    }

}
Parse.Object.registerSubclass('ZoomRoom', ZoomRoom);
