import React from 'react';

import AuthUserContext from './context';
import Parse from "parse";
import {notification, Spin} from "antd";
import ChatClient from "../../classes/ChatClient"

let UserProfile = Parse.Object.extend("UserProfile");

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {

        constructor(props) {
            super(props);
            this.watchedRoomMembers = {};
            this.authCallbacks = [];
            this.isLoggedIn = false;
            this.loadingProfiles = {};
            this.profiles = {};
            this.chatWaiters = [];
            this.livegneChannel = null;
            this.channelChangeListeners = [];

            this.subscribedToVideoRoomState = false;
            this.videoRoomListeners = [];

            var parseLive = new Parse.LiveQueryClient({
                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY,
            });
            parseLive.open();

            let exports ={
                getUsers: this.getUsers.bind(this),
                getRoleByName: this.getRoleByName.bind(this),
                setActiveConference: this.setActiveConference.bind(this),
                populateMembers: this.populateMembers.bind(this),
                setGlobalState: this.setState.bind(this),//well that seems dangerous...
                getUserProfilesFromUserIDs: this.getUserProfilesFromUserIDs.bind(this),
                ifPermission: this.ifPermission.bind(this),
                getUserRecord: this.getUserRecord.bind(this)
            }
            this.state = {
                user: null,
                users: {},
                loading: true,
                roles: [],
                currentRoom: null,
                refreshUser: this.refreshUser.bind(this),
                getUserProfile: this.getUserProfile.bind(this),
                getChatClient: this.getChatClient.bind(this),
                getLiveChannel: this.getLiveChannel.bind(this),
                setLiveChannelByName: this.setLiveChannelByName.bind(this),
                addLiveChannelListener: this.addLiveChannelListener.bind(this),
                removeLiveChannelListener: this.removeLiveChannelListener.bind(this),
                getConferenceBySlackName: this.getConferenceBySlackName.bind(this),
                setActiveRoom: this.setActiveRoom.bind(this),
                teamID: null,
                currentConference: null,
                activeRoom: null,
                helpers: exports,
                chatClient: new ChatClient(this.setState.bind(this)),
                parseLive: parseLive,
                subscribeToVideoRoomState: this.subscribeToVideoRoomState.bind(this),
                // video: {
                videoRoomsLoaded: false,
                    liveVideoRoomMembers: 0,
                    activePublicVideoRooms: [],
                    activePrivateVideoRooms: [],
                // },

            };
            this.fetchingUsers = false;
        }

        ifPermission(permission, jsxElement, elseJsx){
            if(this.state.permissions && this.state.permissions.includes(permission))
                return jsxElement;
            if(elseJsx)
                return elseJsx;
            return <></>

        }

        async subscribeToVideoRoomState(caller) {
            this.videoRoomListeners.push(caller);
            if (this.subscribedToVideoRoomState)
                return;
            this.subscribedToVideoRoomState = true;
            this.subscribeToPublicRooms();
        }


        async getUsers() {
            if ((this.state.users && Object.keys(this.state.users).length > 0) || this.fetchingUsers)
                return;
            this.fetchingUsers = true;
            let parseUserQ = new Parse.Query(UserProfile)
            parseUserQ.equalTo("conference", this.state.currentConference);
            parseUserQ.limit(1000);
            parseUserQ.withCount();
            let nRetrieved = 0;
            let {count, results} = await parseUserQ.find();
            nRetrieved = results.length;
            let allUsers = [];
            allUsers = allUsers.concat(results);
            while (nRetrieved < count) {
                let parseUserQ = new Parse.Query(UserProfile)
                parseUserQ.equalTo("conference", this.state.currentConference);
                parseUserQ.limit(1000);
                let results = await parseUserQ.find();
                // results = dat.results;
                nRetrieved += results.length;
                if (results)
                    allUsers = allUsers.concat(results);
            }
            let usersByID = {};
            allUsers.forEach((u)=>usersByID[u.id]=u);
            this.setState({users: usersByID});
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
            this.refreshUser(conf);
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
            this.refreshUser(res);
            return res;
        }
        async getConferenceBySlackName(teamId) {
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("slackWorkspace", teamId);
            let res = await confQ.first();
            return res;
        }

        // activeConference(teamID){
        //     if(teamID){
        //         this.setState({teamID: teamID})
        //     }
        //     else{
        //         return this.state.teamID;
        //     }
        // }

        getLiveChannel(cb) {
            if (this.liveChannel)
                cb(this.liveChannel);
            else
                this.setLiveChannelByName("general").then(() => {
                    cb(this.liveChannel)
                });
        }

        setLiveChannelByName(channelName) {
            let _this = this;
            return this.chatClient.getChannelByUniqueName(channelName).then(async (chan) => {
                _this.liveChannel = chan;
                try {
                    let room = await chan.join();
                } catch (err) {
                    //allready joined
                }
                this.channelChangeListeners.forEach((cb) => cb(chan));
            });
        }

        removeLiveChannelListener(cb) {
            this.channelChangeListeners = this.channelChangeListeners.filter((v) => v != cb);
        }

        addLiveChannelListener(cb) {
            this.channelChangeListeners.push(cb);
        }

        getChatClient(callback) {
            if (this.chatClient)
                callback(this.chatClient);
            else
                this.chatWaiters.push(callback);
        }



        async getUserProfilesFromUserIDs(ids) {
            let q = new Parse.Query(UserProfile);
            let users = [];
            for (let id of ids) {
                let u = new Parse.User();
                u.id = id;
                users.push(u);
            }
            q.containedIn("user", users);
            q.equalTo("conference", this.state.currentConference);
            return await q.find();

        }

        getUserProfile(authorID, callback) {
            //DEPRECATED
            console.log("This is deprecated and probably broken")
            if (!this.profiles[authorID]) {
                if (this.loadingProfiles[authorID]) {
                    this.loadingProfiles[authorID].push(callback);
                } else {
                    this.loadingProfiles[authorID] = [callback];
                    const query = new Parse.Query(Parse.User);
                    let _this = this;
                    return query.get(authorID).then((u) => {
                        _this.profiles[authorID] = u;
                        this.loadingProfiles[authorID].forEach(cb => cb(u));
                    }).catch(err => {
                        //no such user
                    });
                }
            }
            if (this.profiles[authorID]) {
                setTimeout(() => {
                    callback(this.profiles[authorID])
                }, 0);
            }
        }
        async getUserRecord(uid){
            if(this.state.users && this.state.users[uid])
                return this.state.users[uid];
            else{
                try {
                    let uq = new Parse.Query(UserProfile);
                    let ret = await uq.get(uid);
                    this.state.users[uid] = ret;
                    return ret;
                }catch(err){
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
        async refreshUser(preferredConference) {

            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    const query = new Parse.Query(Parse.User);
                    query.include(["tags.label", "tags.color", "roles.name"]);
                    try {
                        let userWithRelations = await query.get(user.id);

                        if (!_this.isLoggedIn) {
                            _this.isLoggedIn = true;
                            _this.authCallbacks.forEach((cb) => (cb(userWithRelations)));
                        }
                        let session = await Parse.Session.current();
                        const roleQuery = new Parse.Query(Parse.Role);
                        roleQuery.equalTo("users", userWithRelations);

                        const roles = await roleQuery.find();

                        let isAdmin = _this.state ? _this.state.isAdmin : false;
                        let validConferences = [];

                        let validConfQ= new Parse.Query("ClowdrInstanceAccess");
                        validConfQ.include('instance');
                        let validInstances = await validConfQ.find();
                        validConferences=validInstances.map(i=>i.get("instance"));

                        let conf = _this.currentConference;
                        let currentProfileID = sessionStorage.getItem("activeProfileID");
                        let activeProfile = null;
                        if(currentProfileID){
                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.include("conference");
                            activeProfile = await profileQ.get(currentProfileID);
                            conf = activeProfile.get("conference");
                            if(preferredConference && preferredConference.id != activeProfile.get("conference").id)
                            {
                                activeProfile = null;
                            }
                        }
                        for (let role of roles) {
                            if (role.get("name") == "ClowdrSysAdmin")
                                isAdmin = true;
                        }
                        if(!activeProfile){
                            if(!preferredConference && process.env.REACT_APP_DEFAULT_CONFERENCE){
                                let confQ = new Parse.Query("ClowdrInstance")
                                confQ.equalTo("conferenceName", process.env.REACT_APP_DEFAULT_CONFERENCE);
                                preferredConference = await confQ.first();
                            }
                            if (preferredConference) {
                                conf = validConferences.find((c) => c.id == preferredConference.id);
                                if (!conf) {
                                    conf = validConferences[0];
                                }
                            } else if(!conf)
                                conf = validConferences[0];
                            let profileQ = new Parse.Query(UserProfile);
                            profileQ.equalTo("conference",conf);
                            profileQ.equalTo("user",userWithRelations);
                            activeProfile = await profileQ.first();
                            sessionStorage.setItem("activeProfileID",activeProfile.id);
                            window.location.reload(false);
                        }
                        const privsQuery = new Parse.Query("InstancePermission");
                        privsQuery.equalTo("conference", activeProfile.get("conference"));
                        privsQuery.include("action");
                        let permissions =  await privsQuery.find();
                        let currentConference = _this.state.currentConference;
                        _this.setState({
                            user: userWithRelations,
                            userProfile: activeProfile,
                            teamID: session.get("activeTeam"),
                            isAdmin: isAdmin,
                            permissions: permissions.map(p=>p.get("action").get("action")),
                            validConferences: validConferences,
                            currentConference: conf,
                            loading: false,
                            roles: roles
                        });

                        _this.getUsers();
                        if(currentConference && currentConference.id != conf.id){
                            // window.location.reload(false);

                        }
                        _this.forceUpdate();
                        return userWithRelations;
                    } catch (err) {
                        console.log(err);
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
                    _this.setState({
                        user: null,
                        videoRoomsLoaded: false,
                        loading: false,
                        users: {}
                    })

                    return null;
                }
                // do stuff with your user
            });
        }
        async subscribeToPublicRooms() {
            if(!this.state.currentConference){
                throw "Not logged in"
            }
            let query = new Parse.Query("BreakoutRoom");
            query.equalTo("conference", this.state.currentConference);
            query.include("members");
            query.equalTo("isPrivate", false);
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
                this.setState({activePublicVideoRooms: res})
                if (this.parseLivePublicVideosSub) {
                    this.parseLivePublicVideosSub.unsubscribe();
                }
                this.parseLivePublicVideosSub = this.state.parseLive.subscribe(query, this.state.user.getSessionToken());
                this.parseLivePublicVideosSub.on('create', async (vid) => {
                    vid = await this.populateMembers(vid);
                    this.setState((prevState) => ({
                        activePublicVideoRooms: [vid, ...prevState.activePublicVideoRooms]
                    }))
                })
                this.parseLivePublicVideosSub.on("delete", vid => {
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.filter((v) => (
                            v.id != vid.id
                        ))
                    }));
                });
                this.parseLivePublicVideosSub.on('update', async (newItem) => {
                    newItem = await this.populateMembers(newItem);
                    this.notifyUserOfChanges(newItem);
                    //Deliver notifications if applicable
                    this.setState((prevState) => ({
                        activePublicVideoRooms: prevState.activePublicVideoRooms.map(room => room.id == newItem.id ? newItem : room)
                    }))
                })
            })

            let queryForPrivateActivity = new Parse.Query("LiveActivity");
            queryForPrivateActivity.equalTo("conference", this.state.currentConference);
            // queryForPrivateActivity.equalTo("topic", "privateBreakoutRooms");
            queryForPrivateActivity.equalTo("user", this.state.user);
            this.setState({videoRoomsLoaded: true});
            await this.subscribeToNewPrivateRooms();
            this.parseLiveActivitySub = this.state.parseLive.subscribe(queryForPrivateActivity, this.state.user.getSessionToken());
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
            newRoomsQuery.equalTo("conference", this.state.currentConference);
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

            this.parseLivePrivateVideosSub = this.state.parseLive.subscribe(newRoomsQuery, this.state.user.getSessionToken());
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
            this.setState({videoRoomsLoaded: true});
        }

        componentDidMount() {
            this.refreshUser();
            this.mounted = true;
        }

        componentWillUnmount() {
            this.mounted = false;
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
                    <Component {...this.props}  authContext={this.state} parseLive={this.state.parseLive} />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithAuthentication;
};

export default withAuthentication;
