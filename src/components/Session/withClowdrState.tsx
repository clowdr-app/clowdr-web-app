import React from 'react';

import AuthUserContext from './context';
import Parse, { User, Role } from "parse";
import {notification, Spin} from "antd";
import ChatClient from "../../classes/ChatClient"
import ProgramCache from "./ProgramCache";
import { RoomInvalidParametersError } from 'twilio-video';
import BreakoutRoom from '../../classes/BreakoutRoom';
import UserProfile from '../../classes/UserProfile';
import UserPresence from '../../classes/UserPresence';
import SocialSpace from '../../classes/SocialSpace';
import ClowdrInstance from '../../classes/ClowdrInstance';
import LiveActivity from '../../classes/LiveActivity';
import { assert } from '../../Util';

// TS: Push through the change to Props/State globally!
interface Props {
    history: string[];   
} 

// TS: Use the ones that Jing defined in Util.ts, not these
interface FlairUIData {color: string, tooltip: string}
interface AllFlairData {value: string, color: string, tooltip: string, id: string, priority: number}

interface State {
    // TS: Fill in the types!
    user: any,
    users: any,
    loading: boolean,
    roles: any,
    currentRoom: any,
    history: string[] | undefined,
    refreshUser: any,
    getChatClient: any,
    setSocialSpace: any,
    getConferenceBySlackName: any,
    setActiveRoom: any,
    currentConference: ClowdrInstance | undefined | null,  // TS: Really??
    activeRoom: any,
    helpers: any,
    chatClient: any,
    parseLive: any,
    presences: any,
    videoRoomsLoaded: boolean,
    liveVideoRoomMembers: any,
    activePublicVideoRooms: BreakoutRoom[],
    activePrivateVideoRooms: BreakoutRoom[],
    userProfile: UserProfile | null,  // TS: Or should it be undefined??
    permissions: any,
    leftSidebar: any,
    activeSpace: any,
    spaces: any,
    chatChannel: any,
    programCache: any,
    isAdmin: boolean;
    isModerator: boolean;
    isManager: boolean;
    isClowdrAdmin: boolean;
    flairColors: Record<string,FlairUIData>;
    allFlair: AllFlairData[];  // TS: Call it allFlairs??
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
        watchedRoomMembers: Record<RoomID,BreakoutRoom[]>;
        // authCallbacks: ((_:User|null)=>void)[];   // @ Jon: This seems never to be assigned to!
        //Jon: Yes, I think this is no longer used
        // BCP: OK, removing it (and all references to it)
        isLoggedIn: boolean;
        // TS: What is the difference between the next two things??
        //Jon: One is a list of all of the profiles that have been loaded, another of promises to load them.
        loadingProfiles: Record<UserProfileID, (_:UserProfile)=>void>;
        userProfiles: Record<UserID, Promise<UserProfile>>;
        unwrappedProfiles: Record<UserID, UserProfile>;
        chatWaiters: ((_:ChatClient)=>void)[];  
        channelChangeListeners: never[]; // TS: Never assigned or used
        //Jon: This can be deleted
        presenceWatchers: React.Component[];  // or: {setState: (arg0: { presences: {}) => void }
        presences: Record<UserID, UserPresence>;  
        newPresences: UserPresence[];
        userProfileSubscribers: Record<UserProfileID, Subscriber[]>;
        parseLive: any; // TS: should be Parse.LiveQueryClient, I think, but the type declaration file doesn't seem to include it!
        fetchingUsers: boolean;
        expandedProgramRoom: any;
        usersPromise: any;
        parseLivePublicVideosSub: any;
        parseLivePrivateVideosSub: any;
        parseLiveActivitySub: any;
        subscribedToVideoRoomState: any;
        presenceUpdateScheduled: any;
        presenceUpdateTimer: NodeJS.Timeout | null;
        socialSpaceSubscription: any;
        profilesSubscription: any;
        chatClient: any;
        refreshUserPromise: any;
        user: Parse.User<Parse.Attributes> | null;
        userProfile: Parse.Object<Parse.Attributes> | undefined;
        activePublicVideoRooms: any;
        activePublicVideoRoomSubscribers: any;
        mounted: any;
        isAdmin: boolean;
        isModerator: boolean;
        isManager: boolean;
        isClowdrAdmin: boolean;

        constructor(props: Props) {
            super(props);
            this.fetchingUsers = false;   
            this.watchedRoomMembers = {};
            // this.authCallbacks = [];
            this.isLoggedIn = false;
            this.loadingProfiles = {};
            this.userProfiles = {};
            this.unwrappedProfiles = {};
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

            // @ts-ignore     TS: Again, this seems to exist in the Parse library but not its type declarations!
            this.parseLive = new Parse.LiveQueryClient({
                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY,
            });
            this.parseLive.open();

            let exports = {
                getBreakoutRoom: this.getBreakoutRoom.bind(this),
                cancelBreakoutRoomSubscription: this.cancelBreakoutRoomSubscription.bind(this),
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
                updateMyPresence: this.updateMyPresence.bind(this),
                userHasWritePermission: this.userHasWritePermission.bind(this),
                getDefaultConferenceName: this.getDefaultConferenceName.bind(this)
            }

            this.state = {   // (JS usage question: Should we be initializing things with null, or undefined???)
                user: null,
                users: {},
                loading: true,
                roles: [],
                currentRoom: null,
                history: this.props.history,
                refreshUser: this.refreshUser.bind(this),
                getChatClient: this.getChatClient.bind(this),
                setSocialSpace: this.setSocialSpace.bind(this),
                getConferenceBySlackName: this.getConferenceBySlackName.bind(this),
                setActiveRoom: this.setActiveRoom.bind(this),
                currentConference: undefined,
                activeRoom: null,
                helpers: exports,
                chatClient: new ChatClient(this.setState.bind(this)),
                parseLive: this.parseLive,
                presences: {},
                videoRoomsLoaded: false,
                liveVideoRoomMembers: 0,
                activePublicVideoRooms: [],
                activePrivateVideoRooms: [],
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
            };
        }

        async updateMyPresence(presence: UserPresence) {
            assert (this.state.userProfile);
            this.presences[this.state.userProfile.id] = presence;
            for(let presenceWatcher of this.presenceWatchers){
                presenceWatcher.setState({presences: this.presences});
            }
        }

        async createOrOpenDM(profileOfUserToDM: UserProfile) {
            assert (this.state.userProfile !== null);
            // @ Jon: Do we really want to prevent this case?  Crista likes DMing herself!
            // Jon: Yes, it is confusing, and no other chat platofrm allows it...
            if (profileOfUserToDM.id == this.state.userProfile.id) return
            // Look to see if we already have a chat set up with this person
            let channels = this.state.chatClient.joinedChannels;
            if (channels) {
                // TS: The "any" should be cleaned up after ChatClient is converted -- some kind of Twilio thing??
                let found = Object.values(channels).find((chan: any) => { 
                    if(!chan || !chan.conversation)
                        return false;
                    let convo = chan.conversation;
                    if(chan.channel.attributes && chan.channel.attributes.mode == "group")
                        return false;
                    if(convo.get("isDM") == true &&
                        (convo.get("member2").id == profileOfUserToDM.id ||
                        convo.get("member1").id == profileOfUserToDM.id))
                        return true;
                    return false;
                })
                if (found) {
                    // @ts-ignore    What is its type?  (Something from Twilio?)
                    console.log(found.channel.sid)
                    // @ts-ignore    What is its type?
                    this.state.chatClient.openChat(found.channel.sid);
                    return;
                }
            }
            assert(this.state.currentConference);
            let res = await Parse.Cloud.run("chat-createDM", {
                confID: this.state.currentConference.id,
                conversationName: profileOfUserToDM.get("displayName"),
                messageWith: profileOfUserToDM.id
            });
            this.state.chatClient.openChat(res.sid);
        }

        // TS: @ Jon: Should this be polymorphic??
        // Jon: I think that this was a half-baked idea and shoudl probably be factored away
        ifPermission(permission: Permission, jsxElement: JSX.Element, elseJsx: JSX.Element) : JSX.Element { // TS; ???
            if (this.state.permissions && this.state.permissions.includes(permission))
                return jsxElement;
            if (elseJsx)
                return elseJsx;
            return  <></>        
        }

        setExpandedProgramRoom(programRoom: Parse.Object) {
            this.expandedProgramRoom = programRoom;
            if (this.state.leftSidebar) {
                this.state.leftSidebar.setExpandedProgramRoom(programRoom);
            }
        }
        getUsers() {
            if (!this.usersPromise)
                this.usersPromise = new Promise(async (resolve, reject) => {
                    let parseUserQ = new Parse.Query(UserProfile)
                    parseUserQ.equalTo("conference", this.state.currentConference);
                    parseUserQ.limit(5000);
                    // @ts-ignore     TS: Apparently the Parse type definitions are not up to date (this was added recently)
                    parseUserQ.withCount();
                    let nRetrieved = 0;
                    // @ts-ignore  TS: @Jon -- need help to figure out what type find is returning!
                    // Jon: an object with fields {count:int, results: UserProfile[]}
                    // @Jon: That is not what TS thinks:
                    // (method) globalThis.Parse.Query<UserProfile>.find(options?: Parse.Query<T extends Parse.Object<Parse.Attributes> = Parse.Object<Parse.Attributes>>.FindOptions | undefined): Promise<UserProfile[]>
                    let {count, results} = await parseUserQ.find();
                    nRetrieved = results.length;
                    let allUsers: any[] = [];   // TS: ???
                    allUsers = allUsers.concat(results);
                    while (nRetrieved < count) {
                        let parseUserQ = new Parse.Query(UserProfile)
                        parseUserQ.skip(nRetrieved);
                        parseUserQ.equalTo("conference", this.state.currentConference);
                        parseUserQ.limit(5000);
                        let results = await parseUserQ.find();
                        // results = dat.results;
                        nRetrieved += results.length;
                        if (results)
                            allUsers = allUsers.concat(results);
                    }
                    let usersByID : Record<string,UserProfile> = {};
                    allUsers.forEach((u:UserProfile)=>usersByID[u.id]=u);
                    resolve(usersByID);
                });
            return this.usersPromise;

        }

        conferenceChanged(){
            if (this.parseLivePublicVideosSub) {
                this.parseLivePublicVideosSub.unsubscribe();
            }
            if (this.parseLivePrivateVideosSub) {
                this.parseLivePrivateVideosSub.unsubscribe();
            }
            if (this.parseLiveActivitySub) {
                this.parseLiveActivitySub.unsubscribe();
            }
            if(this.subscribedToVideoRoomState){
                this.subscribedToVideoRoomState = false;
                this.subscribeToVideoRoomState();
            }
        }
        subscribeToVideoRoomState() {
            throw new Error("Method not implemented.");
        }
        async setActiveConference(conf: Parse.Object) {
            console.log('[wA]: changing conference to ' + conf.get("conferenceName"));
            this.refreshUser(conf, true);
        }

        async getRoleByName(role: Parse.Object) {
            // @ts-ignore  TS: What is the result of find??
            let existingRoles = this.state.roles.find(i => i.get("name") == role);
            if(existingRoles)
                return existingRoles;
            //Make sure to refresh first...
            const roleQuery = new Parse.Query(Parse.Role);
            roleQuery.equalTo("users", this.state.user);
            const roles = await roleQuery.find();
            existingRoles = roles.find(i => i.get("name") == role);
            if(existingRoles){
                this.setState({roles: roles});
                return existingRoles;
            }
            if(!existingRoles){
                //maybe we are a mod.
                let roleQ = new Parse.Query(Parse.Role);
                roleQ.equalTo("name", role);
                existingRoles = await roleQ.first();
                return existingRoles;
            }
            return null;
        }

        setActiveRoom(room: Parse.Object) {
            this.setState({activeRoom: room});
        }

        async setActiveConferenceByName(confName: string){
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("conferenceName", confName);
            let res = await confQ.first();
            this.refreshUser(res, true);
            return res;
        }

        async getConferenceBySlackName(teamId: string) {
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("slackWorkspace", teamId);
            let res = await confQ.first();
            return res;
        }

        getPresences(component: React.Component){
            this.presenceWatchers.push(component);
            component.setState({presences: this.presences});
        }
        unmountProfileDisplay(profileID:string, component:React.Component){
            if(this.userProfileSubscribers[profileID])
                this.userProfileSubscribers[profileID] = this.userProfileSubscribers[profileID].filter(c=>c!=component);
        }
        cancelPresenceSubscription(component: React.Component){
            this.presenceWatchers = this.presenceWatchers.filter(v => v!= component);
        }
        updateProfile(profile: UserProfile){
            if(this.userProfileSubscribers[profile.id]){
                for(let subscriber of this.userProfileSubscribers[profile.id]){
                    subscriber.setState({profile: profile});
                }
            }

        }
        updatePresences(){
            if(this.presenceUpdateScheduled){
               return;
            }
            else{
                this.presenceUpdateScheduled = true;
                this.presenceUpdateTimer = setTimeout(async ()=>{
                    let newPresences = this.newPresences;
                    this.newPresences = [];
                    this.presenceUpdateScheduled = false;
                    await this.getUserProfilesFromUserProfileIDs(newPresences.map(p=>p.get("user").id));
                    for(let presence of newPresences){
                        this.presences[presence.get("user").id] = presence;
                    }
                    for(let presenceWatcher of this.presenceWatchers){
                        presenceWatcher.setState({presences: this.presences});
                    }
                }, 10000 + Math.random() * 5000);
            }
        }

        async createSocialSpaceSubscription(user:Parse.User<Parse.Attributes>, userProfile:UserProfile){
            if(this.socialSpaceSubscription){
                this.socialSpaceSubscription.unsubscribe();
            }
            if (!user)
                user = this.state.user;
            if (!userProfile) {
                assert(this.state.userProfile !== null);
                userProfile = this.state.userProfile;
            }
            this.subscribeToPublicRooms()

            let query  =new Parse.Query("UserPresence");
            query.limit(1000);
            query.equalTo("conference", this.currentConference);
            query.equalTo("isOnline", true);


            this.socialSpaceSubscription = this.state.parseLive.subscribe(query, user.getSessionToken());
            this.socialSpaceSubscription.on('create', (presence: UserPresence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('enter', (presence:UserPresence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('delete',(presence:UserPresence)=>{
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('leave',(presence:UserPresence)=>{
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('update', (presence:UserPresence)=>{
                this.presences[presence.get("user").id] = presence;
                this.updatePresences();
            })

            let presences = await query.find();
            let presenceByProfile : Record<string,UserPresence> = {};
            for(let presence of presences){
                presenceByProfile[presence.get("user").id] = presence;
            }
            //trigger a big fetch of all of the profiles at once
            await this.getUserProfilesFromUserProfileIDs(Object.keys(presenceByProfile));
            let profilesQuery = new Parse.Query("UserProfile");
            profilesQuery.equalTo("conference", this.currentConference);
            profilesQuery.limit(2000);
            this.profilesSubscription = this.state.parseLive.subscribe(profilesQuery, user.getSessionToken());
            this.profilesSubscription.on("update", (profile:UserProfile)=>{
                this.userProfiles[profile.id] = new Promise((resolve)=>(resolve(profile)));
                this.updateProfile(profile);
            })
            for(let presence of presences){
                this.presences[presence.get("user").id] = presence;
            }
            this.updatePresences();
        }

        // @Jon: What is this???
        //Jon: This should no longer be needed...
        currentConference(arg0: string, currentConference: ClowdrInstance) {
            throw new Error("Method not implemented.");
        }

        /*
        Call this to set the user's current social space.
        Provide either the spaceName or the space object.
         */
        async setSocialSpace(spaceName:string, space:SocialSpace, user:User, userProfile:UserProfile) {
            if (!this.state.user && !user) // user is not logged in
                return
            if(space)
                spaceName = space.get("name");
            if (!this.state.activeSpace || spaceName != this.state.activeSpace.get("name")) {
                if(!user)
                    user = this.state.user;
                if(!userProfile) {
                    assert(this.state.userProfile !== null);
                    userProfile = this.state.userProfile;
                }
                if(!space && this.state.spaces){
                    space = this.state.spaces[spaceName];
                }
                if(!space){
                    throw "You called setSocialSpace but provided no space! Got: " + spaceName + " or "  + space
                }
                if (userProfile.get("presence") &&
                    (!userProfile.get("presence").get("socialSpace") ||
                        userProfile.get('presence').get('socialSpace').id != space.id)) {
                    let presence = userProfile.get("presence");
                    presence.set("socialSpace", space);
                    presence.save();
                }
                this.setState({
                    activeSpace: space,
                    chatChannel: space ? space.get("chatChannel") : undefined
                });
            }
        }

        // @Jon: What would be a better name for this???
        //Jon: I need to refactor all of the chat client stuff, it's full of bad patterns and races left and right. Open to name suggestions, but eventually I want this to return a promise anyway
        getChatClient(callback: (_:ChatClient)=>void) {
            if (this.chatClient)
                callback(this.chatClient);
            else
                this.chatWaiters.push(callback);
        }

        async getUserProfilesFromUserProfileID(id:UserProfileID, subscriber:React.Component) {
            let q = new Parse.Query(UserProfile);
            let users = [];
            let toFetch = [];
            if(subscriber){
                if(!this.userProfileSubscribers[id]){
                    this.userProfileSubscribers[id] = [];
                }
                this.userProfileSubscribers[id].push(subscriber);
            }
            if (this.userProfiles[id]) {
                let p = await this.userProfiles[id];
                return p;
            }
            this.userProfiles[id] = new Promise(async (resolve, reject) => {
                if (this.userProfiles[id]) {
                    let p = await this.userProfiles[id];
                    resolve(p);
                }
                if (this.loadingProfiles[id]) {
                    reject("Assertion failure?")
                }
                this.loadingProfiles[id] = resolve;
            });
            let userProfielQ = new Parse.Query(UserProfile);
            let u: UserProfile | undefined;
            try{
                u = await userProfielQ.get(id);
            }catch(err){
                console.log("Error on " + id)
                console.log(err);
                return null;
                // u = p;
                // p.set("displayName", id);
            }
            this.userProfiles[id] = new Promise((resolve) => (resolve(u)));
            this.unwrappedProfiles[id] = u;

            if (this.loadingProfiles[id]) {
                this.loadingProfiles[id](u);
                delete this.loadingProfiles[id];
            }
            return await this.userProfiles[id];
        }

        async getUserProfilesFromUserIDs(ids:UserID[]){
            //TODO: worth caching?
            let toFetch = [];
            for(let id of ids){
                let u = new Parse.User();
                u.id = id;
                toFetch.push(u)
            }
            let q = new Parse.Query(UserProfile);
            q.containedIn("user", toFetch);
            q.equalTo("conference", this.state.currentConference);
            let ret = await q.find();
            return ret;
        }

        async getUserProfilesFromUserProfileIDs(ids:UserID[]) {
            let users = [];
            let toFetch = [];
            for (let id of ids) {
                if (!this.userProfiles[id]) {
                    let u = new UserProfile();
                    u.id = id;
                    toFetch.push(u);
                    this.userProfiles[id] = new Promise(async (resolve, reject) => {
                        if (this.userProfiles[id]) {
                            resolve(this.userProfiles[id]);
                        }
                        if (this.loadingProfiles[id]) {
                            reject("Assertion failure?")
                        }
                        this.loadingProfiles[id] = resolve;
                    });
                }
                users.push(this.userProfiles[id]);
            }
            let res = await Parse.Object.fetchAll(toFetch, {});
            for(let u of res){
                this.userProfiles[u.id] = new Promise((resolve)=>(resolve(u)));
                this.unwrappedProfiles[u.id] = u;
                if(this.loadingProfiles[u.id]){
                    this.loadingProfiles[u.id](u);
                    delete this.loadingProfiles[u.id];
                }else{
                    console.log("No callback for "+ u.id);
                }
            }
            return await Promise.all(users);
        }


        async getUserRecord(uid:UserID){
            if(this.userProfiles && this.userProfiles[uid])
                return this.userProfiles[uid];
            else{
                console.log("Fetching single user record:" + uid);
                try {
                    let uq = new Parse.Query(UserProfile);
                    let ret = await uq.get(uid);
                    this.state.users[uid] = ret;
                    this.unwrappedProfiles[uid] = ret;
                    return ret;
                }catch(err){
                    console.log(err);
                    return null;
                }

            }
        }
        async populateMembers(breakoutRoom: BreakoutRoom){
            let promises =[];
            if(breakoutRoom.get('members')) {
                for (let i = 0; i < breakoutRoom.get("members").length; i++) {
                    let member = breakoutRoom.get("members")[i];
                    if (!member.get("displayName")) {
                        promises.push(this.getUserRecord(member.id).then((fullUser) => {
                                breakoutRoom.get("members")[i] = fullUser;
                            }
                        ))
                    }
                }
                return Promise.all(promises).then(()=>breakoutRoom);
            }
            return breakoutRoom;
        }
        refreshUser(preferredConference:ClowdrInstance|undefined, forceRefresh:boolean){
            if(!this.refreshUserPromise || forceRefresh){
                this.refreshUserPromise = new Promise(async (resolve)=>{
                    let user = await this._refreshUser(preferredConference);
                    resolve(user);
                });
            }
            return this.refreshUserPromise;
        }
        async _refreshUser(preferredConference:ClowdrInstance|undefined) {

            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    try {

                        if (!_this.isLoggedIn) {
                            _this.isLoggedIn = true;
                            // _this.authCallbacks.forEach((cb) => (cb(user)));
                        }
                        let session = await Parse.Session.current();

                        // Valid conferences for this user
                        let profiles = await user.relation("profiles").query().include("conference").find();
                        let validConferences = profiles.map(p => p.get("conference"));
                        console.log(validConferences)
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
                        let activeProfile : UserProfile | null | undefined = null;  // TS: null | undefined feels like overkill, no?
                        if (currentProfileID) {
                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.include("conference");
                            profileQ.include("tags");
                            profileQ.include("presence")
                            activeProfile = await profileQ.get(currentProfileID);
                            conf = activeProfile.get("conference");
                            if(preferredConference && preferredConference.id != activeProfile.get("conference").id)
                            {
                                activeProfile = null;
                            }
                        }
                        for (let role of roles) {
                            if (role.get("name") == "ClowdrSysAdmin") {
                                isAdmin = true;
                                isClowdrAdmin = true;
                            }
                            if (activeProfile && role.get("name") == (activeProfile.get("conference").id + "-admin")) {
                                isAdmin = true;
                                isClowdrAdmin = true;
                                isManager = true;
                                isModerator = true;
                            }
                            if (activeProfile && role.get("name") == (activeProfile.get("conference").id + "-moderator")) {
                                isModerator = true;
                            }
                            if (activeProfile && role.get("name") == (activeProfile.get("conference").id + "-manager")) {
                                isModerator = true;
                                isManager = true;
                            }
                        }
                        if(!activeProfile){
                            let defaultConferenceName = _this.getDefaultConferenceName();

                            if(!preferredConference && defaultConferenceName){
                                let confQ = new Parse.Query("ClowdrInstance")
                                confQ.equalTo("conferenceName", defaultConferenceName);
                                preferredConference = await confQ.first();
                            }
                            if (preferredConference) {
                                conf = validConferences.find((c) => preferredConference && c.id == preferredConference.id);
                                if (!conf) {
                                    conf = validConferences[0];
                                }
                            } else if(!conf) {
                                conf = validConferences[0];
                            }
                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.equalTo("conference",conf);
                            profileQ.equalTo("user",user);
                            profileQ.include("tags");
                            activeProfile = await profileQ.first();
                            assert (activeProfile !== undefined);
                            sessionStorage.setItem("activeProfileID",activeProfile.id);

                            window.location.reload(false);
                        }
                        const privsQuery = new Parse.Query("InstancePermission");
                        privsQuery.equalTo("conference", activeProfile.get("conference"));
                        privsQuery.include("action");
                        let permissions =  await privsQuery.find();

                        const spacesQ = new Parse.Query("SocialSpace");
                        spacesQ.limit(1000);
                        spacesQ.equalTo("conference", activeProfile.get("conference"));
                        let spaces = await spacesQ.find();
                        let spacesByName : Record<string, Parse.Object> = {};
                        for(let space of spaces){
                            spacesByName[space.get("name")] = space;
                        }
                        let priorConference = _this.state.currentConference;
                        _this.currentConference = conf;
                        _this.user = user;
                        _this.userProfile = activeProfile;
                        _this.state.chatClient.initChatClient(user, conf, activeProfile);

                        try {
                            // @ts-ignore   TS: I guess change null to ""?
                            await _this.setSocialSpace(null, spacesByName['Lobby'], user, activeProfile);
                            await _this.createSocialSpaceSubscription(user, activeProfile);
                        } catch (err) {
                            console.log("[withAuth]: warn: " + err);
                        }

                        let finishedStateFn : ((value?: unknown) => void) | null = null;
                        let stateSetPromise = new Promise((resolve)=>{
                            finishedStateFn = resolve;
                        });
                        // @ts-ignore   TS: ???
                        _this.setState((prevState) => { return ({
                            spaces: spacesByName,
                            user: user,
                            userProfile: activeProfile,
                            isAdmin: isAdmin,
                            isModerator: isModerator,
                            isManager: isManager,
                            isClowdrAdmin: isClowdrAdmin,
                            permissions: permissions.map(p=>p.get("action").get("action")),
                            validConferences: validConferences,
                            currentConference: conf,
                            loading: false,
                            roles: roles,
                            programCache: new ProgramCache(conf, _this.parseLive),
                        })}, ()=>{
                            assert(finishedStateFn);
                            finishedStateFn()});
                            await stateSetPromise;
                            // @ts-ignore    TS: @Jon: ... This is why we think the initialization of conf is wrong!
                            if(priorConference && conf && priorConference.id != conf.id){
                                window.location.reload(false);
                            }
                        _this.forceUpdate();
                        return user;
                    } catch (err) {
                        console.log("[withAuth]: err: " + err);
                        //TODO uncomment
                        try {
                            _this.setState({loading: false, user: null});
                            await Parse.User.logOut();
                        }catch(err2){
                            console.log(err2);
                        }
                        if(_this.props.history)
                        _this.props.history.push("/signin")
                        return null;
                    }
                } else {
                    let currentProfileID = sessionStorage.getItem("activeProfileID");
                    if(currentProfileID){
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
                    let conference : ClowdrInstance | null | undefined = null;
                    let defaultConferenceName = _this.getDefaultConferenceName();
                    if(defaultConferenceName){
                        let confQ = new Parse.Query("ClowdrInstance")
                        confQ.equalTo("conferenceName", defaultConferenceName);
                        conference = await confQ.first();
                    }
                    _this.setState({
                        user: null,
                        videoRoomsLoaded: false,
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
            if(hostname && (hostname.endsWith("clowdr.org") || hostname.endsWith("clowdr.internal"))){
                let confHostname = hostname.substring(0, hostname.indexOf('.'));
                defaultConferenceName = confHostname.substring(0, confHostname.indexOf('2'));
                defaultConferenceName = defaultConferenceName + " " + confHostname.substring(confHostname.indexOf('2'));
                defaultConferenceName = defaultConferenceName.toUpperCase();
            }
            return defaultConferenceName;
        }

       async getBreakoutRoom(id: string, component: React.Component){
            if(!this.activePublicVideoRooms)
                await this.subscribeToPublicRooms();
            let room = this.activePublicVideoRooms.find((v:{id:string;})=> v.id == id);
            if(room){
                if(!this.activePublicVideoRoomSubscribers[id])
                    this.activePublicVideoRoomSubscribers[id] = [];
                this.activePublicVideoRoomSubscribers[id].push(component);
            }
            return room;
        }
        cancelBreakoutRoomSubscription(id:string, component:React.Component){
            if(this.activePublicVideoRoomSubscribers[id])
                this.activePublicVideoRoomSubscribers[id] = this.activePublicVideoRoomSubscribers[id].filter((v:React.Component)=>v!=component);
        }
        async subscribeToPublicRooms() {
            if(!this.currentConference){
                throw "Not logged in"
            }
            let query = new Parse.Query("BreakoutRoom");
            query.equalTo("conference", this.currentConference);
            query.include("members");
            query.include("programItem");
            query.equalTo("isPrivate", false);
            query.limit(1000);
            // query.greaterThanOrEqualTo("updatedAt",date);
            query.find().then(res => {
                if(!this.state.user){
                    //event race: user is logged out...
                    if(this.parseLivePublicVideosSub){
                        this.parseLivePublicVideosSub.unsubscribe();
                        return;
                    }
                }
                res.forEach(this.notifyUserOfChanges.bind(this));
                this.activePublicVideoRooms = res;
                this.activePublicVideoRoomSubscribers = {};
                this.setState({activePublicVideoRooms: res})
                if (this.parseLivePublicVideosSub) {
                    this.parseLivePublicVideosSub.unsubscribe();
                }
                assert(this.user);
                this.parseLivePublicVideosSub = this.state.parseLive.subscribe(query, this.user.getSessionToken());
                this.parseLivePublicVideosSub.on('create', async (vid:BreakoutRoom) => { 
                    vid = await this.populateMembers(vid);
                    this.activePublicVideoRooms.push(vid);
                    this.setState((prevState) => ({
                        activePublicVideoRooms: [vid, ...prevState.activePublicVideoRooms]
                    }))
                })
                this.parseLivePublicVideosSub.on("delete", (vid:BreakoutRoom) => {
                    this.activePublicVideoRooms = this.activePublicVideoRooms.filter((v:BreakoutRoom)=> v.id != vid.id);
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.filter((v) => (
                            v.id != vid.id
                        ))
                    }));
                });
                this.parseLivePublicVideosSub.on('update', async (vid:BreakoutRoom) => {
                    vid = await this.populateMembers(vid);
                    this.notifyUserOfChanges(vid);
                    this.activePublicVideoRooms = this.activePublicVideoRooms.map((room:BreakoutRoom)=>room.id == vid.id ? vid : room);
                    if(this.activePublicVideoRoomSubscribers[vid.id])
                        for(let obj of this.activePublicVideoRoomSubscribers[vid.id])
                            obj.setState({BreakoutRoom : vid});
                    //Deliver notifications if applicable
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.map((room:BreakoutRoom) => room.id == vid.id ? vid : room)
                    }))
                })
            })

            let queryForPrivateActivity = new Parse.Query("LiveActivity");
            queryForPrivateActivity.equalTo("conference", this.currentConference);
            // queryForPrivateActivity.equalTo("topic", "privateBreakoutRooms");
            queryForPrivateActivity.equalTo("user", this.user);
            this.setState({videoRoomsLoaded: true});
            await this.subscribeToNewPrivateRooms();
            assert(this.user);
            this.parseLiveActivitySub = this.state.parseLive.subscribe(queryForPrivateActivity, this.user.getSessionToken());
            this.parseLiveActivitySub.on('create', this.handleNewParseLiveActivity.bind(this));
            this.parseLiveActivitySub.on("update", this.handleNewParseLiveActivity.bind(this));
        }

        handleNewParseLiveActivity(activity:LiveActivity){  // TS: ???
            if(activity.get("topic") == "privateBreakoutRooms"){
                // @ts-ignore  @Jon    subscribeToNewPrivateRooms doesn't want an argument
                //Jon: OK, deleted it...
                this.subscribeToNewPrivateRooms();
            }else if(activity.get("topic") == "profile"){
                window.location.reload(true);
            }
        }
        notifyUserOfChanges(updatedRoom:BreakoutRoom){
            if(!this.state.userProfile)
                return;
            let oldRoom = this.watchedRoomMembers[updatedRoom.id];
            if(!oldRoom){
                this.watchedRoomMembers[updatedRoom.id] = [];
                if(updatedRoom.get("members")){
                    this.watchedRoomMembers[updatedRoom.id] = updatedRoom.get("members").filter((m:UserProfile)=>m.id!=this.state.user.id).map((m:UserProfile)=>m.get("displayName"));  
                }
            }
            if(updatedRoom && oldRoom && this.state.userProfile.get("watchedRooms")){
                if(this.state.userProfile.get("watchedRooms").find((r:BreakoutRoom)=>r.id == updatedRoom.id)){
                    //We have a watch on it.

                    //Who is new?
                    let update : UserProfile[] = [];
                    if(updatedRoom.get("members")){
                        update = updatedRoom.get("members").filter((m:UserProfile)=>m.id!=this.state.user.id).map((m:UserProfile)=>m.get("displayName"));
                    }
                    let newUsers = update.filter(u=>!oldRoom.includes(u));
                    let goneUsers = oldRoom.filter(u=>!update.includes(u));
                    if(newUsers.length)
                    {
                        notification.info({
                            message: "Activity in " + updatedRoom.get("title"),
                            description: newUsers.join(", ")+ (newUsers.length > 1 ? " have":" has")+" joined. To turn off these notifications, select the room '" + updatedRoom.get("title")+ "' and un-follow it",
                            placement: 'topLeft',
                        });
                    }
                    if(goneUsers.length)
                    {
                        notification.info({
                            message: "Activity in " + updatedRoom.get("title"),
                            description: goneUsers.join(", ")+ (goneUsers.length > 1 ? " have":" has")+" left. To turn off these notifications, select the room '" + updatedRoom.get("title")+ "' and un-follow it",
                            placement: 'topLeft',
                        });
                    }
                    this.watchedRoomMembers[updatedRoom.id] = update;
                }
            }
        }
        async subscribeToNewPrivateRooms() {
            if (!this.mounted) return;
            let currentlySubscribedTo = [];
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

            let newRooms = [];
            let fetchedIDs = [];
            this.setState({
                activePrivateVideoRooms: res
            });
            for (let room of res) {
                fetchedIDs.push(room.id);
            }

            assert(this.user);
            this.parseLivePrivateVideosSub = this.state.parseLive.subscribe(newRoomsQuery, this.user.getSessionToken());
            this.parseLivePrivateVideosSub.on("update", async (vid:BreakoutRoom) => {
                vid = await this.populateMembers(vid);
                this.notifyUserOfChanges(vid);

                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.map(room => room.id == vid.id ? vid : room)
                }))
            });
            this.parseLivePrivateVideosSub.on("create", async (vid:BreakoutRoom) => {
                vid = await this.populateMembers(vid);
                this.setState((prevState) => ({
                    activePrivateVideoRooms: [vid, ...prevState.activePrivateVideoRooms]
                }))
            });
            this.parseLivePrivateVideosSub.on("delete", (vid:BreakoutRoom) => {
                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            })
            this.parseLivePrivateVideosSub.on("leave", (vid:BreakoutRoom) => {
                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            })
            this.setState({videoRoomsLoaded: true});
        }

        userHasWritePermission(object:Parse.Object){
            let acl = object.getACL();
            assert(acl && this.user);
            if(acl.getWriteAccess(this.user))
                return true;
            if(this.state.roles.find((v:Role) => this.state.currentConference && (v.get('name') == this.state.currentConference.id+'-manager' || v.get('name') == this.state.currentConference.id+"-admin")))
                return true;
            return false;
        }

        componentDidMount() {
            const Flair = Parse.Object.extend("Flair");
            const query = new Parse.Query(Flair);
            let _this = this;
            query.find().then((u)=>{
                //convert to something that the dom will be happier with
                let res : AllFlairData[] = [];
                let flairColors : Record<string, FlairUIData> = {};
                for(let flair of u){
                    flairColors[flair.get("label")] = {color: flair.get("color"), tooltip: flair.get("tooltip")} ;
                    res.push({value: flair.get("label"), color: flair.get("color"), id: flair.id, tooltip: flair.get("tooltip"),
                    priority: flair.get("priority")})
                }
                _this.setState({
                    flairColors: flairColors,
                    allFlair: res,
                });
            }).catch((err)=>{

            });

            // @ts-ignore   @Jon: Wants two arguments???
            //Jon: If you want to ensure that there are always two arguments passed, the best way would be to pull the code out of refreshUser that handles the cases where they are undefined.
            this.refreshUser();
            this.mounted = true;
        }

        componentWillUnmount() {
            this.mounted = false;
            if(this.socialSpaceSubscription){
                this.socialSpaceSubscription.unsubscribe();
            }
            if(this.profilesSubscription){
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
                return <div><Spin size="large"/>
                </div>
            return (
                // @ts-ignore    Two problems here...??  @Jon
                //Jon: I think that the Context needs to have the clowdrappstate as a type parameter? I'm not sure how to use contexts with react+typescript.
                <AuthUserContext.Provider value={this.state}> <Component {...this.props}  clowdrAppState={this.state} parseLive={this.state.parseLive} />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithClowdrState;
};

export default withClowdrState;
