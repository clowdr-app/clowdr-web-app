import Parse from "parse";
import { BreakoutRoom as Schema } from '../DBSchema/BreakoutRoom';
import ClowdrInstance from "./ClowdrInstance";
import Conversation from "./Conversation";
import UserProfile from "./UserProfile";
import ProgramItem from "./ProgramItem";

export default class BreakoutRoom
    extends Parse.Object
    implements Schema {

    constructor() {
        super("BreakoutRoom");
    }

    get capacity(): number {
        return this.get("capacity");
    }

    get isPrivate(): boolean {
        return this.get("isPrivate");
    }

    get mode(): "group" | "peer-to-peer" | "group-small" {
        return this.get("mode");
    }

    get persistence(): "ephemeral" | "persistent" {
        return this.get("persistence");
    }

    get title(): string {
        return this.get("title");
    }

    get twilioChatID(): string {
        return this.get("twilioChatID");
    }

    get twilioID(): string {
        return this.get("twilioID");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

    get conversation(): Conversation {
        return this.get("conversation");
    }

    get members(): Array<UserProfile> {
        return this.get("members");
    }

    get programItem(): ProgramItem {
        return this.get("programItem");
    }

    get watchers(): Array<UserProfile> {
        return this.get("watchers");
    }

}
Parse.Object.registerSubclass('BreakoutRoom', BreakoutRoom);
