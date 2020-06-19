import Chat from "twilio-chat";
import Parse from "parse";

export default class ChatClient{
    constructor(setGlobalState) {
        this.channelListeners = [];
        this.channels = [];
        this.joinedChannels = {};
        this.chatUser = null;
        this.twilio = null;
        this.chats = [];
        this.channelListeners = {};
        this.channelPromises ={};
        this.channelWaiters = {};
        console.log("Created a chatclient")
    }

    async getJoinedChannel(sid){
        let chan = this.joinedChannels[sid];
        if(!chan)
        {
            if(!this.channelPromises[sid] || !this.channelWaiters[sid]){
                this.channelPromises[sid] = new Promise((resolve)=>{
                    console.log("Made promise")
                    this.channelWaiters[sid] = resolve;
                });
            }
            return this.channelPromises[sid];
        }
        return chan.channel;
    }
    async joinAndGetChannel(uniqueName) {
        let channel = await this.twilio.getChannelByUniqueName(uniqueName);
        let chan = this.joinedChannels[channel.sid];
        if(chan){
            return chan.channel;
        }
        let membership = await channel.join();
        await this.getChannelInfo(membership);
        return membership;
    }

    initBottomChatBar(chatBar){
        this.chatBar = chatBar;
        chatBar.setState({chats: Object.values(this.joinedChannels).filter(c=>c.attributes.mode == "directMessage").map(c=>c.channel.sid)});
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
    leaveChat(chatSID){
        this.chats = this.chats.filter(c=>c != chatSID);
        if(this.chatBar)
            this.chatBar.removeChannel(chatSID);
    }
    async getChannelInfo(channel){

        let ret = {};
        ret.attributes = await channel.getAttributes();
        let convoQ = new Parse.Query("Conversation");
        let shouldHaveParseConvo  = ret.attributes.category == "userCreated";
        console.log(shouldHaveParseConvo)
        if(shouldHaveParseConvo) {
            console.log(ret.attributes.parseID)
            if(!ret.attributes.parseID)
                return;
            try {
                ret.conversation = await convoQ.get(ret.attributes.parseID);
                console.log(ret.conversation)
            }catch(err){
                //phantom chats leftover from testing, should be deleted...
                return;
            }
        }
        let members = await channel.getMembers();
        ret.members = members.map(m=>m.identity).filter(m=>m!= this.userProfile.id);
        ret.channel  =channel;

        this.joinedChannels[channel.sid] = ret;
        console.log("joined: "+ channel.sid)
        if(this.channelWaiters[channel.sid]){
            console.log("Resolving: " + ret.channel)
            this.channelWaiters[channel.sid](ret.channel);
            this.channelWaiters[channel.sid] = undefined;
        }
        return ret;
    }

    subscribeToChannel(sid){
        if(this.channelListeners[sid]){
            console.log("Duplicate subscribe called")
            return;
        }
        const updateMembers = async ()=>{
            let container = this.joinedChannels[sid];
            console.log("Updated " + sid)
            let members = await container.channel.getMembers();
            console.log(members)
            let membersWithoutUs = members.map(m=>m.identity).filter(m=>m!= this.userProfile.id);
            this.joinedChannels[sid].members = membersWithoutUs;
            if(this.chatBar){
                this.chatBar.membersUpdated(sid);
            }

        };
        let channel = this.joinedChannels[sid].channel;
        this.channelListeners[sid] =[
            channel.on('memberJoined',updateMembers),
            channel.on("memberLeft", updateMembers)
        ];

    }

    unSubscribeToChannel(channel) {
        channel.removeAllListeners("memberJoined");
        channel.removeAllListeners("memberLeft");
        this.channelListeners[channel.sid] = undefined;
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
        let channelsArray  =await Promise.all(promises);
        twilio.on("channelAdded", (channel)=>{
            this.channels.push(channel);
            // this.channelListeners.forEach(v=> v.channelAdded(channel));
        });
        twilio.on("channelRemoved", (channel) => {
            this.channels = this.channels.filter((v) => v.sid != channel.sid);
            this.leaveChat(channel.sid);
            this.unSubscribeToChannel(channel);

            // this.channelListeners.forEach(v => v.channelRemoved(channel));
        });
        twilio.on("channelJoined", async (channel) => {
            let channelInfo = await this.getChannelInfo(channel);
            if(channelInfo){
                this.openChat(channel.sid);
                this.subscribeToChannel(channel.sid);
            }
            // this.channelListeners.forEach(v => v.channelJoined(channel));
        });
        twilio.on("channelLeft", (channel) => {
            this.joinedChannels[channel.sid] = undefined;
            this.leaveChat(channel.sid);

            this.unSubscribeToChannel(channel);
            // this.channelListeners.forEach(v => v.channelLeft(channel));
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