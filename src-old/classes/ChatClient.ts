import Chat from "twilio-chat";
import { Channel } from "twilio-chat/lib/channel"
import { Client } from "twilio-chat/lib/client"
import UserProfile from '../classes/UserProfile';
import ClowdrInstance from '../classes/ClowdrInstance';
import Parse from "parse";
import { backOff } from "exponential-backoff";
import { message } from "antd"
import { BottomChat } from "../components/SocialTab/BottomChat";
import { MultiChatWindow } from "../components/Chat/MultiChatWindow";
import { SidebarChat } from "../components/SocialTab/SidebarChat";
import { ContextualActiveUsers } from "../components/Lobby/ContextualActiveusers";
import { ChatFrame } from "../components/Chat/ChatFrame";
import { Message } from "twilio-chat/lib/message";
import assert from "assert";

interface ChannelInfoAttrs {
    parseID?: string;
    category?: string;
    mode?: string;
    programItemID?: string;
    breakoutRoom?: string;
}

export interface ChannelInfo {
    channel: Channel;
    members: Array<string>;
    attributes: ChannelInfoAttrs;
    components: Array<any>; // TODO
    visibleComponents: Array<any>; // TODO
    messages: Array<string>;
    conversation: Parse.Object<Parse.Attributes> | null;
}

export default class ChatClient {
    joinedChannels: { [x: string]: ChannelInfo } = {};
    channelPromises: { [x: string]: Promise<Channel> } = {};
    channelWaiters: { [x: string]: (channel: Channel) => void } = {};
    channels: Array<Channel> = [];
    channelSIDsThatWeHaventMessagedIn: Array<string> = [];
    twilio: Client | null = null;
    chatUser: Parse.User<Parse.Attributes> | null = null;
    chats: Array<string> = [];
    ephemerallyOpenedChannelSIDs: Array<string> = [];
    chatClientPromise: Promise<Client | null> | null = null;
    chatBar: BottomChat | null = null;
    chatList: ContextualActiveUsers | null = null;
    rightSideChat: SidebarChat | null = null;
    multiChatWindow: MultiChatWindow | null = null;
    rhsChatPromise: Promise<void> | null = null; // TODO: This is definitley a problem...
    rhsChatResolve: (() => void) = () => { }; // ...and this too.
    desiredRHSChat: string | null = null;
    userProfile: UserProfile | null = null;
    conference: ClowdrInstance | null | undefined = null;
    emojiPickerRef: React.RefObject<any> | null = null;
    reactingTo: Message | null = null;
    reactingToFrame: ChatFrame | null = null;
    emojiPickerCancelEvent: boolean = false;
    emojiClickTarget: any | null = null;

    async openChatAndJoinIfNeeded(sid: string, openOnRight: boolean = false): Promise<string | null> {
        let channels = this.joinedChannels;
        let foundInfo: ChannelInfo | null = channels[sid] || null;
        let found = foundInfo ? foundInfo.channel : await this.joinAndGetChannel(sid);
        if (!found) {
            console.log("Unable to find chat: " + sid);
            return null;
        }
        if (openOnRight) {
            this.setRightSideChat(sid);
        } else {
            this.openChat(found.sid);
        }
        return found.sid;
    }

    closeChatAndLeaveIfUnused(sid: string) {
        if (this.channelSIDsThatWeHaventMessagedIn.includes(sid)) {
            if (this.ephemerallyOpenedChannelSIDs.includes(sid)) {
                this.closeChatAndLeave(sid); // We were not previously in the chat
                this.ephemerallyOpenedChannelSIDs = this.ephemerallyOpenedChannelSIDs.filter(v => v !== sid);
            } else {
                // Just minimize the window
                this.chatBar?.setState((prevState: any) => ({ // TODO: BottomChatState
                    chats: prevState.chats.filter((v: string) => v !== sid)
                }))
            }
        }
    }

    async closeChatAndLeave(sid: string) {
        if (this.joinedChannels[sid]) {
            this.joinedChannels[sid].channel.leave();
        }
    }

    async getJoinedChannel(sid: string) {
        let chan = this.joinedChannels[sid];
        if (!chan) {
            if (!this.channelPromises[sid] || !this.channelWaiters[sid]) {
                this.channelPromises[sid] = new Promise((resolve) => {
                    this.channelWaiters[sid] = resolve; // TODO: This seems like a bad idea...
                });
            }
            return this.channelPromises[sid];
        }
        return chan.channel;
    }

    async callWithRetry<T>(twilioFunctionToCall: () => Promise<T>) {
        const response = await backOff(twilioFunctionToCall,
            {
                startingDelay: 500,
                retry: (err, attemptNum) => {
                    if (err && err.code === 20429)
                        return true;
                    console.error(err);
                    return false;
                }
            });
        return response;
    }

    async joinAndGetChannel(uniqueName: string): Promise<Channel | null> {
        if (!this.twilio) {
            await this.chatClientPromise;
        }
        if (!this.twilio) {
            console.log("[ChatClient]: null twilio client");
            return null;
        }
        if (!uniqueName) {
            console.log("[ChatClient]: invalid uniqueName");
            return null;
        }

        let channel = await this.callWithRetry(() => this.twilio!.getChannelByUniqueName(uniqueName));
        let chan = this.joinedChannels[channel.sid];
        this.channelSIDsThatWeHaventMessagedIn.push(channel.sid);
        if (chan) {
            return chan.channel;
        }
        try {
            let membership = await this.callWithRetry(() => channel.join());
            await this.getChannelInfo(membership);
            return membership;
        } catch (err) {
            if (err.code === 50403) {
                message.error("Sorry, the text channel that you selected is currently at full capacity (currently, channels support a max of 1,000 users).")
                return null;
                // this.channelsThatWeHaventMessagedIn = this.channelsThatWeHaventMessagedIn.filter(s=>s!==channel.sid);
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
            else {
                console.error(err);
            }
        }
        return null;
    }

    // setUnreadCount(sid: string, count: number) {
    //     if (this.chatList) {
    //         this.chatList.setUnreadCount(sid, count);
    //     }
    // }

    initMultiChatWindow(chatWindow: MultiChatWindow) {
        this.multiChatWindow = chatWindow;
        chatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
        chatWindow.setAllChannels(this.channels);
    }

    initChatSidebar(rightChat: SidebarChat) {
        this.rightSideChat = rightChat;
        if (!this.rhsChatPromise) {
            this.rhsChatPromise = new Promise(resolve => { resolve() });
        } else {
            this.rhsChatResolve();
        }
    }

    initBottomChatBar(chatBar: BottomChat) {
        this.chatBar = chatBar;
        chatBar.setState({
            chats: Object.values(this.joinedChannels)
                // .filter(c=>c.attributes && c.attributes.category !== "socialSpace")
                .map(c => c.channel.sid)
        });
        chatBar.setState({
            Initialchats: Object.values(this.joinedChannels)
                // .filter(c=>c.attributes && c.attributes.category !== "socialSpace")
                .map(c => c.channel.sid)
        });
    }

    // initJoinedChatList(chatList) {
    //     this.chatList = chatList;
    //     chatList.setState({
    //         chats: Object.values(this.joinedChannels)
    //             // .filter(c=>c.attributes && c.attributes.category !== "socialSpace")
    //             .map(c => c.channel.sid)
    //     });
    // }

    async disableRightSideChat() {
        if (this.rightSideChat)
            this.rightSideChat.setChatDisabled(true);
    }
    async setRightSideChat(newChannelSID: string) {
        if (this.desiredRHSChat === newChannelSID)
            return;
        this.desiredRHSChat = newChannelSID;
        if (!this.rhsChatPromise) {
            this.rhsChatPromise = new Promise((resolve) => {
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
        if (found) {
            channel = found.channel;
        }
        else {
            channel = await this.joinAndGetChannel(newChannelSID)
            if (this.desiredRHSChat !== newChannelSID)
                return;
            if (channel && channel.friendlyName && channel.friendlyName.startsWith("socialSpace-"))
                shouldLeaveWhenChanges = true;
        }
        if (channel && this.rightSideChat)
            await this.rightSideChat.setChannel(channel, shouldLeaveWhenChanges);
    }

    initChatClient(
        user: Parse.User<Parse.Attributes>,
        conference: ClowdrInstance | null | undefined,
        userProfile: UserProfile,
    ): Promise<Client | null> {
        this.userProfile = userProfile;
        this.conference = conference;
        if (!this.chatClientPromise) {
            // TODO: I removed a catch here... I don't see what was throwing, but there would be a
            // type issue if anything threw anyway...
            this.chatClientPromise = this._initChatClient(user, conference);
        }
        return this.chatClientPromise;
    }

    async openChat(chatSID: string, isInitialLoad: boolean = false) {
        if (!chatSID) {
            console.log("No chat sid!")
            console.trace();
        }
        if (!Object.keys(this.joinedChannels).includes(chatSID)) {
            await this.joinAndGetChannel(chatSID);
        }
        if (!this.chats.includes(chatSID))
            this.chats.push(chatSID);
        if (this.multiChatWindow)
            this.multiChatWindow.openChat(chatSID, isInitialLoad);
        if (this.chatList)
            this.chatList.addChannel(chatSID);
    }

    openEmojiPicker(message: Message | null, event: any, chatFrame: ChatFrame) { // TODO: no any
        if (this.emojiPickerRef && this.emojiPickerRef.current) {
            let boundingTargetRect = event.target.getBoundingClientRect();
            let newFromTop = boundingTargetRect.y
            let newFromLeft = boundingTargetRect.x;
            this.emojiClickTarget = event.target;
            let boxWidth = this.emojiPickerRef.current.clientWidth;
            let boxHeight = this.emojiPickerRef.current.clientHeight;
            if (boxHeight === 0)
                boxHeight = 425;
            if (boxWidth === 0)
                boxWidth = 353;
            let screenWidth = window.innerWidth;
            if (boxWidth + newFromLeft > screenWidth) {
                //place the picker to the right of the cursor
                newFromLeft = newFromLeft - boxWidth;
            }
            if (newFromTop - boxHeight > 0) {
                newFromTop = newFromTop - boxHeight;
            }
            if (newFromLeft < 0)
                newFromLeft = 0;
            this.emojiPickerRef.current.style.display = "block";
            this.emojiPickerRef.current.style.left = newFromLeft + "px";
            this.emojiPickerRef.current.style.top = newFromTop + "px";
            this.reactingTo = message;
            this.reactingToFrame = chatFrame;
            if (!this.emojiPickerCancelEvent) {
                this.emojiPickerCancelEvent = true;
                document.addEventListener("click", (evt) => {
                    if (this.reactingToFrame) {
                        let targetElement = evt.target as any; // TODO: also bad
                        do {
                            if (targetElement === this.emojiPickerRef?.current || targetElement === this.emojiClickTarget) {
                                return;
                            }
                            // Go up the DOM
                            targetElement = targetElement.parent;
                        } while (targetElement);
                        this.reactingTo = null;
                        this.reactingToFrame = null;
                        if (this.emojiPickerRef) {
                            this.emojiPickerRef.current.style.display = "none";
                        }
                    }
                });
            }

        }
    }
    initEmojiPicker(ref: React.RefObject<any>) {
        this.emojiPickerRef = ref;
    }
    emojiSelected(event: any) { // TODO: remove any 
        if (this.reactingToFrame) {
            this.reactingToFrame.sendReaction(this.reactingTo, event);
            this.reactingTo = null;
            this.reactingToFrame = null;
            if (this.emojiPickerRef) {
                this.emojiPickerRef.current.style.display = "none";
            }
        }
    }

    leaveChat(chatSID: string) {
        this.chats = this.chats.filter(c => c !== chatSID);
        if (this.chatBar)
            this.chatBar.removeChannel(chatSID);
        if (this.chatList)
            this.chatList.removeChannel(chatSID);
    }

    async getChannelInfo(channel: Channel): Promise<ChannelInfo | null> {
        let ret: ChannelInfo = {
            channel,
            members: [],
            attributes: {},
            components: [],
            visibleComponents: [],
            messages: [],
            conversation: null,
        };
        ret.attributes = await this.callWithRetry(() => channel.getAttributes());
        let convoQ = new Parse.Query("Conversation");
        let shouldHaveParseConvo = ret.attributes.category === "userCreated";
        if (shouldHaveParseConvo) {
            if (!ret.attributes.parseID)
                return null;
            try {
                ret.conversation = await convoQ.get(ret.attributes.parseID);
            } catch (err) {
                //phantom chats leftover from testing, should be deleted...
                return null;
            }
        }
        let members = await this.callWithRetry(() => channel.getMembers());
        ret.members = members.map(m => m.identity); //.filter(m=>m!== this.userProfile.id);
        ret.channel.on("messageAdded", (message) => {
            for (let component of ret.components) {
                component.messageAdded(ret.channel, message);
            }
        });
        ret.channel.on("messageRemoved", (message) => {
            for (let component of ret.components) {
                component.messageRemoved(ret.channel, message);
            }
        });
        ret.channel.on("messageUpdated", (message) => {
            for (let component of ret.components) {
                component.messageUpdated(ret.channel, message);
            }
        })
        ret.channel.on("memberJoined", (member) => {
            ret.members.push(member);
            for (let component of ret.components) {
                component.memberJoined(ret.channel, member);
            }
            if (this.chatBar) {
                this.chatBar.membersUpdated(ret.channel.sid);
            }
        })
        ret.channel.on("memberLeft", (member) => {
            ret.members = ret.members.filter(m => m !== member.sid); // TODO: What type is member?
            for (let component of ret.components) {
                component.memberLeft(ret.channel, member);
            }
            if (this.chatBar) {
                this.chatBar.membersUpdated(ret.channel.sid);
            }
        })
        this.joinedChannels[channel.sid] = ret;
        if (this.channelWaiters[channel.sid]) {
            this.channelWaiters[channel.sid](ret.channel);
            this.channelWaiters[channel.sid] = () => { };
        }
        return ret;
    }

    unSubscribeToChannel(channel: Channel) {
        channel.removeAllListeners("memberJoined");
        channel.removeAllListeners("memberLeft");
    }

    async _initChatClient(
        user: Parse.User<Parse.Attributes>,
        conference: ClowdrInstance | null | undefined,
    ): Promise<Client | null> {
        if (this.twilio && this.chatUser && this.chatUser.id === user.id && this.conference && conference && this.conference.id === conference.id) {
            return this.twilio;
        } else if (this.twilio) {
            await this.cleanup();
        }
        let token = await this.getToken(user, conference);
        if (!token) {
            console.log("[ChatClient]: twilio token not found");
            return null;
        }

        let twilio = await Chat.create(token);
        let [subscribedChannelsPaginator, allChannelDescriptors] = await Promise.all([this.callWithRetry(() => twilio.getSubscribedChannels()),
        this.callWithRetry(() => twilio.getPublicChannelDescriptors())]);
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
        let channelsToFetch: Promise<Channel>[] = [];
        while (true) {
            for (let cd of allChannelDescriptors.items) {
                channelsToFetch.push(this.callWithRetry(() => cd.getChannel()));
            }
            if (allChannelDescriptors.hasNextPage) {
                allChannelDescriptors = await allChannelDescriptors.nextPage();
            } else {
                break;
            }
        }
        await Promise.all(promises);
        let allChannels = await Promise.all(channelsToFetch);
        this.channels = allChannels;

        //Make sure that the bottom chat bar and chat list have everything we have so far
        if (this.chatList)
            this.chatList.setState({
                chats: Object.values(this.joinedChannels)
                    // .filter(c => c.attributes && c.attributes.category !== "socialSpace")
                    .map(c => c.channel.sid)
            });
        if (this.chatBar)
            this.chatBar.setState({
                chats: Object.values(this.joinedChannels)
                    // .filter(c => c.attributes && c.attributes.category !== "socialSpace")
                    .map(c => c.channel.sid)
            });
        if (this.multiChatWindow) {
            this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
            this.multiChatWindow.setAllChannels(this.channels);
        }

        twilio.on("channelAdded", (channel) => {
            console.log("Channel added: " + channel)
            this.channels.push(channel);
            this.multiChatWindow?.setAllChannels(this.channels);
            if (channel.attributes && channel.attributes.isAutoJoin && channel.attributes.isAutoJoin !== "false") {
                if (!Object.keys(this.joinedChannels).includes(channel.sid)) {
                    this.joinAndGetChannel(channel.sid)
                }
            }
            // this.channelListeners.forEach(v=> v.channelAdded(channel));
        });
        twilio.on("channelRemoved", (channel) => {
            this.channels = this.channels.filter((v) => v.sid !== channel.sid);
            this.leaveChat(channel.sid);
            this.unSubscribeToChannel(channel);
            this.multiChatWindow?.setAllChannels(this.channels);
            // this.channelListeners.forEach(v => v.channelRemoved(channel));
        });
        twilio.on("channelJoined", async (channel) => {
            let channelInfo = await this.getChannelInfo(channel);
            if (channelInfo) {
                if (this.multiChatWindow) {
                    this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
                }
                // if (channelInfo.attributes.category !== "socialSpace"){
                //     this.openChat(channel.sid, channelInfo.attributes.category === "announcements-global");
                // }
            }
            // this.channelListeners.forEach(v => v.channelJoined(channel));
        });
        twilio.on("channelLeft", (channel) => {
            delete this.joinedChannels[channel.sid];
            this.leaveChat(channel.sid);
            console.log("Left " + channel.sid)
            if (this.multiChatWindow) {
                this.multiChatWindow.setJoinedChannels(Object.keys(this.joinedChannels));
            }
            this.unSubscribeToChannel(channel);
            // this.channelListeners.forEach(v => v.channelLeft(channel));
        });
        //Do we already have the announcements channel?
        let announcements = Object.values(this.joinedChannels).find(chan => chan.attributes.category === 'announcements-global');
        if (!announcements) {
            console.log("Trying to join announcements")
            assert(this.conference, "Conference is null!");
            Parse.Cloud.run("join-announcements-channel", {
                conference: this.conference.id
            }).then(res => {
                console.log(res);
            }).catch(err => {
                console.log('[ChatClient]: Unable to join announcements: ' + err);
            })
        }
        this.twilio = twilio;
        for (let channel of this.channels) {
            if (channel.attributes && (channel.attributes as any)["isAutoJoin"] && (channel.attributes as any)["isAutoJoin"] !== "false") {
                if (!Object.keys(this.joinedChannels).includes(channel.sid)) {
                    this.joinAndGetChannel(channel.sid)
                }
            }
        }
        return this.twilio;
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
    getToken = async (user: Parse.User<Parse.Attributes>, conference: ClowdrInstance | null | undefined) => {
        let idToken = user.getSessionToken();
        if (idToken) {
            console.log("Fetching chat token for " + idToken + ", " + conference?.id);
            const res = await fetch(
                process.env.REACT_APP_TWILIO_CALLBACK_URL + '/chat/token'
                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        conference: conference?.id
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
