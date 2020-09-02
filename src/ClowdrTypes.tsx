// BCP: (the basic structure is there, but there are a lot more details to be filled in...)
import * as Parse from 'parse';

import ProgramCache from "./components/Session/ProgramCache";
import { Channel } from "twilio-chat/lib/channel";
import { ChatClient } from "./classes";
import {
    Conversation,
    BreakoutRoom,
    UserPresence,
    UserProfile,
    ClowdrInstance,
    SocialSpace,
    User
} from "./classes/ParseObjects";

export type UserSessionToken = string

export type MaybeParseUser = User | null;
export type MaybeUserProfile = UserProfile | null;
export type MaybeClowdrInstance = ClowdrInstance | null;

export interface ClowdrStateHelpers {
    getBreakoutRoom: (id: string, component: React.Component) => Promise<BreakoutRoom | null>;
    cancelBreakoutRoomSubscription: (id: string, component: React.Component) => void;
    setExpandedProgramRoom: (room: Parse.Object | null) => void;
    createOrOpenDM: (profileOfUserToDM: UserProfile) => Promise<void>;
    setActiveConference: (conf: ClowdrInstance) => Promise<void>;
    // `setGlobalState` is so dangerous that it's untypeable!
    //    To give it a type, we would need to know the type of ClowdrState,
    //    which itself includes ClowdrStateHelpers. TypeScript doesn't allow
    //    such loops.
    setGlobalState: (state: any) => void; // TODO: Eradicate this!
    getPresences: (component: React.Component) => void;
    cancelPresenceSubscription: (component: React.Component) => void;
    unmountProfileDisplay: (profileID: string, component: React.Component) => void;
    updateMyPresence: (presence: UserPresence) => Promise<void>;
    userHasWritePermission: (object: Parse.Object) => boolean;
    getDefaultConferenceName: () => string;
}

export interface ClowdrState {
    spaces: Map<string, SocialSpace>;   // TS: Or maybe better a Record??
    user: MaybeParseUser;
    userProfile: MaybeUserProfile;
    isAdmin: boolean;
    isClowdrAdmin: boolean;
    permissions: Array<string>;
    validConferences: Array<ClowdrInstance>;
    currentConference: MaybeClowdrInstance;
    loading: boolean;
    roles: Array<Parse.Role>;
    programCache: ProgramCache;
    helpers: ClowdrStateHelpers;
    chatClient: ChatClient;
    activeSpace: SocialSpace;
    refreshUser(instance?: MaybeClowdrInstance, forceRefresh?: boolean): Promise<MaybeParseUser>;
    isModerator: boolean;
    isManager: boolean;
    isAdmininstrator: boolean;
}

export interface EditableCellProps<T extends Parse.Object> extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: string;  // could be 'any' based on Antd website
    inputType: 'number' | 'text';   // based on Antd website
    record: T;
    index: number;
    children: React.ReactNode;
}

export interface JoinedChatChannel {
    attributes: any; //json object we store in twilio
    conversation?: Conversation;
    members: string[]; //list of userProfileIDs
    channel: Channel;
}
export interface ChatChannelConsumer {
    setJoinedChannels(channels: string[]): void;
    setAllChannels(channels: Channel[]): void;
}
export interface MultiChatApp {
    registerChannelConsumer(consumer: ChatChannelConsumer): void;
    openChat(sid: string, dontBringIntoFocus: boolean): void;
    registerUnreadConsumer(sid: string, category: string, consumer: any): void;
    cancelUnreadConsumer(sid: string, consumer: any): void;

}
