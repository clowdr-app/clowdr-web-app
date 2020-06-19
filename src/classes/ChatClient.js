import Chat from "twilio-chat";

export default class ChatClient{
    constructor(setGlobalState) {
        this.channelListeners = [];
        this.channels = [];
        this.joinedChannels = [];
        this.chatUser = null;
        this.twilio = null;
        this.chats = [];
        console.log("Created a chatclient")
    }

    getJoinedChannel(sid){
        let chan = this.joinedChannels.find((v)=> {
           return  v && v.channel.sid == sid
        });
        if(!chan)
            return null;
        return chan.channel;
    }
    async joinAndGetChannel(uniqueName) {
        let channel = await this.twilio.getChannelByUniqueName(uniqueName);
        let chan = this.joinedChannels.find((v) => v.channel.sid == channel.sid)
        if(chan){
            return chan.channel;
        }
        return await channel.join();
    }

    initBottomChatBar(chatBar){
        this.chatBar = chatBar;
        chatBar.setState({chats: this.joinedChannels.filter(c=>c.attributes.mode == "directMessage" && c.members.length == 1)});
    }
    initChatClient(user, conference, userProfile) {
        this.userProfile = userProfile;
        if (!this.chatClientPromise) {
            this.chatClientPromise = new Promise(async (resolve) => {
                let ret = await this._initChatClient(user, conference);
                console.log("Resolving promise:" + ret)
                resolve(ret);
            });
        }
        return this.chatClientPromise;
    }

    openChat(chatSID) {
        this.chats.push(chatSID);
        if (this.chatBar)
            this.chatBar.openChat(chatSID);
    }
    async getChannelInfo(channel){

        let attributes = await channel.getAttributes();
        let members = await channel.getMembers();
        let membersWithoutUs = members.map(m=>m.identity).filter(m=>m!= this.userProfile.id);
        return {channel: channel, attributes: attributes, members: membersWithoutUs,
        };
    }
    async _initChatClient(user, conference){
        console.log("Init chat client:")
        console.log(this.twilio);
        console.log(this.conference)
        console.log(conference);
        console.log(this.chatUser)
        console.log(user);
        if (this.twilio && this.chatUser && this.chatUser.id == user.id && this.conference && this.conference.id == conference.id) {
            return this.twilio;
        } else if (this.twilio) {
            await this.cleanup();
        }
        console.log("Doing the ini")
        let token = await this.getToken(user, conference);
        let twilio = await Chat.create(token);
        console.log(this.twilio)
        let paginator = await twilio.getSubscribedChannels();
        let promises = [];
        for (let channel of paginator.items) {
            promises.push(this.getChannelInfo(channel));
        }
        this.joinedChannels = await Promise.all(promises);
        twilio.on("channelAdded", (channel)=>{
            this.channels.push(channel);
            this.channelListeners.forEach(v=> v.channelAdded(channel));
        });
        twilio.on("channelRemoved", (channel) => {
            this.channels = this.channels.filter((v) => v.sid != channel.sid);
            this.channelListeners.forEach(v => v.channelRemoved(channel));
        });
        twilio.on("channelJoined", async (channel) => {
            this.joinedChannels.push(await this.getChannelInfo(channel));

            this.channelListeners.forEach(v => v.channelJoined(channel));
        });
        twilio.on("channelLeft", (channel) => {
            this.joinedChannels = this.joinedChannels.filter(v => v.channel.sid != channel.sid);
            this.channelListeners.forEach(v => v.channelLeft(channel));
        });
        this.twilio = twilio;
        return this.twilio;
    }
    addChannelListener(listener) {
        this.channelListeners.push(listener);
    }

    removeChannelListener(listener) {
        this.channelListeners = this.channelListeners.filter((v) => v != listener);
    }


    async cleanup() {
        if (this.twilio) {
            console.log("Removing listeners");
            this.twilio.removeAllListeners("channelAdded");
            this.twilio.removeAllListeners("channelRemoved");
            this.twilio.removeAllListeners("channelJoined");
            this.twilio.removeAllListeners("channelLeft");
            console.log("Calling shutdown");
            await this.twilio.shutdown();
            console.log("Shut down")
            this.twilio = null;
        }
    }
    getToken = async (user, conference) => {
        let _this = this;
        let idToken = user.getSessionToken();
        if (idToken) {
            console.log("Fetching chat token for " + idToken + ", " + conference.get("slackWorkspace"))
            const res = await fetch(
                process.env.REACT_APP_TWILIO_CALLBACK_URL + '/chat/token'
                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        conference: conference.get("slackWorkspace")
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            let data = await res.json();
            return data.token;
        } else {
            console.log("Unable to get our token?");
        }


    };

}