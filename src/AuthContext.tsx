import * as Parse from 'parse';

/* This all might belong somewhere else? Or rename the file Types.ts? */
type UserProfile = any
type ClowdrInstance = any
type SocialSpace = any
type ProgramCache = any
type Role = any
export type ID = string

export interface AuthContext {
    spaces: Map<string, SocialSpace>;   // Crista said Dictionary, but I think she meant Map
    user: Parse.User | null;
    userProfile: UserProfile | null;
    teamID: ID | null;
    isAdmin: Boolean;
    isClowdrAdmin: Boolean;
    permissions: Array<string>;
    validConferences: Array<ClowdrInstance>;
    currentConference: ClowdrInstance | null;
    loading: Boolean;
    roles: Array<Role>;
    programCache: ProgramCache;
    helpers: any;
    getChatClient: any;  // should be a function (higher-order?)
    getLiveChannel: any;
    getUserProfile(authorID: string, arg1: (u: any) => void) : any;   // ???
}

/*
Some more fields that might belong (copied from withAuthentication.js -- are they relevant?)
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