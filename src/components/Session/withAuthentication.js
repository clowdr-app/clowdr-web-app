import React from 'react';

import AuthUserContext from './context';
import Parse from "parse";
import Chat from "twilio-chat";

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {

        constructor(props) {
            super(props);
            this.authCallbacks = [];
            this.isLoggedIn = false;
            this.loadingProfiles = {};
            this.profiles = {};
            this.chatWaiters = [];
            this.liveChannel = null;
            this.channelChangeListeners = [];
            this.state = {
                user: null,
                refreshUser: this.refreshUser.bind(this),
                initChatClient: this.initChatClient.bind(this),
                getUserProfile: this.getUserProfile.bind(this),
                getChatClient: this.getChatClient.bind(this),
                getLiveChannel: this.getLiveChannel.bind(this),
                setLiveChannelByName: this.setLiveChannelByName.bind(this),
                addLiveChannelListener: this.addLiveChannelListener.bind(this),
                removeLiveChannelListener: this.removeLiveChannelListener.bind(this),
                setActiveConferenceBySlack: this.setActiveConferenceBySlack.bind(this),
                setActiveRoom: this.setActiveRoom.bind(this),
                teamID: null,
                currentConference: null,
                activeRoom: null
            };
        }

        setActiveRoom(room) {
            this.setState({activeRoom: room});
        }

        async setActiveConferenceBySlack(teamId) {
            let confQ = new Parse.Query("ClowdrInstance");
            confQ.equalTo("slackWorkspace", teamId);
            let res = await confQ.first();
            let session = await Parse.Session.current();
            session.set("currentConference", res);
            session.save();
            this.setState({currentConference: res});

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
                }catch(err){
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

        async initChatClient(token) {
            if (!token)
                return undefined;
            if (!this.chatClient) {
                console.log("Created a new chat client");
                this.chatClient =await Chat.create(token);
                // await this.chatClient.initialize();
                this.chatWaiters.forEach((p) => p(this.chatClient));
                this.setLiveChannelByName("general");
            }
            return this.chatClient;
        }

        getUserProfile(authorID, callback) {
            if (!this.profiles[authorID]) {
                if(this.loadingProfiles[authorID])
                {
                    this.loadingProfiles[authorID].push(callback);
                }else {
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
                setTimeout(()=>{callback(this.profiles[authorID])}, 0);
            }
        }

        refreshUser(callback) {

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
                        roleQuery.equalTo("users",userWithRelations);

                        const roles = await roleQuery.find();
                        let isAdmin  =false;
                        let validConferences = [];
                        let conf = _this.state.currentConference;
                        if(session.get("currentConference")){
                            let confID = session.get("currentConference").id;
                            let q = new Parse.Query("ClowdrInstance");
                            conf = await q.get(confID);
                        }
                        console.log("Found: " );
//                        console.log(conf.get("conferenceName"))
                        if (!conf) {
                            for (let role of roles) {
                                if (role.get("name") == "ClowdrSysAdmin")
                                    isAdmin = true;
                                if (role.get("name").startsWith("Conf"))
                                    validConferences.push(role.get("name").substring(4));
                            }
                            let defaultConference = validConferences[0];
                            let confQ = new Parse.Query("ClowdrInstance");
                            confQ.equalTo("conferenceName", defaultConference);
                            conf = await confQ.first();
                        }
                        _this.setState({
                            user: userWithRelations,
                            teamID: session.get("activeTeam"),
                            isAdmin: isAdmin,
                            validConferences: validConferences,
                            currentConference: conf
                        });

                        if (callback) {
                            _this.authCallbacks.push(callback);
                            callback(userWithRelations);
                        }
                        return userWithRelations;
                    } catch (err) {
                        console.log(err);
                        return null;
                    }
                } else {
                    if (_this.isLoggedIn) {
                        _this.isLoggedIn = false;
                        _this.authCallbacks.forEach((cb) => (cb(null)));
                    }
                    if(_this.chatClient){
                        await _this.chatClient.shutdown();
                        _this.chatClient = null;
                    }
                    _this.setState({
                        user: null
                    })
                    if (callback) {
                        _this.authCallbacks.push(callback);
                        callback(null);
                    }

                    return null;
                }
                // do stuff with your user
            });
        }

        componentDidMount() {
            this.refreshUser();
        }

        componentWillUnmount() {
        }

        render() {
            // if(this.state.loading)
            //     return <div>    <Spin size="large" />
            //     </div>
            return (
                <AuthUserContext.Provider value={this.state}>
                    <Component {...this.props}  />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithAuthentication;
};

export default withAuthentication;
