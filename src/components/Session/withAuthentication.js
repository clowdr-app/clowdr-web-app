// @Jon/@Crista    Is this file correctly named, or should it be called withClowdrAppState

import React from 'react';

import AuthUserContext from './context';
import Parse from "parse";
import {notification, Spin} from "antd";
import ChatClient from "../../classes/ChatClient"
import ProgramCache from "./ProgramCache";

let UserProfile = Parse.Object.extend("UserProfile");

const withAuthentication = Component => {
    // @Jon/@Crista    Is this file correctly named, or should it be called WithClowdrAppState
    // (and maybe ClowdrAppState can be globally renamed just ClowdrState...?)
    class WithAuthentication extends React.Component {

        constructor(props) {
            super(props);
            this.watchedRoomMembers = {};
            this.authCallbacks = [];
            this.isLoggedIn = false;
            this.loadingProfiles = {};
            this.userProfiles = {};
            this.unwrappedProfiles = {};
            this.chatWaiters = [];
            this.livegneChannel = null;
            this.channelChangeListeners = [];
            this.presenceWatchers = [];
            this.presences = {};
            this.newPresences = [];
            this.userProfileSubscribers = {};

            this.parseLive = new Parse.LiveQueryClient({
                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY,
            });
            this.parseLive.open();

            let exports ={
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
                userHasWritePermission: this.userHasWritePermission.bind(this)

            }
            this.state = {
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
                currentConference: null,
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
            };
            this.fetchingUsers = false;
        }

        async updateMyPresence(presence){
            this.presences[this.state.userProfile.id] = presence;
            for(let presenceWatcher of this.presenceWatchers){
                presenceWatcher.setState({presences: this.presences});
            }
        }

        async createOrOpenDM(profileOfUserToDM){
            if(profileOfUserToDM == this.state.userProfile.id)
                return
            //Look to see if we already have a chat set up with this person
            let channels = this.state.chatClient.joinedChannels;
            if (channels) {
                let found = Object.values(channels).find((chan) => {
                    if(!chan || !chan.conversation)
                        return false;
                    let convo = chan.conversation;
                    if(chan.channel.attributes && chan.channel.attributes.mode == "group")
                        return false;
                    if(convo.get("isDM") == true &&
                        (convo.get("member2").id == profileOfUserToDM.id ||
                        convo.get("member1").id == profileOfUserToDM.id))
                        return true;
                })
                if (found) {
                    console.log(found.channel.sid)
                    this.state.chatClient.openChat(found.channel.sid);
                    return;
                }
            }

            let res = await Parse.Cloud.run("chat-createDM", {
                confID: this.state.currentConference.id,
                conversationName: profileOfUserToDM.get("displayName"),
                messageWith: profileOfUserToDM.id
            });
            this.state.chatClient.openChat(res.sid);
        }

        ifPermission(permission, jsxElement, elseJsx){
            if(this.state.permissions && this.state.permissions.includes(permission))
                return jsxElement;
            if(elseJsx)
                return elseJsx;
            return <></>

        }

        setExpandedProgramRoom(programRoom) {
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
                    parseUserQ.withCount();
                    let nRetrieved = 0;
                    let {count, results} = await parseUserQ.find();
                    nRetrieved = results.length;
                    let allUsers = [];
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
                    let usersByID = {};
                    allUsers.forEach((u)=>usersByID[u.id]=u);
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
        async setActiveConference(conf) {
            console.log('[wA]: changing conference to ' + conf.conferenceName);
            this.refreshUser(conf, true);
        }

        async getRoleByName(role) {
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
        setActiveRoom(room) {
            this.setState({activeRoom: room});
        }

        async setActiveConferenceByName(confName){
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("conferenceName", confName);
            let res = await confQ.first();
            this.refreshUser(res, true);
            return res;
        }
        async getConferenceBySlackName(teamId) {
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("slackWorkspace", teamId);
            let res = await confQ.first();
            return res;
        }

        getPresences(component){
            this.presenceWatchers.push(component);
            component.setState({presences: this.presences});
        }
        unmountProfileDisplay(profileID, component){
            if(this.userProfileSubscribers[profileID])
                this.userProfileSubscribers[profileID] = this.userProfileSubscribers[profileID].filter(c=>c!=component);
        }
        cancelPresenceSubscription(component){
            this.presenceWatchers = this.presenceWatchers.filter(v => v!= component);
        }
        updateProfile(profile){
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

        async createSocialSpaceSubscription(user, userProfile){
            if(this.socialSpaceSubscription){
                this.socialSpaceSubscription.unsubscribe();
            }
            if(!user)
                user = this.state.user;
            if(!userProfile)
                userProfile = this.state.userProfile;
            this.subscribeToPublicRooms()


            let query  =new Parse.Query("UserPresence");
            query.limit(1000);
            query.equalTo("conference", this.currentConference);
            query.equalTo("isOnline", true);


            this.socialSpaceSubscription = this.state.parseLive.subscribe(query, user.getSessionToken());
            this.socialSpaceSubscription.on('create', (presence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('enter', (presence) => {
                this.newPresences.push(presence);
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('delete',(presence)=>{
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('leave',(presence)=>{
                delete this.presences[presence.get("user").id];
                this.updatePresences();
            })
            this.socialSpaceSubscription.on('update', (presence)=>{
                this.presences[presence.get("user").id] = presence;
                this.updatePresences();
            })

            let presences = await query.find();
            let presenceByProfile = {};
            for(let presence of presences){
                presenceByProfile[presence.get("user").id] = presence;
            }
            //trigger a big fetch of all of the profiles at once
            await this.getUserProfilesFromUserProfileIDs(Object.keys(presenceByProfile));
            let profilesQuery = new Parse.Query("UserProfile");
            profilesQuery.equalTo("conference", this.currentConference);
            profilesQuery.limit(2000);
            this.profilesSubscription = this.state.parseLive.subscribe(profilesQuery, user.getSessionToken());
            this.profilesSubscription.on("update", (profile)=>{
                this.userProfiles[profile.id] = new Promise((resolve)=>(resolve(profile)));
                this.updateProfile(profile);
            })
            for(let presence of presences){
                this.presences[presence.get("user").id] = presence;
            }
            this.updatePresences();
        }


        /*
        Call this to set the user's current social space.
        Provide either the spaceName or the space object.
         */
        async setSocialSpace(spaceName, space, user, userProfile) {
            if (!this.state.user && !user) // user is not logged in
                return
            if(space)
                spaceName = space.get("name");
            if (!this.state.activeSpace || spaceName != this.state.activeSpace.get("name")) {
                if(!user)
                    user = this.state.user;
                if(!userProfile)
                    userProfile = this.state.userProfile;
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

        getChatClient(callback) {
            if (this.chatClient)
                callback(this.chatClient);
            else
                this.chatWaiters.push(callback);
        }



        async getUserProfilesFromUserProfileID(id, subscriber) {
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
            let u;
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
                this.loadingProfiles[id] = null;
            }
            return await this.userProfiles[id];
        }

        async getUserProfilesFromUserIDs(ids){
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

        async getUserProfilesFromUserProfileIDs(ids) {
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
            let res = await Parse.Object.fetchAll(toFetch);
            for(let u of res){
                this.userProfiles[u.id] = new Promise((resolve)=>(resolve(u)));
                this.unwrappedProfiles[u.id] = u;
                if(this.loadingProfiles[u.id]){
                    this.loadingProfiles[u.id](u);
                    this.loadingProfiles[u.id] = null;
                }else{
                    console.log("No callback for "+ u.id);
                }
            }
            return await Promise.all(users);
        }


        async getUserRecord(uid){
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
        async populateMembers(breakoutRoom){
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
        refreshUser(preferredConference, forceRefresh){
            if(!this.refreshUserPromise || forceRefresh){
                this.refreshUserPromise = new Promise(async (resolve)=>{
                    let user = await this._refreshUser(preferredConference);
                    resolve(user);
                });
            }
            return this.refreshUserPromise;
        }
        async _refreshUser(preferredConference) {

            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    try {

                        if (!_this.isLoggedIn) {
                            _this.isLoggedIn = true;
                            _this.authCallbacks.forEach((cb) => (cb(user)));
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

                        let conf = _this.currentConference;
                        let currentProfileID = sessionStorage.getItem("activeProfileID");
                        let activeProfile = null;
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
                                conf = validConferences.find((c) => c.id == preferredConference.id);
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
                        let spacesByName = {};
                        for(let space of spaces){
                            spacesByName[space.get("name")] = space;
                        }
                        let priorConference = _this.state.currentConference;
                        _this.currentConference = conf;
                        _this.user = user;
                        _this.userProfile = activeProfile;
                        _this.state.chatClient.initChatClient(user, conf, activeProfile);

                        try {
                            await _this.setSocialSpace(null, spacesByName['Lobby'], user, activeProfile);
                            await _this.createSocialSpaceSubscription(user, activeProfile);
                        } catch (err) {
                            console.log("[withAuth]: warn: " + err);
                        }

                        let finishedStateFn = null;
                        let stateSetPromise = new Promise((resolve)=>{
                            finishedStateFn = resolve;
                        });
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
                            finishedStateFn()});
                            await stateSetPromise;
                            if(priorConference && priorConference.id != conf.id){
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
                        _this.authCallbacks.forEach((cb) => (cb(null)));
                    }
                    if (_this.chatClient) {
                        await _this.chatClient.shutdown();
                        _this.chatClient = null;
                    }
                    let conference = null;
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

       async getBreakoutRoom(id, component){
            if(!this.activePublicVideoRooms)
                await this.subscribeToPublicRooms();
            let room = this.activePublicVideoRooms.find(v=>v.id == id);
            if(room){
                if(!this.activePublicVideoRoomSubscribers[id])
                    this.activePublicVideoRoomSubscribers[id] = [];
                this.activePublicVideoRoomSubscribers[id].push(component);
            }
            return room;
        }
        cancelBreakoutRoomSubscription(id, component){
            if(this.activePublicVideoRoomSubscribers[id])
                this.activePublicVideoRoomSubscribers[id] = this.activePublicVideoRoomSubscribers[id].filter(v=>v!=component);
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
                this.parseLivePublicVideosSub = this.state.parseLive.subscribe(query, this.user.getSessionToken());
                this.parseLivePublicVideosSub.on('create', async (vid) => {
                    vid = await this.populateMembers(vid);
                    this.activePublicVideoRooms.push(vid);
                    this.setState((prevState) => ({
                        activePublicVideoRooms: [vid, ...prevState.activePublicVideoRooms]
                    }))
                })
                this.parseLivePublicVideosSub.on("delete", vid => {
                    this.activePublicVideoRooms = this.activePublicVideoRooms.filter(v=> v.id != vid.id);
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.filter((v) => (
                            v.id != vid.id
                        ))
                    }));
                });
                this.parseLivePublicVideosSub.on('update', async (newItem) => {
                    newItem = await this.populateMembers(newItem);
                    this.notifyUserOfChanges(newItem);
                    this.activePublicVideoRooms = this.activePublicVideoRooms.map(room=>room.id == newItem.id ? newItem : room);
                    if(this.activePublicVideoRoomSubscribers[newItem.id])
                        for(let obj of this.activePublicVideoRoomSubscribers[newItem.id])
                            obj.setState({BreakoutRoom : newItem});
                    //Deliver notifications if applicable
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.map(room => room.id == newItem.id ? newItem : room)
                    }))
                })
            })

            let queryForPrivateActivity = new Parse.Query("LiveActivity");
            queryForPrivateActivity.equalTo("conference", this.currentConference);
            // queryForPrivateActivity.equalTo("topic", "privateBreakoutRooms");
            queryForPrivateActivity.equalTo("user", this.user);
            this.setState({videoRoomsLoaded: true});
            await this.subscribeToNewPrivateRooms();
            this.parseLiveActivitySub = this.state.parseLive.subscribe(queryForPrivateActivity, this.user.getSessionToken());
            this.parseLiveActivitySub.on('create', this.handleNewParseLiveActivity.bind(this));
            this.parseLiveActivitySub.on("update", this.handleNewParseLiveActivity.bind(this));
        }

        handleNewParseLiveActivity(activity){
            if(activity.get("topic") == "privateBreakoutRooms"){
                this.subscribeToNewPrivateRooms(activity);
            }else if(activity.get("topic") == "profile"){
                window.location.reload(true);
            }
        }
        notifyUserOfChanges(updatedRoom){
            if(!this.state.userProfile)
                return;
            let oldRoom = this.watchedRoomMembers[updatedRoom.id];
            if(!oldRoom){
                this.watchedRoomMembers[updatedRoom.id] = [];
                if(updatedRoom.get("members")){
                    this.watchedRoomMembers[updatedRoom.id] = updatedRoom.get("members").filter(m=>m.id!=this.state.user.id).map(m=>m.get("displayName"));
                }
            }
            if(updatedRoom && oldRoom && this.state.userProfile.get("watchedRooms")){
                if(this.state.userProfile.get("watchedRooms").find(r=>r.id == updatedRoom.id)){
                    //We have a watch on it.

                    //Who is new?
                    let update = [];
                    if(updatedRoom.get("members")){
                        update = updatedRoom.get("members").filter(m=>m.id!=this.state.user.id).map(m=>m.get("displayName"));
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
            if (!this.mounted)
                return;
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
            if (!this.mounted)
                return;
            res.forEach(this.notifyUserOfChanges.bind(this));

            let newRooms = [];
            let fetchedIDs = [];
            this.setState({
                activePrivateVideoRooms: res
            });
            for (let room of res) {
                fetchedIDs.push(room.id);
            }

            this.parseLivePrivateVideosSub = this.state.parseLive.subscribe(newRoomsQuery, this.user.getSessionToken());
            this.parseLivePrivateVideosSub.on("update", async (newItem) => {
                newItem = await this.populateMembers(newItem);
                this.notifyUserOfChanges(newItem);

                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.map(room => room.id == newItem.id ? newItem : room)
                }))
            });
            this.parseLivePrivateVideosSub.on("create", async (vid) => {
                vid = await this.populateMembers(vid);
                this.setState((prevState) => ({
                    activePrivateVideoRooms: [vid, ...prevState.activePrivateVideoRooms]
                }))
            });
            this.parseLivePrivateVideosSub.on("delete", (vid) => {
                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            })
            this.parseLivePrivateVideosSub.on("leave", (vid) => {
                this.setState((prevState) => ({
                    activePrivateVideoRooms: prevState.activePrivateVideoRooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            })
            this.setState({videoRoomsLoaded: true});
        }

        userHasWritePermission(object){
            let acl = object.getACL();
            if(acl.getWriteAccess(this.user))
                return true;
            if(this.state.roles.find(v => v.get('name') == this.state.currentConference.id+'-manager' || v.get('name') == this.state.currentConference.id+"-admin"))
                return true;
            return false;
        }

        componentDidMount() {
            const Flair = Parse.Object.extend("Flair");
            const query = new Parse.Query(Flair);
            let _this = this;
            query.find().then((u)=>{
                //convert to something that the dom will be happier with
                let res = [];
                let flairColors = {};
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
                <AuthUserContext.Provider value={this.state}>
                    <Component {...this.props}  clowdrAppState={this.state} parseLive={this.state.parseLive} />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithAuthentication;
};

export default withAuthentication;
