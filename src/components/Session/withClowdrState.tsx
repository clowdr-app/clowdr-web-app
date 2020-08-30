import React from 'react';
import * as H from 'history';

import AuthUserContext from './context';
import Parse, { User, Role, LiveQueryClient } from "parse";
import { notification, Spin } from "antd";
import ChatClient from "../../classes/ChatClient"
import ProgramCache from "./ProgramCache";
import BreakoutRoom from '../../classes/BreakoutRoom';
import UserProfile from '../../classes/UserProfile';
import UserPresence from '../../classes/UserPresence';
import SocialSpace from '../../classes/SocialSpace';
import ClowdrInstance from '../../classes/ClowdrInstance';
import LiveActivity from '../../classes/LiveActivity';
import assert from 'assert';
import { MaybeParseUser, MaybeClowdrInstance, ClowdrStateHelpers } from "../../ClowdrTypes";

interface Props {
    history?: H.History | null;
}

// TS: Use the ones that Jing defined in Util.ts, not these
interface FlairUIData { color: string, tooltip: string }
interface AllFlairData { value: string, color: string, tooltip: string, id: string, priority: number }

interface State {
    // TODO: Fill in the types
    user: any;
    users: any;
    loading: boolean;
    roles: Array<Parse.Role<Parse.Attributes>>;
    currentRoom: any;
    refreshUser: (instance?: MaybeClowdrInstance, forceRefresh?: boolean) => Promise<MaybeParseUser>;
    setSocialSpace: (spaceOrName: string | SocialSpace,
        user?: User,
        userProfile?: UserProfile,
        ignoreChatChannel?: boolean) => void;
    subscribeToBreakoutRooms: any;
    cancelBreakoutRoomsSubscription: any;
    setActiveRoom: any;
    currentConference: ClowdrInstance | null;
    activeRoom: any;
    helpers: ClowdrStateHelpers;
    chatClient: ChatClient;
    parseLive: any;
    presences: any;
    userProfile: UserProfile | null;
    permissions: any;
    leftSidebar: any;
    activeSpace: any;
    spaces: any;
    chatChannel: any;
    programCache: any;
    isAdmin: boolean;
    isModerator: boolean;
    isManager: boolean;
    isClowdrAdmin: boolean;
    flairColors: Record<string, FlairUIData>;
    allFlair: AllFlairData[];  // TS: Call it allFlairs??
    validConferences: Array<ClowdrInstance>;
}

type RoomID = string    // TS: Doesn't belong here?
type UserID = string    // TS: Doesn't belong here?  And should this be the same as the next??
type UserProfileID = string    // TS: Doesn't belong here?
type Subscriber = React.Component;   // TS: What arguments?

// TS: This should be an enumeration of strings -- get all the possibilities from the PrivilegedAction table in the DB
type Permission = string

const withClowdrState = (Component: React.Component<Props, State>) => {
    class WithClowdrState extends React.Component<Props, State> {
        // TS: @Jon - I (BCP) don't understand the logic here very well (Crista doesn't either).  Why do we initialize all these fields of "this" and then copy most of them to this.state??
        //Jon: When we first implemented this, we pushed updates from live queries into sub-components by modifying the state of this context object. Calling setState on the WithClowdrState will result in every component on the page being re-rendered. This is not a good patten. I have been trying to refactor things away so that mostly what is in state are helper methods to expose to components, and any of the actual data is stored as fields of this.
        watchedRoomMembers: Record<RoomID, BreakoutRoom[]>;
        // authCallbacks: ((_:User|null)=>void)[];   // @ Jon: This seems never to be assigned to!
        //Jon: Yes, I think this is no longer used
        // BCP: OK, removing it (and all references to it)
        isLoggedIn: boolean;
        chatWaiters: ((_: ChatClient) => void)[];
        channelChangeListeners: never[]; // TS: Never assigned or used
        //Jon: This can be deleted
        presenceWatchers: React.Component[];  // or: {setState: (arg0: { presences: {}) => void }
        presences: Record<UserID, UserPresence>;
        newPresences: UserPresence[];
        userProfileSubscribers: Record<UserProfileID, Subscriber[]>;
        parseLive: any; // TS: should be Parse.LiveQueryClient, I think, but the type declaration file doesn't seem to include it!
        fetchingUsers: boolean;
        expandedProgramRoom: Parse.Object | null = null;
        parseLivePublicVideosSub: any;
        parseLivePrivateVideosSub: any;
        parseLiveActivitySub: any;
        subscribedToVideoRoomState: any;
        presenceUpdateScheduled: any;
        presenceUpdateTimer: NodeJS.Timeout | null;
        socialSpaceSubscription: any;
        profilesSubscription: any;
        chatClient: any;
        refreshUserPromise: Promise<MaybeParseUser> | null = null;
        user: Parse.User<Parse.Attributes> | null;
        userProfile: Parse.Object<Parse.Attributes> | undefined;
        activePublicVideoRooms: BreakoutRoom[] = [];
        activePublicVideoRoomSubscribers: { [key: string]: React.Component[] } = {};
        mounted: any;
        isAdmin: boolean;
        isModerator: boolean;
        isManager: boolean;
        isClowdrAdmin: boolean;
        activeRoomSubscribers: React.Component[];
        activePrivateVideoRooms: BreakoutRoom[];
        currentConference: ClowdrInstance | null = null;

        constructor(props: Props) {
            super(props);
            this.fetchingUsers = false;
            this.watchedRoomMembers = {};
            // this.authCallbacks = [];
            this.isLoggedIn = false;
            this.chatWaiters = [];
            this.channelChangeListeners = [];
            this.presenceWatchers = [];
            this.presences = {};
            this.newPresences = [];
            this.userProfileSubscribers = {};
            this.presenceUpdateTimer = null;
            this.user = null;
            this.isAdmin = false;
            this.isModerator = false;
            this.isManager = false;
            this.isClowdrAdmin = false;
            this.activeRoomSubscribers = [];
            this.activePrivateVideoRooms = [];

            assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
            assert(process.env.REACT_APP_PARSE_DOMAIN, "REACT_APP_PARSE_DOMAIN not provided.");
            assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");

            this.parseLive = new LiveQueryClient({
                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY,
            });
            this.parseLive.open();

            let exports = {
                getBreakoutRoom: this.getBreakoutRoom.bind(this),
                cancelBreakoutRoomSubscription: this.cancelBreakoutRoomSubscription.bind(this),
                setExpandedProgramRoom: this.setExpandedProgramRoom.bind(this),
                createOrOpenDM: this.createOrOpenDM.bind(this),
                setActiveConference: this.setActiveConference.bind(this),
                setGlobalState: this.setState.bind(this),//well that seems dangerous...
                // ifPermission: this.ifPermission.bind(this),
                getPresences: this.getPresences.bind(this),
                cancelPresenceSubscription: this.cancelPresenceSubscription.bind(this),
                unmountProfileDisplay: this.unmountProfileDisplay.bind(this),
                updateMyPresence: this.updateMyPresence.bind(this),
                userHasWritePermission: this.userHasWritePermission.bind(this),
                getDefaultConferenceName: this.getDefaultConferenceName.bind(this)
            }

            this.state = {
                user: null,
                users: {},
                loading: true,
                roles: [],
                currentRoom: null,
                refreshUser: this.refreshUser.bind(this),
                setSocialSpace: this.setSocialSpace.bind(this),
                setActiveRoom: this.setActiveRoom.bind(this),
                currentConference: null,
                activeRoom: null,
                helpers: exports,
                subscribeToBreakoutRooms: this.subscribeToBreakoutRooms.bind(this),
                cancelBreakoutRoomsSubscription: this.cancelBreakoutRoomsSubscription.bind(this),
                chatClient: new ChatClient(),
                parseLive: this.parseLive,
                presences: {},
                userProfile: null,
                permissions: null,
                leftSidebar: null,
                activeSpace: null,
                spaces: null,
                chatChannel: null,
                programCache: null,
                isAdmin: false,
                isModerator: false,
                isManager: false,
                isClowdrAdmin: false,
                flairColors: {},
                allFlair: [],
                validConferences: [],
            };
        }

        async updateMyPresence(presence: UserPresence) {
            assert(this.state.userProfile, "User profile is null");
            this.presences[this.state.userProfile.id] = presence;
            for (let presenceWatcher of this.presenceWatchers) {
                presenceWatcher.setState({ presences: this.presences });
            }
        }

        async createOrOpenDM(profileOfUserToDM: UserProfile) {
            assert(this.state.userProfile, "User profile is null");
            if (profileOfUserToDM.id === this.state.userProfile.id) {
                // Prevent DM'ing oneself
                return;
            }

            // Look to see if we already have a chat set up with this person
            let channels = this.state.chatClient.joinedChannels;
            if (channels) {
                // TS: The "any" should be cleaned up after ChatClient is converted -- some kind of Twilio thing??
                let found = Object.values(channels).find((chan: any) => {
                    if (!chan || !chan.conversation)
                        return false;
                    let convo = chan.conversation;
                    if (chan.channel.attributes && chan.channel.attributes.mode === "group")
                        return false;
                    if (convo.get("isDM") === true &&
                        (convo.get("member2").id === profileOfUserToDM.id ||
                            convo.get("member1").id === profileOfUserToDM.id))
                        return true;
                    return false;
                })
                if (found) {
                    this.state.chatClient.openChat(found.channel.sid);
                    return;
                }
            }

            assert(this.state.currentConference, "Current conference is null");
            console.log("calling create DM")
            let res = await Parse.Cloud.run("chat-createDM", {
                confID: this.state.currentConference.id,
                conversationName: profileOfUserToDM.get("displayName"),
                messageWith: profileOfUserToDM.id
            });
            if (res.status === "ok")
                await this.state.chatClient.openChat(res.sid);
        }

        setExpandedProgramRoom(programRoom: Parse.Object | null) {
            this.expandedProgramRoom = programRoom;
            if (this.state.leftSidebar) {
                this.state.leftSidebar.setExpandedProgramRoom(programRoom);
            }
        }

        conferenceChanged() {
            if (this.parseLivePublicVideosSub) {
                this.parseLivePublicVideosSub.unsubscribe();
            }
            if (this.parseLivePrivateVideosSub) {
                this.parseLivePrivateVideosSub.unsubscribe();
            }
            if (this.parseLiveActivitySub) {
                this.parseLiveActivitySub.unsubscribe();
            }
            if (this.subscribedToVideoRoomState) {
                this.subscribedToVideoRoomState = false;
                this.subscribeToVideoRoomState();
            }
        }
        subscribeToVideoRoomState() {
            throw new Error("Method not implemented.");
        }
        async setActiveConference(conf: ClowdrInstance) {
            console.log('[wA]: changing conference to ' + conf.get("conferenceName"));
            this.refreshUser(conf, true);
        }

        setActiveRoom(room: Parse.Object) {
            this.setState({ activeRoom: room });
        }

        async setActiveConferenceByName(confName: string) {
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("conferenceName", confName);
            let res = await confQ.first();
            this.refreshUser(res, true);
            return res;
        }

        getPresences(component: React.Component) {
            this.presenceWatchers.push(component);
            component.setState({ presences: this.presences });
        }
        unmountProfileDisplay(profileID: string, component: React.Component) {
            if (this.userProfileSubscribers[profileID])
                this.userProfileSubscribers[profileID] = this.userProfileSubscribers[profileID].filter(c => c !== component);
        }
        cancelPresenceSubscription(component: React.Component) {
            this.presenceWatchers = this.presenceWatchers.filter(v => v !== component);
        }
        updateProfile(profile: UserProfile) {
            if (this.userProfileSubscribers[profile.id]) {
                for (let subscriber of this.userProfileSubscribers[profile.id]) {
                    subscriber.setState({ profile: profile });
                }
            }

        }
        updatePresences() {
            if (this.presenceUpdateScheduled) {
                return;
            }
            else {
                this.presenceUpdateScheduled = true;
                this.presenceUpdateTimer = setTimeout(async () => {
                    let newPresences = this.newPresences;
                    this.newPresences = [];
                    this.presenceUpdateScheduled = false;
                    for (let presence of newPresences) {
                        this.presences[presence.get("user").id] = presence;
                    }
                    for (let presenceWatcher of this.presenceWatchers) {
                        presenceWatcher.setState({ presences: this.presences });
                    }
                }, 10000 + Math.random() * 5000);
            }
        }

        async createSocialSpaceSubscription(user: Parse.User<Parse.Attributes>, userProfile: UserProfile) {
            if (this.socialSpaceSubscription) {
                this.socialSpaceSubscription.unsubscribe();
            }
            if (!user)
                user = this.state.user;
            if (!userProfile) {
                assert(this.state.userProfile, "User profile is null");
                userProfile = this.state.userProfile;
            }
            this.subscribeToPublicRooms()

            let query = new Parse.Query("UserPresence");
            query.limit(2000);
            query.equalTo("conference", this.currentConference);
            query.equalTo("isOnline", true);


            this.socialSpaceSubscription = this.state.parseLive.subscribe(query, user.getSessionToken());
            this.socialSpaceSubscription.on('create', (presence: UserPresence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('enter', (presence: UserPresence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('delete', (presence: UserPresence) => {
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('leave', (presence: UserPresence) => {
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('update', (presence: UserPresence) => {
                this.presences[presence.get("user").id] = presence;
                this.updatePresences();
            })

            let presences = await query.find();
            for (let presence of presences) {
                this.presences[presence.get("user").id] = presence;
            }
            this.updatePresences();
        }

        /**
         * Sets the user's current social space.
         */
        async setSocialSpace(
            spaceOrName: string | SocialSpace,
            user?: User,
            userProfile?: UserProfile,
            ignoreChatChannel: boolean = false) {

            let spaceName: string;
            let space: SocialSpace;
            if (typeof spaceOrName === "string") {
                spaceName = spaceOrName;
                space = this.state.spaces[spaceName];
            }
            else {
                space = spaceOrName;
                spaceName = spaceOrName.get("name");
            }

            if (!user) {
                if (!this.state.user) {
                    // user is not logged in
                    return;
                }

                user = this.state.user;
            }

            if (!this.state.activeSpace || spaceName !== this.state.activeSpace.get("name")) {
                if (!userProfile) {
                    assert(this.state.userProfile, "User profile is null");
                    userProfile = this.state.userProfile;
                }

                if (userProfile.get("presence") &&
                    (!userProfile.get("presence").get("socialSpace") ||
                        userProfile.get('presence').get('socialSpace').id !== space.id)) {
                    let presence = userProfile.get("presence");
                    presence.set("socialSpace", space);
                    presence.save();
                }

                if (ignoreChatChannel) {
                    this.state.chatClient.disableRightSideChat();
                }
                else {
                    this.state.chatClient.setRightSideChat(space.get("chatChannel"));
                }

                this.setState({
                    activeSpace: space,
                });
            }
            else {
                this.state.chatClient.setRightSideChat(space.get("chatChannel"));
            }
        }

        refreshUser(preferredConference?: MaybeClowdrInstance, forceRefresh: boolean = false): Promise<MaybeParseUser> {
            if (!this.refreshUserPromise || forceRefresh) {
                let result = this._refreshUser(preferredConference);
                this.refreshUserPromise = result;
                return result;
            } else {
                return this.refreshUserPromise;
            }
        }
        async _refreshUser(preferredConference?: MaybeClowdrInstance): Promise<MaybeParseUser> {

            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    try {

                        if (!_this.isLoggedIn) {
                            _this.isLoggedIn = true;
                            // _this.authCallbacks.forEach((cb) => (cb(user)));
                        }

                        // Valid conferences for this user
                        let profiles = await user.relation("profiles").query().include(["conference", "conference.loggedInText"]).find();
                        let validConferences: ClowdrInstance[] = profiles.map(p => p.get("conference"));
                        // console.log("[withAuth]: valid conferences: " + validConferences.map(c => c.id).join(", "));

                        // Roles for this user
                        const roleQuery = new Parse.Query(Parse.Role);
                        roleQuery.equalTo("users", user);
                        const roles = await roleQuery.find();

                        let isAdmin = _this.state ? _this.state.isAdmin : false;
                        let isModerator = _this.state ? _this.state.isModerator : false;
                        let isManager = _this.state ? _this.state.isManager : false;
                        let isClowdrAdmin = _this.state ? _this.state.isClowdrAdmin : false;

                        // @Jon SHould this be this.state.currentConference ??
                        //Jon: Nope. setState is async, and we need to make sure we read the correct value here that we set above, so don't read from state.
                        let conf = _this.currentConference;
                        let currentProfileID = sessionStorage.getItem("activeProfileID");
                        let activeProfile: UserProfile | null = null;
                        if (currentProfileID) {
                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.include("conference");
                            profileQ.include("tags");
                            profileQ.include("presence")
                            activeProfile = await profileQ.get(currentProfileID);
                            conf = activeProfile.get("conference");
                            if (preferredConference && preferredConference.id !== activeProfile.get("conference").id) {
                                activeProfile = null;
                            }
                        }
                        for (let role of roles) {
                            if (role.get("name") === "ClowdrSysAdmin") {
                                isAdmin = true;
                                isClowdrAdmin = true;
                            }
                            if (activeProfile && role.get("name") === (activeProfile.get("conference").id + "-admin")) {
                                isAdmin = true;
                                isClowdrAdmin = true;
                                isManager = true;
                                isModerator = true;
                            }
                            if (activeProfile && role.get("name") === (activeProfile.get("conference").id + "-moderator")) {
                                isModerator = true;
                            }
                            if (activeProfile && role.get("name") === (activeProfile.get("conference").id + "-manager")) {
                                isModerator = true;
                                isManager = true;
                            }
                        }
                        if (!activeProfile) {
                            if (!preferredConference) {
                                let defaultConferenceName = _this.getDefaultConferenceName();
                                let confQ = new Parse.Query("ClowdrInstance")
                                confQ.equalTo("conferenceName", defaultConferenceName);
                                conf = await confQ.first() as (ClowdrInstance | null);
                                if (!conf) {
                                    console.error("Default conference doesn't exist in the database!");
                                    throw new Error("Defalt conference doesn't exist in the database.");
                                }
                            }
                            else {
                                conf = validConferences.find((c) => c.id === preferredConference.id)
                                    || validConferences[0];
                            }

                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.equalTo("conference", conf);
                            profileQ.equalTo("user", user);
                            profileQ.include("tags");
                            activeProfile = await profileQ.first() || null; // TODO
                            assert(activeProfile, "Active profile is null");
                            sessionStorage.setItem("activeProfileID", activeProfile.id);

                            window.location.reload(false);
                        }
                        const privsQuery = new Parse.Query("InstancePermission");
                        privsQuery.equalTo("conference", activeProfile.get("conference"));
                        privsQuery.include("action");
                        let permissions = await privsQuery.find();

                        const spacesQ = new Parse.Query("SocialSpace");
                        spacesQ.limit(1000);
                        spacesQ.equalTo("conference", activeProfile.get("conference"));
                        let spaces = await spacesQ.find();
                        let spacesByName: Record<string, Parse.Object> = {};
                        for (let space of spaces) {
                            spacesByName[space.get("name")] = space;
                        }
                        let priorConference = _this.state.currentConference;
                        _this.currentConference = conf;
                        _this.user = user;
                        _this.userProfile = activeProfile;
                        _this.state.chatClient.initChatClient(user, conf, activeProfile);

                        try {
                            await _this.setSocialSpace(spacesByName['Lobby'], user, activeProfile);
                            await _this.createSocialSpaceSubscription(user, activeProfile);
                        } catch (err) {
                            console.warn("[withAuth]: warn", err);
                        }

                        let finishedStateFn: ((value?: unknown) => void) | null = null;
                        let stateSetPromise = new Promise((resolve) => {
                            finishedStateFn = resolve;
                        });
                        _this.setState(() => {
                            return ({
                                spaces: spacesByName,
                                user: user,
                                userProfile: activeProfile,
                                isAdmin: isAdmin,
                                isModerator: isModerator,
                                isManager: isManager,
                                isClowdrAdmin: isClowdrAdmin,
                                permissions: permissions.map(p => p.get("action").get("action")),
                                validConferences: validConferences,
                                currentConference: conf,
                                loading: false,
                                roles: roles,
                                programCache: new ProgramCache(conf, _this.parseLive),
                            });
                        }, () => {
                            assert(finishedStateFn);
                            finishedStateFn()
                        });
                        await stateSetPromise;
                        // @ts-ignore    TS: @Jon: ... This is why we think the initialization of conf is wrong!
                        if (priorConference && conf && priorConference.id !== conf.id) {
                            window.location.reload(false);
                        }
                        _this.forceUpdate();
                        return user;
                    } catch (err) {
                        console.error("[withAuth]: err", err);
                        //TODO uncomment
                        try {
                            _this.setState({ loading: false, user: null });
                            await Parse.User.logOut();
                        } catch (err2) {
                            console.error(err2);
                        }

                        // TODO: This is less than ideal - but because App.js is unrouted,
                        //       it's possible to reach this code without a router available
                        if (_this.props.history) {
                            _this.props.history.push("/signin")
                        }

                        return null;
                    }
                } else {
                    let currentProfileID = sessionStorage.getItem("activeProfileID");
                    if (currentProfileID) {
                        sessionStorage.removeItem("activeProfileID");
                        window.location.reload();
                    }
                    if (_this.isLoggedIn) {
                        _this.isLoggedIn = false;
                        // _this.authCallbacks.forEach((cb) => (cb(null)));
                    }
                    if (_this.chatClient) {
                        await _this.chatClient.shutdown();
                        _this.chatClient = null;
                    }
                    let conference: ClowdrInstance | null = null;
                    let defaultConferenceName = _this.getDefaultConferenceName();
                    let confQ = new Parse.Query("ClowdrInstance")
                    confQ.equalTo("conferenceName", defaultConferenceName);
                    conference = await confQ.first() || null;
                    _this.setState({
                        user: null,
                        currentConference: conference,
                        programCache: new ProgramCache(conference, _this.parseLive),
                        loading: false,
                        users: {}
                    })

                    return null;
                }
                // do stuff with your user
            });
        }

        getDefaultConferenceName() {
            let defaultConferenceName = process.env.REACT_APP_DEFAULT_CONFERENCE;
            let hostname = window.location.hostname;
            // TODO: Ed: This seems like a pretty flaky way to detect the conference name
            if (hostname && (hostname.endsWith("clowdr.org") || hostname.endsWith("clowdr.internal"))) {
                let confHostname = hostname.substring(0, hostname.indexOf('.'));
                defaultConferenceName = confHostname.substring(0, confHostname.indexOf('2'));
                defaultConferenceName = defaultConferenceName + " " + confHostname.substring(confHostname.indexOf('2'));
                defaultConferenceName = defaultConferenceName.toUpperCase();
            }
            if (!defaultConferenceName) {
                throw new Error("REACT_APP_DEFAULT_CONFERENCE environment variable not provided!");
            }
            return defaultConferenceName;
        }

        cancelBreakoutRoomsSubscription(component: React.Component) {
            this.activeRoomSubscribers = this.activeRoomSubscribers.filter(v => v !== component);
        }
        subscribeToBreakoutRooms(component: React.Component) {
            this.activeRoomSubscribers.push(component);
            component.setState({
                activePublicVideoRooms: this.activePublicVideoRooms,
                activePrivateVideoRooms: this.activePrivateVideoRooms
            })
        }

        async getBreakoutRoom(id: string, component: React.Component) {
            let room = this.activePublicVideoRooms.find((v: { id: string; }) => v.id === id) || null;
            if (room) {
                if (!this.activePublicVideoRoomSubscribers[id]) {
                    this.activePublicVideoRoomSubscribers[id] = [];
                }
                this.activePublicVideoRoomSubscribers[id].push(component);
            }
            return room;
        }
        cancelBreakoutRoomSubscription(id: string, component: React.Component) {
            if (this.activePublicVideoRoomSubscribers[id]) {
                this.activePublicVideoRoomSubscribers[id] = this.activePublicVideoRoomSubscribers[id].filter(v => v !== component);
            }
        }
        async subscribeToPublicRooms() {
            if (!this.currentConference) {
                throw new Error("Not logged in");
            }
            let query = new Parse.Query("BreakoutRoom");
            query.equalTo("conference", this.currentConference);
            query.include("members");
            query.include("programItem");
            query.equalTo("isPrivate", false);
            query.limit(1000);
            // query.greaterThanOrEqualTo("updatedAt",date);
            query.find().then(res => {
                if (!this.state.user) {
                    //event race: user is logged out...
                    if (this.parseLivePublicVideosSub) {
                        this.parseLivePublicVideosSub.unsubscribe();
                        return;
                    }
                }
                res.forEach(this.notifyUserOfChanges.bind(this));
                this.activePublicVideoRooms = [...res];
                this.activePublicVideoRoomSubscribers = {};
                if (this.parseLivePublicVideosSub) {
                    this.parseLivePublicVideosSub.unsubscribe();
                }
                assert(this.user);
                this.parseLivePublicVideosSub = this.state.parseLive.subscribe(query, this.user.getSessionToken());
                this.parseLivePublicVideosSub.on('create', async (vid: BreakoutRoom) => {
                    this.activePublicVideoRooms.push(vid);
                    for (let obj of this.activeRoomSubscribers) {
                        obj.setState({ activePublicVideoRooms: this.activePublicVideoRooms.concat([]) });
                    }
                })
                this.parseLivePublicVideosSub.on("delete", (vid: BreakoutRoom) => {
                    this.activePublicVideoRooms = this.activePublicVideoRooms.filter((v: BreakoutRoom) => v.id !== vid.id);
                    for (let obj of this.activeRoomSubscribers) {
                        obj.setState({ activePublicVideoRooms: this.activePublicVideoRooms.concat([]) });
                    }
                });
                this.parseLivePublicVideosSub.on('update', async (vid: BreakoutRoom) => {
                    this.notifyUserOfChanges(vid);
                    this.activePublicVideoRooms = this.activePublicVideoRooms.map((room: BreakoutRoom) => room.id === vid.id ? vid : room);
                    for (let obj of this.activeRoomSubscribers) {
                        obj.setState({ activePublicVideoRooms: this.activePublicVideoRooms.concat([]) });
                    }
                    if (this.activePublicVideoRoomSubscribers[vid.id])
                        for (let obj of this.activePublicVideoRoomSubscribers[vid.id])
                            obj.setState({ BreakoutRoom: vid });
                })
            })

            let queryForPrivateActivity = new Parse.Query("LiveActivity");
            queryForPrivateActivity.equalTo("conference", this.currentConference);
            // queryForPrivateActivity.equalTo("topic", "privateBreakoutRooms");
            queryForPrivateActivity.equalTo("user", this.user);
            await this.subscribeToNewPrivateRooms();
            assert(this.user);
            this.parseLiveActivitySub = this.state.parseLive.subscribe(queryForPrivateActivity, this.user.getSessionToken());
            this.parseLiveActivitySub.on('create', this.handleNewParseLiveActivity.bind(this));
            this.parseLiveActivitySub.on("update", this.handleNewParseLiveActivity.bind(this));
        }

        handleNewParseLiveActivity(activity: LiveActivity) {  // TS: ???
            if (activity.get("topic") === "privateBreakoutRooms") {
                // @ts-ignore  @Jon    subscribeToNewPrivateRooms doesn't want an argument
                //Jon: OK, deleted it...
                this.subscribeToNewPrivateRooms();
            } else if (activity.get("topic") === "profile") {
                window.location.reload(true);
            }
        }
        notifyUserOfChanges(updatedRoom: BreakoutRoom) {
            if (!this.state.userProfile)
                return;
            let oldRoom = this.watchedRoomMembers[updatedRoom.id];
            if (!oldRoom) {
                this.watchedRoomMembers[updatedRoom.id] = [];
                if (updatedRoom.get("members")) {
                    this.watchedRoomMembers[updatedRoom.id] = updatedRoom.get("members").filter((m: UserProfile) => m.id !== this.state.user.id).map((m: UserProfile) => m.get("displayName"));
                }
            }
            if (updatedRoom && oldRoom && this.state.userProfile.get("watchedRooms")) {
                if (this.state.userProfile.get("watchedRooms").find((r: BreakoutRoom) => r.id === updatedRoom.id)) {
                    //We have a watch on it.

                    //Who is new?
                    let update: UserProfile[] = [];
                    if (updatedRoom.get("members")) {
                        update = updatedRoom.get("members").filter((m: UserProfile) => m.id !== this.state.user.id).map((m: UserProfile) => m.get("displayName"));
                    }
                    let newUsers = update.filter(u => !oldRoom.includes(u));
                    let goneUsers = oldRoom.filter(u => !update.includes(u));
                    if (newUsers.length) {
                        notification.info({
                            message: "Activity in " + updatedRoom.get("title"),
                            description: newUsers.join(", ") + (newUsers.length > 1 ? " have" : " has") + " joined. To turn off these notifications, select the room '" + updatedRoom.get("title") + "' and un-follow it",
                            placement: 'topLeft',
                        });
                    }
                    if (goneUsers.length) {
                        notification.info({
                            message: "Activity in " + updatedRoom.get("title"),
                            description: goneUsers.join(", ") + (goneUsers.length > 1 ? " have" : " has") + " left. To turn off these notifications, select the room '" + updatedRoom.get("title") + "' and un-follow it",
                            placement: 'topLeft',
                        });
                    }
                    this.watchedRoomMembers[updatedRoom.id] = update;
                }
            }
        }
        async subscribeToNewPrivateRooms() {
            if (!this.mounted) return;
            let newRoomsQuery = new Parse.Query("BreakoutRoom");
            newRoomsQuery.equalTo("conference", this.currentConference);
            newRoomsQuery.include("members");
            newRoomsQuery.equalTo("isPrivate", true)
            newRoomsQuery.limit(100);
            if (this.parseLivePrivateVideosSub) {
                this.parseLivePrivateVideosSub.unsubscribe();
            }
            let res = await newRoomsQuery.find();
            if (!this.mounted) return;
            res.forEach(this.notifyUserOfChanges.bind(this));

            let fetchedIDs = [];
            this.activePrivateVideoRooms = res;
            for (let room of res) {
                fetchedIDs.push(room.id);
            }

            assert(this.user);
            this.parseLivePrivateVideosSub = this.state.parseLive.subscribe(newRoomsQuery, this.user.getSessionToken());
            this.parseLivePrivateVideosSub.on("update", async (vid: BreakoutRoom) => {
                this.activePrivateVideoRooms = this.activePrivateVideoRooms.map((room: BreakoutRoom) => room.id === vid.id ? vid : room);
                for (let obj of this.activeRoomSubscribers) {
                    obj.setState({ activePrivateVideoRooms: this.activePrivateVideoRooms });
                }
            });
            this.parseLivePrivateVideosSub.on("create", async (vid: BreakoutRoom) => {
                this.activePrivateVideoRooms.push(vid);
                for (let obj of this.activeRoomSubscribers) {
                    obj.setState({ activePrivateVideoRooms: this.activePrivateVideoRooms });
                }
            });
            this.parseLivePrivateVideosSub.on("delete", (vid: BreakoutRoom) => {
                this.activePrivateVideoRooms = this.activePrivateVideoRooms.filter((v: BreakoutRoom) => v.id !== vid.id);
                for (let obj of this.activeRoomSubscribers) {
                    obj.setState({ activePrivateVideoRooms: this.activePrivateVideoRooms });
                }
            })
            this.parseLivePrivateVideosSub.on("leave", (vid: BreakoutRoom) => {
                this.activePrivateVideoRooms = this.activePrivateVideoRooms.filter((v: BreakoutRoom) => v.id !== vid.id);
                for (let obj of this.activeRoomSubscribers) {
                    obj.setState({ activePrivateVideoRooms: this.activePrivateVideoRooms });
                }
            })
        }

        userHasWritePermission(object: Parse.Object) {
            let acl = object.getACL();
            assert(acl && this.user);
            if (acl.getWriteAccess(this.user))
                return true;
            if (this.state.roles.find((v: Role) => this.state.currentConference && (v.get('name') === this.state.currentConference.id + '-manager' || v.get('name') === this.state.currentConference.id + "-admin")))
                return true;
            return false;
        }

        componentDidMount() {
            const Flair = Parse.Object.extend("Flair");
            const query = new Parse.Query(Flair);
            let _this = this;
            query.find().then((u) => {
                //convert to something that the dom will be happier with
                let res: AllFlairData[] = [];
                let flairColors: Record<string, FlairUIData> = {};
                for (let flair of u) {
                    flairColors[flair.get("label")] = { color: flair.get("color"), tooltip: flair.get("tooltip") };
                    res.push({
                        value: flair.get("label"), color: flair.get("color"), id: flair.id, tooltip: flair.get("tooltip"),
                        priority: flair.get("priority")
                    })
                }
                _this.setState({
                    flairColors: flairColors,
                    allFlair: res,
                });
            }).catch((err) => {

            });

            this.refreshUser();
            this.mounted = true;
        }

        componentWillUnmount() {
            this.mounted = false;
            if (this.socialSpaceSubscription) {
                this.socialSpaceSubscription.unsubscribe();
            }
            if (this.profilesSubscription) {
                this.profilesSubscription.unsubscribe();
            }
            if (this.parseLivePublicVideosSub) {
                this.parseLivePublicVideosSub.unsubscribe();
            }
            if (this.parseLivePrivateVideosSub) {
                this.parseLivePrivateVideosSub.unsubscribe();
            }
            if (this.parseLiveActivitySub) {
                this.parseLiveActivitySub.unsubscribe();
            }
        }

        render() {
            if (this.state.loading)
                return <Spin size="large" />
            return (
                // @ts-ignore
                //Jon: I think that the Context needs to have the clowdrappstate as a type parameter? I'm not sure how to use contexts with react+typescript.
                <AuthUserContext.Provider value={this.state}>
                    {/* @ts-ignore */}
                    <Component {...this.props} clowdrAppState={this.state} parseLive={this.state.parseLive} />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithClowdrState;
};

export default withClowdrState;
