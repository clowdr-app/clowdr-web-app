import Chat from "twilio-chat";

export default class ChatClient{
    constructor(setGlobalState) {
        this.setState = setGlobalState;
        this.channelListeners = [];
        this.channels = [];
        this.joinedChannels = [];
        this.chatUser = null;
        this.chatClient = null;
    }

    async joinAndGetChannel(uniqueName) {

        let channel = await this.chatClient.getChannelByUniqueName(uniqueName);
        let chan = this.joinedChannels.find((v) => v.sid == channel.sid)
        if (!chan)
            channel = await channel.join();
        return channel;
    }

    async initChatClient(user, conference) {
        if (this.chatClient && this.chatUser && this.chatUser.id == user.id && this.conference && this.conference.id == conference.id) {
            return this.chatClient;
        } else if (this.chatClient) {
            await this.cleanup();
        }
        let token = await this.getToken(user, conference);
        this.chatClient = await Chat.create(token);
        this.chatClient.on("channelAdded", (channel)=>{
            this.channels.push(channel);
            this.channelListeners.forEach(v=> v.channelAdded(channel));
        });
        this.chatClient.on("channelRemoved", (channel) => {
            this.channels = this.channels.filter((v) => v.sid != channel.sid);
            this.channelListeners.forEach(v => v.channelRemoved(channel));
        });
        this.chatClient.on("channelJoined", (channel) => {
            this.joinedChannels.push(channel);
            this.channelListeners.forEach(v => v.channelJoined(channel));
        });
        this.chatClient.on("channelLeft", (channel) => {
            this.joinedChannels = this.joinedChannels.filter(v => v.sid != channel.sid);
            this.channelListeners.forEach(v => v.channelLeft(channel));
        });
        return this.chatClient;
    }

    addChannelListener(listener) {
        this.channelListeners.push(listener);
    }

    removeChannelListener(listener) {
        this.channelListeners = this.channelListeners.filter((v) => v != listener);
    }

    initChat(user) {
        let _this = this;
        this.props.auth.initChatClient(this.state.token).then((client) => {
            _this.chatClient = client;
            _this.clientInitiated();
        });
    };

    async cleanup() {
        if (this.chatClient) {
            console.log("Removing listeners");
            this.chatClient.removeAllListeners("channelAdded");
            this.chatClient.removeAllListeners("channelRemoved");
            this.chatClient.removeAllListeners("channelJoined");
            this.chatClient.removeAllListeners("channelLeft");
            console.log("Calling shutdown");
            await this.chatClient.shutdown();
            console.log("Shut down")
            this.chatClient = null;
        }
    }
    getToken = async (user, conference) => {
        let _this = this;
        let idToken = user.getSessionToken();
        if (idToken) {
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