import Parse from "parse";
import { BreakoutRoom as Schema, BreakoutRoomFields } from '../DBSchema/BreakoutRoom';
import { Conference } from "./Conference";
import { Conversation } from "./Conversation";
import { UserProfile } from "./UserProfile";
import { ProgramItem } from "./ProgramItem";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { Conversation as ConversationSchema, ConversationFields } from "../DBSchema/Conversation";
import { UserProfile as UserProfileSchema, UserProfileFields } from "../DBSchema/UserProfile";
import { ProgramItem as ProgramItemSchema, ProgramItemFields } from "../DBSchema/ProgramItem";

export type RoomModes = "group" | "peer-to-peer" | "group-small";
export type RoomPersistence = "ephemeral" | "persistent";

export class BreakoutRoom extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("BreakoutRoom", BreakoutRoomFields, value, dbValue);
    }

    get capacity(): number | Promise<number> {
        return this.get("capacity");
    }

    get isPrivate(): boolean | Promise<boolean> {
        return this.get("isPrivate");
    }

    get mode(): RoomModes | Promise<RoomModes> {
        return this.get("mode");
    }

    get persistence(): RoomPersistence | Promise<RoomPersistence> {
        return this.get("persistence");
    }

    get title(): string | Promise<string> {
        return this.get("title");
    }

    get twilioChatID(): string | Promise<string> {
        return this.get("twilioChatID");
    }

    get twilioID(): string | Promise<string> {
        return this.get("twilioID");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get conversation(): Conversation | Promise<Conversation> {
        return this.related<ConversationSchema, Conversation>("conversation", ConversationFields, Conversation);
    }

    get members(): Array<UserProfile> | Promise<Array<UserProfile>> {
        return this.relatedMany<UserProfileSchema, UserProfile>("members", UserProfileFields, UserProfile);
    }

    get programItem(): ProgramItem | Promise<ProgramItem> {
        return this.related<ProgramItemSchema, ProgramItem>("programItem", ProgramItemFields, ProgramItem);
    }

    get watchers(): Array<UserProfile> | Promise<Array<UserProfile>> {
        return this.relatedMany<UserProfileSchema, UserProfile>("watchers", UserProfileFields, UserProfile);
    }

}
