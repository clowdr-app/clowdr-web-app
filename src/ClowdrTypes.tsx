// BCP: (the basic structure is there, but there are a lot more details to be filled in...)

import * as Parse from 'parse';
import ProgramCache from "./components/Session/ProgramCache";
import ChatClient from "./classes/ChatClient";
import {History} from "history";
import Conversation from "./classes/Conversation";
import {Channel} from "twilio-chat/lib/channel";
// Is this one needed?
// import ProgramItem from "./classes/ProgramItem";

type UserProfile = any
type ClowdrInstance = any
type SocialSpace = any
type Role = any

export type UserSessionToken = string

export interface ClowdrState {
    spaces: Map<string, SocialSpace>;   // TS: Or maybe better a Record??
    user: Parse.User | null;
    userProfile: UserProfile | null;
    isAdmin: boolean;
    isClowdrAdmin: boolean;
    permissions: Array<string>;
    validConferences: Array<ClowdrInstance>;
    currentConference: ClowdrInstance | null;
    loading: boolean;
    roles: Array<Role>;
    programCache: ProgramCache;
    helpers: any;
    getChatClient: any;  // should be a function (higher-order?)
    getLiveChannel: any;
    chatClient: ChatClient;
    history: History;
    activeSpace: any;
    getUserProfile(authorID: string, arg1: (u: any) => void) : any;   // ???
}

export interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: string;  // could be 'any' based on Antd website
    inputType: 'number' | 'text';   // based on Antd website
    record: Parse.Object;
    index: number;
    children: React.ReactNode;
}

export interface JoinedChatChannel {
    attributes: any; //json object we store in twilio
    conversation?: Conversation;
    members: string[]; //list of userProfileIDs
    channel: Channel;
}
export interface ChatChannelConsumer{
    setJoinedChannels(channels: string[]): void;
    setAllChannels(channels: Channel[]): void;
}
export interface MultiChatApp{
    registerChannelConsumer(consumer: ChatChannelConsumer): void;
    openChat(sid: string, dontBringIntoFocus: boolean): void;
    registerUnreadConsumer(sid: string, consumer: any): void;
    cancelUnreadConsumer(sid: string, consumer: any): void;

}
/* 

Some more fields that might be needed (copied from withAuthentication.js -- are they relevant?)
{
                currentRoom: null,
                history: this.props.history,
                refreshUser: this.refreshUser.bind(this),
                getChatClient: this.getChatClient.bind(this),
                setSocialSpace: this.setSocialSpace.bind(this),
                getConferenceBySlackName: this.getConferenceBySlackName.bind(this),
                setActiveRoom: this.setActiveRoom.bind(this),
                activeRoom: null,
                helpers: exports,
                chatClient: new ChatClient(this.setState.bind(this)),
                parseLive: this.parseLive,
                presences: {},
                // video: {
                videoRoomsLoaded: false,
                    liveVideoRoomMembers: 0,
                    activePublicVideoRooms: [],
                    activePrivateVideoRooms: [],
                // },

            }
And:

let exports ={
                unwrappedProfiles: this.unwrappedProfiles,
                setExpandedProgramRoom: this.setExpandedProgramRoom.bind(this),
                presences: this.presences,
                getUsers: this.getUsers.bind(this),
                createOrOpenDM: this.createOrOpenDM.bind(this),
                getRoleByName: this.getRoleByName.bind(this),
                setActiveConference: this.setActiveConference.bind(this),
                populateMembers: this.populateMembers.bind(this),
                setGlobalState: this.setState.bind(this),//well that seems dangerous...
                getUserProfilesFromUserIDs: this.getUserProfilesFromUserIDs.bind(this),
                getUserProfilesFromUserProfileIDs: this.getUserProfilesFromUserProfileIDs.bind(this),
                getUserProfilesFromUserProfileID: this.getUserProfilesFromUserProfileID.bind(this),
                ifPermission: this.ifPermission.bind(this),
                getUserRecord: this.getUserRecord.bind(this),
                getPresences: this.getPresences.bind(this),
                cancelPresenceSubscription: this.cancelPresenceSubscription.bind(this),
                unmountProfileDisplay: this.unmountProfileDisplay.bind(this),
                updateMyPresence: this.updateMyPresence.bind(this)
            }
*/