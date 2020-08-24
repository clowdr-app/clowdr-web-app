import Chat from "twilio-chat";
import Parse from "parse";
import React from "react";
import {backOff} from "exponential-backoff";
import {message} from "antd"
export default class ChatClient{
    constructor(setGlobalState) {
        this.channelListeners = [];
        this.channels = [];
        this.channelsThatWeHaventMessagedIn = [];
        this.joinedChannels = {};
        this.chatUser = null;
        this.twilio = null;
        this.rightSideChat = null;
        this.chats = [];
        this.ephemerallyOpenedChats = [];
        this.channelListeners = {};
        this.channelPromises ={};
        this.channelWaiters = {};
    }

    async openChatAndJoinIfNeeded(sid, openOnRight=false) {
        let channels = this.joinedChannels;
        let found = channels[sid];
        if (!found) {
            found = await this.joinAndGetChannel(sid);
            if(!found){
                return;
            }
            // this.ephemerallyOpenedChats.push(found.sid);
        }
        else{
            found = found.channel;
            // if(!this.chatBar.state[found.sid]){
            //     this.channelsThatWeHaventMessagedIn.push(found.sid);
            // }
        }
        if(!found){
            console.log("Unable to find chat: " + sid)
        }
        else{
            if(openOnRight){
                this.setRightSideChat(sid);
            }
            else {
                this.openChat(found.sid);
            }
            return found.sid;
        }
    }

    closeChatAndLeaveIfUnused(sid){
       if(this.channelsThatWeHaventMessagedIn.includes(sid)){
           if(this.ephemerallyOpenedChats.includes(sid))
           {
               this.closeChatAndLeave(sid); //we were not previously in the chat
               this.ephemerallyOpenedChats = this.ephemerallyOpenedChats.filter(v=>v!=sid);
           }else{
               //just minimize the window
               this.chatBar.setState((prevState)=>({
                   chats: prevState.chats.filter(v=>v!=sid)
               }))
           }
       }
    }

    async closeChatAndLeave(sid) {
        if (this.joinedChannels[sid]){
            this.joinedChannels[sid].channel.leave();
        }
    }

    async getJoinedChannel(sid){
        let chan = this.joinedChannels[sid];
        if(!chan)
        {
            if(!this.channelPromises[sid] || !this.channelWaiters[sid]){
                this.channelPromises[sid] = new Promise((resolve)=>{
                    this.channelWaiters[sid] = resolve;
                });
            }
            return this.channelPromises[sid];
        }
        return chan.channel;
    }

    async callWithRetry(twilioFunctionToCall) {
        const response = await backOff(twilioFunctionToCall,
            {
                startingDelay: 500,
                retry: (err, attemptNum) => {
                    if (err && err.code == 20429)
                        return true;
                    console.log(err);
                    return false;
                }
            });
        return response;

    }
    async joinAndGetChannel(uniqueName) {
        if(!this.twilio){
            await this.chatClientPromise;
        }
        let channel = await this.callWithRetry(()=>this.twilio.getChannelByUniqueName(uniqueName));
        let chan = this.joinedChannels[channel.sid];
        this.channelsThatWeHaventMessagedIn.push(channel.sid);
        if(chan){
            return chan.channel;
        }
        try{
            let membership = await this.callWithRetry(() => channel.join());
            await this.getChannelInfo(membership);
            return membership;
        }catch(err){
            if(err.code ==50403) {
                message.error("Sorry, the text channel that you selected is currently at full capacity (currently, channels support a max of 1,000 users).")
                return null;
                // this.channelsThatWeHaventMessagedIn = this.channelsThatWeHaventMessagedIn.filter(s=>s!=channel.sid);
                // console.log("Asking for bonded channel for " + channel.sid)
                // let res = await Parse.Cloud.run("chat-getBondedChannelForSID", {
                //     conference: this.conference.id,
                //     sid: channel.sid
                // });
                // this.channelsThatWeHaventMessagedIn.push(res);
                // channel = await this.callWithRetry(()=>this.twilio.getChannelByUniqueName(res));
                // try{
                //     let membership = await this.callWithRetry(()=>channel.join());
                //     await this.getChannelInfo(membership);
                //     return membership;
                // }catch(er2){
                //     //We are in fact already in this channel!
                //     console.log(er2)
                //     return channel;
                // }
            }
            else{
                console.log(err);
            }
        }
    }

    setUnreadCount(sid, count){
        if(this.chatList){
            this.chatList.setUnreadCount(sid, count);
        }
    }

    initMultiChatWindow(chatWindow){
        this.multiChatWindow = chatWindow;
        chatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
        chatWindow.setAllChannels(this.channels);
    }

    initChatSidebar(rightChat){
        this.rightSideChat = rightChat;
        if(!this.rhsChatPromise){
            this.rhsChatPromise = new Promise(resolve=>{resolve()});
        }else{
            this.rhsChatResolve();
        }
    }

    initBottomChatBar(chatBar){
        this.chatBar = chatBar;
        chatBar.setState({chats: Object.values(this.joinedChannels)
                // .filter(c=>c.attributes && c.attributes.category != "socialSpace")
                .map(c=>c.channel.sid)});
        chatBar.setState({Initialchats: Object.values(this.joinedChannels)
                // .filter(c=>c.attributes && c.attributes.category != "socialSpace")
                .map(c=>c.channel.sid)});
    }

    initJoinedChatList(chatList){
        this.chatList = chatList;
        chatList.setState({chats: Object.values(this.joinedChannels)
                // .filter(c=>c.attributes && c.attributes.category != "socialSpace")
                .map(c=>c.channel.sid)});
    }

    async disableRightSideChat(){
        if(this.rightSideChat)
            this.rightSideChat.setChatDisabled(true);
    }
    async setRightSideChat(newChannelSID){
        if(this.desiredRHSChat == newChannelSID)
            return;
        this.desiredRHSChat = newChannelSID;
        if (!this.rhsChatPromise) {
            this.rhsChatPromise = new Promise(async (resolve) => {
                this.rhsChatResolve = resolve;
                if (this.rightSideChat) {
                    resolve();
                }
            });
            await this.rhsChatPromise;
        }
        let channel = null;
        let found = this.joinedChannels[newChannelSID];
        let shouldLeaveWhenChanges = false;
        if(found){
            channel = found.channel;
        }
        else{
            channel = await this.joinAndGetChannel(newChannelSID)
            if(!this.desiredRHSChat == newChannelSID)
                return;
            if(channel.friendlyName && channel.friendlyName.startsWith("socialSpace-"))
                shouldLeaveWhenChanges = true;
        }
        if(channel)
            await this.rightSideChat.setChannel(channel, shouldLeaveWhenChanges);
    }

    initChatClient(user, conference, userProfile, appController) {
        this.userProfile = userProfile;
        this.conference = conference;
        if(appController && appController.setState)
            this.appController = appController;
        if (!this.chatClientPromise) {
            this.chatClientPromise = new Promise(async (resolve) => {
                let ret = await this._initChatClient(user, conference);
                resolve(ret);
            });
        }
        return this.chatClientPromise;
    }

    async openChat(chatSID, isInitialLoad) {
        if(!chatSID){
            console.log("No chat sid!")
            console.trace();
        }
        if(!Object.keys(this.joinedChannels).includes(chatSID)){
            await this.joinAndGetChannel(chatSID);
        }
        if(!this.chats.includes(chatSID))
            this.chats.push(chatSID);
        if (this.multiChatWindow)
            this.multiChatWindow.openChat(chatSID, isInitialLoad);
        if(this.chatList)
            this.chatList.addChannel(chatSID);
    }

    openEmojiPicker(message, event, chatFrame) {
        if(this.emojiPickerRef.current){
            let boundingTargetRect = event.target.getBoundingClientRect();
            let newFromTop = boundingTargetRect.y
            let newFromLeft = boundingTargetRect.x;
            this.emojiClickTarget = event.target;
            let boxWidth = this.emojiPickerRef.current.clientWidth;
            let boxHeight = this.emojiPickerRef.current.clientHeight;
            if (boxHeight == 0)
                boxHeight = 425;
            if (boxWidth == 0)
                boxWidth = 353;
            let screenWidth = window.innerWidth;
            let screenHeight = window.innerHeight;
            if (boxWidth + newFromLeft > screenWidth)
            {
                //place the picker to the right of the cursor
                newFromLeft = newFromLeft - boxWidth;
            }
            if (newFromTop - boxHeight > 0){
                newFromTop = newFromTop - boxHeight;
            }
            if (newFromLeft < 0)
                newFromLeft = 0;
            this.emojiPickerRef.current.style.display = "block";
            this.emojiPickerRef.current.style.left = newFromLeft+"px";
            this.emojiPickerRef.current.style.top = newFromTop+"px";
            this.reactingTo = message;
            this.reactingToFrame = chatFrame;
            if(!this.emojiPickerCancelEvent){
                this.emojiPickerCancelEvent = true;
                document.addEventListener("click", (evt)=>{
                    if(this.reactingToFrame){
                        let targetElement = evt.target;
                        do {
                            if (targetElement == this.emojiPickerRef.current || targetElement == this.emojiClickTarget) {
                                return;
                            }
                            // Go up the DOM
                            targetElement = targetElement.parentNode;
                        } while (targetElement);
                        this.reactingTo  = null;
                        this.reactingToFrame = null;
                        this.emojiPickerRef.current.style.display = "none";
                    }
                });
            }

        }
    }
    initEmojiPicker(ref){
        this.emojiPickerRef = ref;
    }
    emojiSelected(event){
        if(this.reactingToFrame){
            this.reactingToFrame.sendReaction(this.reactingTo, event);
            this.reactingTo = null;
            this.reactingToFrame = null;
            this.emojiPickerRef.current.style.display = "none";
        }
    }
    
    leaveChat(chatSID){
        this.chats = this.chats.filter(c=>c != chatSID);
        if(this.chatBar)
            this.chatBar.removeChannel(chatSID);
        if(this.chatList)
            this.chatList.removeChannel(chatSID);
    }

    async getChannelInfo(channel){

        let ret = {};
        ret.attributes = await this.callWithRetry(()=>channel.getAttributes());
        let convoQ = new Parse.Query("Conversation");
        let shouldHaveParseConvo  = ret.attributes.category == "userCreated";
        if(shouldHaveParseConvo) {
            if(!ret.attributes.parseID)
                return;
            try {
                ret.conversation = await convoQ.get(ret.attributes.parseID);
            }catch(err){
                //phantom chats leftover from testing, should be deleted...
                return;
            }
        }
        let members = await this.callWithRetry(()=>channel.getMembers());
        ret.members = members.map(m=>m.identity); //.filter(m=>m!= this.userProfile.id);
        ret.channel  =channel;
        ret.components = [];
        ret.visibleComponents = [];
        ret.messages = [];
        ret.channel.on("messageAdded", (message)=>{
            for(let component of ret.components){
                component.messageAdded(ret.channel, message);
            }
        });
        ret.channel.on("messageRemoved", (message) =>{
            for(let component of ret.components){
                component.messageRemoved(ret.channel, message);
            }
        });
        ret.channel.on("messageUpdated", (message) =>{
            for(let component of ret.components){
                component.messageUpdated(ret.channel, message);
            }
        })
        ret.channel.on("memberJoined", (member)=>{
            ret.members.push(member);
            for(let component of ret.components){
                component.memberJoined(ret.channel, member);
            }
            if(this.chatBar){
                this.chatBar.membersUpdated(ret.channel.sid);
            }
        })
        ret.channel.on("memberLeft", (member)=>{
            ret.members = ret.members.filter(m=>m.sid != member.sid);
            for(let component of ret.components){
                component.memberLeft(ret.channel, member);
            }
            if(this.chatBar){
                this.chatBar.membersUpdated(ret.channel.sid);
            }
        })
        this.joinedChannels[channel.sid] = ret;
        if(this.channelWaiters[channel.sid]){
            this.channelWaiters[channel.sid](ret.channel);
            this.channelWaiters[channel.sid] = undefined;
        }
        return ret;
    }

    unSubscribeToChannel(channel) {
        channel.removeAllListeners("memberJoined");
        channel.removeAllListeners("memberLeft");
        this.channelListeners[channel.sid] = undefined;
    }

    async _initChatClient(user, conference){
        if (this.twilio && this.chatUser && this.chatUser.id == user.id && this.conference && this.conference.id == conference.id) {
            return this.twilio;
        } else if (this.twilio) {
            await this.cleanup();
        }
        let token = await this.getToken(user, conference);
        let twilio = await Chat.create(token);
        let [subscribedChannelsPaginator, allChannelDescriptors] = await Promise.all([this.callWithRetry(()=>twilio.getSubscribedChannels()),
        this.callWithRetry(()=>twilio.getPublicChannelDescriptors())]);
        let promises = [];
        while (true) {
            for (let channel of subscribedChannelsPaginator.items) {
                promises.push(this.getChannelInfo(channel));
            }
            if (subscribedChannelsPaginator.hasNextPage) {
                subscribedChannelsPaginator = await subscribedChannelsPaginator.nextPage();
            } else {
                break;
            }
        }
        let channelsToFetch = [];
        while(true) {
            for (let cd of allChannelDescriptors.items) {
                channelsToFetch.push(this.callWithRetry(()=>cd.getChannel()));
            }
            if(allChannelDescriptors.hasNextPage){
                allChannelDescriptors = await allChannelDescriptors.nextPage();
            }else{
                break;
            }
        }
        let [joinedChannels, allChannels] = await Promise.all([Promise.all(promises), Promise.all(channelsToFetch)]);
        this.channels = allChannels;

        //Make sure that the bottom chat bar and chat list have everything we have so far
        if (this.chatList)
            this.chatList.setState({
                    chats: Object.values(this.joinedChannels)
                        // .filter(c => c.attributes && c.attributes.category != "socialSpace")
                        .map(c => c.channel.sid)
            });
        if (this.chatBar)
            this.chatBar.setState({
                chats: Object.values(this.joinedChannels)
                    // .filter(c => c.attributes && c.attributes.category != "socialSpace")
                    .map(c => c.channel.sid)
            });
        if(this.multiChatWindow) {
            this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
            this.multiChatWindow.setAllChannels(this.channels);
        }

        twilio.on("channelAdded", (channel)=>{
            console.log("Channel added: " + channel)
            this.channels.push(channel);
            this.multiChatWindow.setAllChannels(this.channels);
            if(channel.attributes && channel.attributes.isAutoJoin && channel.attributes.isAutoJoin != "false"){
                if(!Object.keys(this.joinedChannels).includes(channel.sid)){
                    this.joinAndGetChannel(channel.sid)
                }
            }
            // this.channelListeners.forEach(v=> v.channelAdded(channel));
        });
        twilio.on("channelRemoved", (channel) => {
            this.channels = this.channels.filter((v) => v.sid != channel.sid);
            this.leaveChat(channel.sid);
            this.unSubscribeToChannel(channel);
            this.multiChatWindow.setAllChannels(Object.keys(this.channels));
            // this.channelListeners.forEach(v => v.channelRemoved(channel));
        });
        twilio.on("channelJoined", async (channel) => {
            let channelInfo = await this.getChannelInfo(channel);
            if (channelInfo) {
                if (this.multiChatWindow) {
                    this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
                }
                // if (channelInfo.attributes.category != "socialSpace"){
                //     this.openChat(channel.sid, channelInfo.attributes.category == "announcements-global");
                // }
            }
            // this.channelListeners.forEach(v => v.channelJoined(channel));
        });
        twilio.on("channelLeft", (channel) => {
            delete this.joinedChannels[channel.sid];
            this.leaveChat(channel.sid);
            console.log("Left " + channel.sid)
            if (this.multiChatWindow){
                this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
            }
            this.unSubscribeToChannel(channel);
            // this.channelListeners.forEach(v => v.channelLeft(channel));
        });
        //Do we already have the announcements channel?
        let announcements = Object.values(this.joinedChannels).find(chan => chan.attributes.category == 'announcements-global');
        if (!announcements) {
            console.log("Trying to join announcements")
           Parse.Cloud.run("join-announcements-channel", {
                conference: this.conference.id
            }).then(res => {
                console.log(res);
            }).catch(err => {
                console.log('[ChatClient]: Unable to join announcements: ' + err);
            })
        }
        this.twilio = twilio;
        for(let channel of this.channels){
            if(channel.attributes && channel.attributes.isAutoJoin && channel.attributes.isAutoJoin != "false"){
                if(!Object.keys(this.joinedChannels).includes(channel.sid)){
                    this.joinAndGetChannel(channel.sid)
                }
            }
        }
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
            this.twilio.removeAllListeners("channelAdded");
            this.twilio.removeAllListeners("channelRemoved");
            this.twilio.removeAllListeners("channelJoined");
            this.twilio.removeAllListeners("channelLeft");
            await this.twilio.shutdown();
            this.twilio = null;
        }
    }
    getToken = async (user, conference) => {
        let _this = this;
        let idToken = user.getSessionToken();
        if (idToken) {
            console.log("Fetching chat token for " + idToken + ", " + conference.id);
            const res = await fetch(
                process.env.REACT_APP_TWILIO_CALLBACK_URL + '/chat/token'
                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        conference: conference.id
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
