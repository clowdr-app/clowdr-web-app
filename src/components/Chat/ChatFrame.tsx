import { AuthUserContext } from "../Session";
import { Emoji } from 'emoji-mart'
import { emojify } from 'react-emojione';
import 'emoji-mart/css/emoji-mart.css'
import { Button, Divider, Form, Input, List, notification, Popconfirm, Tag, Tooltip } from 'antd';
import "./chat.css"
import React from "react";
import ReactMarkdown from "react-markdown";
import { SmileOutlined } from "@ant-design/icons"
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import InfiniteScroll from 'react-infinite-scroller';
import { withRouter } from 'react-router';
import { RouteComponentProps } from "react-router";
import moment from "moment";
import { ClowdrState } from "../../ClowdrTypes";
import { Client } from "twilio-chat/lib/client";
import { Channel } from "twilio-chat/lib/channel";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import { Member } from "twilio-chat/lib/member";
import { Message } from "twilio-chat/lib/message";
import { ChannelInfo } from "../../classes/ChatClient";
import assert from "assert";
import { intersperse } from "../../Util";

interface GroupedMessages {
    author: string;
    timestamp: Date;
    messages: Message[];
    sid: string;
}

interface EmojiObject {
    count: number;
    emojiMessage: Message | null;
    authors: Array<string>;
}

const emojiSupport = (text: any) => <>{emojify(text.value, { output: 'unicode' })}</>;

interface ChatFrameProps extends RouteComponentProps {
    sid: string;
    visible: boolean;
    leaveOnChange: boolean;
    setUnreadCount: ((unread: number) => void) | null;
    header: JSX.Element;
}

interface _ChatFrameProps extends ChatFrameProps {
    appState: ClowdrState;
}

interface ChatFrameState {
    sid: string;
    chatLoading: boolean;
    token: string;
    chatReady: boolean;
    messages: Array<string>
    profiles: Array<string>;
    authors: { [x: string]: string };
    loadingChannels: boolean;
    chatHeight: string;
    groupedMessages: Array<GroupedMessages>;
    newMessage: string;
    lastConsumedMessageIndex: number;
    hasMoreMessages: boolean;
    loadingMessages: boolean;
    numMessagesDisplayed: number;
    visible: boolean;
    chatDisabled: boolean;
    chatAvailable: boolean;
    readOnly: boolean;
    activeChannelName: string | null;
    reactions: {
        [x: string]: { [y: string]: EmojiObject; };
    }
}

export class ChatFrame extends React.Component<_ChatFrameProps, ChatFrameState> {
    messages: { [x: string]: Array<Message> };
    currentPage: { [x: string]: Paginator<Message> };
    form: React.RefObject<any>;
    lastConsumedMessageIndex: number;
    lastSeenMessageIndex: number;
    pendingReactions: { [x: string]: boolean };
    consumptionFrontier: number;
    sid: string;
    user: Parse.User<Parse.Attributes> | null = null;
    currentSID: string | null = null;
    client: Client | null = null;
    chanInfo: ChannelInfo | null = null;
    members: Array<Member> = [];
    activeChannel: Channel | null = null;
    dmOtherUser: string | null = null;
    isAnnouncements: boolean = false;
    unread: number = 0;
    deferredGroupedMessages: { author: string; timestamp: Date; messages: Message[]; sid: string; }[] = [];
    deferredReactions: { [x: string]: { [y: string]: EmojiObject; }; } = {};
    count: number = 0;
    settingConsumedIdx: number = 0;
    clearedTempFlag: boolean = false;
    loadingMessages: boolean = false;
    messagesEnd: HTMLDivElement | null = null;

    constructor(props: _ChatFrameProps) {
        super(props);
        this.messages = {};
        this.currentPage = {};
        this.state = {
            sid: this.props.sid,
            chatLoading: true,
            token: '',
            chatReady: false,
            messages: [],
            reactions: {},
            profiles: [],
            authors: {},
            loadingChannels: true,
            chatHeight: "400px",
            groupedMessages: [],
            newMessage: '',
            lastConsumedMessageIndex: -1,
            hasMoreMessages: false,
            loadingMessages: true,
            numMessagesDisplayed: 0,
            visible: this.props.visible,
            readOnly: false,
            activeChannelName: null,
            chatDisabled: false,
            chatAvailable: false,
        }
        this.form = React.createRef();
        this.lastConsumedMessageIndex = -1;
        this.lastSeenMessageIndex = -1;
        this.pendingReactions = {};
        this.consumptionFrontier = 0;
        this.sid = this.props.sid;
    }

    formatTime(timestamp: moment.MomentInput) {
        return <Tooltip mouseEnterDelay={0.5} title={moment(timestamp).calendar()}>
            <span>{moment(timestamp).format("LT")}</span>
        </Tooltip>;
    }

    async componentDidMount() {
        if (this.props.appState.user) {
            this.user = this.props.appState.user;
            this.sid = this.props.sid;
            this.changeChannel(this.props.sid);
        }
    }

    async changeChannel(sid: string) {
        // console.log("currentSID: " + this.currentSID + " sid: " + sid + " activeChannel: " + this.activeChannel);
        let user = this.props.appState.user;
        if (!sid) {
            this.setState({ chatDisabled: true });
        } else if (this.state.chatDisabled) {
            this.setState({ chatDisabled: false });
        }
        if (sid === this.currentSID)
            return;
        this.currentSID = sid
        if (user && sid) {
            this.setState({
                chatLoading: true,
                messages: [],
                numMessagesDisplayed: 0,
                hasMoreMessages: false,
                loadingMessages: true
            });
            if (!this.client) {
                assert(this.props.appState.userProfile);
                this.client = await this.props.appState.chatClient.initChatClient(
                    user,
                    this.props.appState.currentConference,
                    this.props.appState.userProfile
                );
            }
            // console.log("Prepared client for " + uniqueNameOrSID + ", " + this.currentUniqueNameOrSID)
            if (this.currentSID !== sid) {
                return;//raced with another update
            }
            if (this.activeChannel && this.props.leaveOnChange) {
                //leave the current channel
                //we never actually leave a private channel because it's very hard to get back in
                // - we need to be invited by the server, and that's a pain...
                //we kick users out when they lose their privileges to private channels.
                console.log("Leaving channel: " + this.activeChannel.sid + " " + this.activeChannel.friendlyName)
                if (this.activeChannel.type !== "private")
                    await this.activeChannel.leave();
            }
            if (this.currentSID !== sid) {
                return;//raced with another update
            }
            this.activeChannel = await this.props.appState.chatClient.getJoinedChannel(sid);
            if (!this.activeChannel) {
                console.log("Unable to join channel: " + sid)
                return;
            }
            if (this.currentSID !== sid) {
                return;//raced with another update
            }
            if (this.chanInfo) {
                this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v => v !== this);
                this.chanInfo.components = this.chanInfo.components.filter(v => v !== this);
            }
            this.props.appState.chatClient.callWithRetry(() => {
                assert(this.activeChannel);
                return this.activeChannel.getMessages(30);
            }).then((messages) => {
                if (this.currentSID !== sid)
                    return;
                assert(this.activeChannel);
                this.messagesLoaded(this.activeChannel, messages)
            });


            this.members = [];
            // TODO: await this?
            this.props.appState.chatClient.callWithRetry(() => {
                assert(this.activeChannel);
                return this.activeChannel.getMembers();
            }).then(members => this.members = members);

            let chanInfo = this.props.appState.chatClient.joinedChannels[sid];
            this.chanInfo = chanInfo;
            chanInfo.components.push(this);
            if (this.props.visible)
                chanInfo.visibleComponents.push(this);
            this.dmOtherUser = null;
            if (chanInfo.attributes.mode === "directMessage") {
                let p1 = chanInfo.conversation?.get("member1").id;
                let p2 = chanInfo.conversation?.get("member2").id;
                this.dmOtherUser = p1;
                if (this.props.appState.userProfile && p1 === this.props.appState.userProfile.id)
                    this.dmOtherUser = p2;
            }
            let stateUpdate = {
                chatLoading: false,
                activeChannelName: (this.activeChannel.friendlyName ? this.activeChannel.friendlyName : this.activeChannel.uniqueName),
                readOnly: false,
            };
            this.isAnnouncements = false;
            if (chanInfo.attributes.category === "announcements-global") {
                this.isAnnouncements = true;
                //find out if we are able to write to this.
                if (!this.props.appState.isModerator && !this.props.appState.isAdmin && !this.props.appState.isManager) {
                    console.log("read only")
                    stateUpdate.readOnly = true;
                }

            }


            if (this.currentSID !== sid) {
                return;//raced with another update
            }
            this.setState(stateUpdate);

        } else {
            if (this.currentSID !== sid) {
                return;//raced with another update
            }
            this.setState({
                chatAvailable: false,
                messages: []
            })
        }

    }
    componentWillUnmount() {
        if (this.chanInfo) {
            this.chanInfo.components = this.chanInfo.components.filter(v => v !== this);
            this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v => v !== this);
        }
    }

    updateUnreadCount(lastConsumed: number, lastTotal: number) {
        if (lastConsumed !== this.lastConsumedMessageIndex || lastTotal > this.lastSeenMessageIndex) {
            if (lastTotal < 0)
                lastTotal = this.lastSeenMessageIndex;
            let unread = lastTotal - lastConsumed;
            if (unread < 0)
                unread = 0;
            if (lastConsumed == null) {
                unread++;
            }
            if (unread !== this.unread) {
                if (this.props.setUnreadCount)
                    this.props.setUnreadCount(unread);
            }
            this.lastConsumedMessageIndex = lastConsumed;
            this.lastSeenMessageIndex = lastTotal;
            this.unread = unread;
        }
    }

    groupMessages(messages: Array<Message>) {
        let ret = [];
        let reactions: { [x: string]: { [y: string]: EmojiObject } } = {};
        let lastMessage = undefined;
        if (!messages)
            return;
        let lastSID;
        let lastIndex = -1;

        let authorIDs: { [x: string]: string } = {};
        for (let message of messages) {
            if (lastSID && lastSID === message.sid) {
                continue;
            }
            lastSID = message.sid;
            lastIndex = message.index;
            let messageAttributes: any = message.attributes;
            if (!lastMessage || (!messageAttributes.associatedMessage && (message.author !== lastMessage.author || moment(message.timestamp).diff(lastMessage.timestamp, 'minutes') > 5))) {
                if (lastMessage)
                    ret.push(lastMessage);
                let authorID = message.author;
                authorIDs[authorID] = authorID;
                lastMessage = {
                    author: message.author,
                    timestamp: message.timestamp,
                    messages: messageAttributes.associatedMessage ? [] : [message],
                    sid: message.sid
                };
            } else {

                if (messageAttributes.associatedMessage) {
                    let messageWithObj: { [x: string]: EmojiObject } = reactions[messageAttributes.associatedMessage] === undefined ? {} : reactions[messageAttributes.associatedMessage];
                    let emojiObj: EmojiObject = messageWithObj[message.body] === undefined ? { count: 0, emojiMessage: null, authors: [] } : messageWithObj[message.body];

                    if (!emojiObj.authors.includes(message.author)) {
                        if (this.props.appState.userProfile && message.author === this.props.appState.userProfile.id) {
                            let newCount = emojiObj.emojiMessage ? emojiObj.count : emojiObj.count + 1;
                            emojiObj = { ...emojiObj, emojiMessage: message, count: newCount };
                        } else {
                            emojiObj = { ...emojiObj, count: emojiObj.count + 1 };
                        }
                        emojiObj.authors.push(message.author);
                    }
                    messageWithObj = { ...messageWithObj, [message.body]: emojiObj };
                    reactions = { ...reactions, [messageAttributes.associatedMessage]: messageWithObj };

                } else {
                    lastMessage.messages.push(message);
                }
            }
        }

        if (lastMessage)
            ret.push(lastMessage);
        let atLeastOneIsVisible = this.chanInfo && this.chanInfo.visibleComponents.length > 0;
        if ((this.props.visible || atLeastOneIsVisible) && lastIndex >= 0) {
            this.consumptionFrontier++;
            let idx = this.consumptionFrontier;
            this.props.appState.chatClient.callWithRetry(async () => {
                if (this.consumptionFrontier !== idx)
                    return;
                return this.activeChannel?.setAllMessagesConsumed();
            });

            this.updateUnreadCount(lastIndex, lastIndex);
        } else if (!(this.props.visible || atLeastOneIsVisible)) {
            //TODO lastConsumedMessageIndex is wrong, not actually last seen
            let lastConsumed = this.lastConsumedMessageIndex;
            if (lastConsumed < 0 && lastIndex >= 0) {
                lastConsumed = this.activeChannel?.lastConsumedMessageIndex || 0;
            }
            if (lastConsumed !== undefined && lastIndex >= 0)
                this.updateUnreadCount(lastConsumed, lastIndex);
        }

        if (!this.props.visible) {
            this.deferredGroupedMessages = ret;
            this.deferredReactions = reactions;
        } else {
            this.setState({
                groupedMessages: ret,
                reactions: reactions
            });
        }
    }

    messagesLoaded = (channel: Channel, messagePage: Paginator<Message>) => {
        this.count = 0;
        if (messagePage.items && messagePage.items.length > 0)
            this.currentPage[channel.sid] = messagePage;
        this.messages[channel.sid] = messagePage.items;
        this.groupMessages(this.messages[channel.sid]);
        this.setState({ hasMoreMessages: messagePage.hasPrevPage, loadingMessages: false })
    };
    linkRenderer = (props: any) => {
        let currentDomain = window.location.origin;
        if (props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={() => { this.props.history.push(props.href.replace(currentDomain, "")) }}>
                {props.children}
            </a>;
        return <a href={props.href} rel="noopener noreferrer" target="_blank">{props.children}</a>;
    };


    memberLeft = (member: Member) => {
        this.members = this.members.filter(m => m.sid !== member.sid);
    }

    memberJoined = (member: Member) => {
        this.members.push(member);
    }

    messageAdded = (channel: Channel, message: Message) => {
        if (!this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to add message to non-existing channel " + channel.sid);
            return;
        }
        // do not display a reaction message
        this.messages[channel.sid].push(message);
        this.groupMessages(this.messages[channel.sid]);
        if (this.isAnnouncements) {
            //get the sender
            this.props.appState.programCache.getUserProfileByProfileID(message.author).then((profile) => {
                const args = {
                    message:
                        <span>Announcement from {profile.get("displayName")} @ <Tooltip mouseEnterDelay={0.5} title={moment(message.timestamp).calendar()}>
                            <span>{moment(message.timestamp).format('LT')}</span>
                        </Tooltip>
                        </span>,
                    description:
                        <ReactMarkdown source={message.body} renderers={{
                            text: emojiSupport,
                            link: this.linkRenderer
                        }} />,
                    placement: "topLeft" as "topLeft",
                    onClose: () => {
                        if (message.index > this.lastConsumedMessageIndex) {
                            this.updateUnreadCount(message.index, -1);
                            let idx = message.index;
                            this.settingConsumedIdx = idx;
                            this.props.appState.chatClient.callWithRetry(
                                async () => {
                                    if (idx < this.settingConsumedIdx)
                                        return;
                                    return channel.advanceLastConsumedMessageIndex(idx);
                                });
                        }
                    },
                    duration: 600,
                };
                notification.info(args);
            })
        }

    };

    messageRemoved = (channel: Channel, message: Message) => {
        if (!this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to remove message from non-existing channel " + channel.sid);
            return;
        }
        this.messages[channel.sid] = this.messages[channel.sid].filter((v) => v.sid !== message.sid)
        this.groupMessages(this.messages[channel.sid]);
    };

    messageUpdated = (channel: Channel, message: Message) => {
        if (!this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to update message in non-existing channel " + channel.sid);
            return;
        }
        this.messages[channel.sid] = this.messages[channel.sid].map(m => m.sid === message.sid ? message : m)
        this.groupMessages(this.messages[channel.sid]);
    };

    timeout = async (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sendMessageWithRetry = async (message: string, data?: any) => {
        return this.props.appState.chatClient.callWithRetry(async () => {
            return this.activeChannel?.sendMessage(message, data);
        });
    };

    sendMessage = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        if (!event.getModifierState("Shift")) {
            let msg = this.form?.current.getFieldValue("message");
            if (msg)
                msg = msg.replace(/\n/g, "  \n");
            try {
                await this.sendMessageWithRetry(msg);
            } catch (err) {
                msg.error("Unable to send message, please try again.");
                return;
            }
            if (!this.clearedTempFlag) {
                this.props.appState.chatClient.channelSIDsThatWeHaventMessagedIn = this.props.appState.chatClient.channelSIDsThatWeHaventMessagedIn.filter(c => c !== this.activeChannel?.sid);
                this.clearedTempFlag = true;
            }
            // if (this.form && this.form.current)
            //     this.form.current.resetFields();

            let values = { message: "" }
            this.form.current.setFieldsValue(values);
            // this.form.current.resetFields();
            // this.form.current.scrollToField("message");
            //TODO if no longer a DM (converted to group), don't do this...
            if (this.dmOtherUser && !this.members.find(m => m.identity === this.dmOtherUser)) {
                this.activeChannel?.add(this.dmOtherUser).catch((err) => console.error(err));
            }

        }
    };

    async sendReaction(msg: Message | null, event: any) {
        if (msg == null) {
            //add to the current input
            let message = this.form.current.getFieldValue("message");
            if (message === undefined)
                message = "";

            let values = { message: message + event.native }
            this.form.current.setFieldsValue(values);
            return;
        }
        if (this.pendingReactions[msg.sid]) {
            return;
        }
        this.pendingReactions[msg.sid] = true;
        let emoji = event.colons ? event.colons : event.id;
        if (this.state.reactions?.[msg.sid]?.[emoji]?.emojiMessage) {
            this.state.reactions[msg.sid][emoji].emojiMessage?.remove().then(() => {
                this.pendingReactions[msg.sid] = false;
            });
            return;
        }
        await this.sendMessageWithRetry(emoji, { associatedMessage: msg.sid });
        this.pendingReactions[msg.sid] = false;
    }

    deleteMessage(message: Message) {
        if (this.props.appState.userProfile && message.author === this.props.appState.userProfile.id)
            message.remove();
        else {
            let idToken = this.props.appState.user!.getSessionToken();

            fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/chat/deleteMessage`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        conference: this.props.appState.currentConference?.id,
                        identity: idToken,
                        room: message.channel.sid,
                        message: message.sid,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
        }
    }

    componentDidUpdate(prevProps: ChatFrameProps) {
        let isDifferentChannel = this.props.sid !== this.sid;

        if (prevProps.visible !== this.props.visible) {
            if (this.chanInfo) {
                if (this.props.visible)
                    this.chanInfo.visibleComponents.push(this);
                else {
                    this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v => v !== this);
                }
            }

            if (this.props.visible && this.deferredGroupedMessages) {
                this.setState({
                    groupedMessages: this.deferredGroupedMessages,
                    reactions: this.deferredReactions
                });
                this.deferredReactions = {};
                this.deferredGroupedMessages = [];
            }
            if (this.props.visible && this.unread) {
                //update unreads...
                this.consumptionFrontier++;
                let idx = this.consumptionFrontier;
                this.props.appState.chatClient.callWithRetry(async () => {
                    if (this.consumptionFrontier !== idx)
                        return;
                    return this.activeChannel?.setAllMessagesConsumed();
                });
                this.updateUnreadCount(this.lastSeenMessageIndex, this.lastSeenMessageIndex);
            }
            this.setState({ visible: this.props.visible });
        }
        if (isDifferentChannel) {
            this.sid = this.props.sid;
            this.setState({ sid: this.props.sid });
            this.changeChannel(this.props.sid);
        }
    }

    loadMoreMessages() {
        if (this.activeChannel && !this.loadingMessages) {
            this.loadingMessages = true;
            let intendedChanelSID = this.activeChannel.sid;
            this.setState({ loadingMessages: true });
            if (!this.currentPage[this.activeChannel.sid])
                return;
            this.currentPage[this.activeChannel.sid].prevPage().then(messagePage => {
                if (!this.activeChannel || this.activeChannel.sid !== intendedChanelSID) {
                    this.loadingMessages = false;
                    return;
                }
                this.setState({
                    hasMoreMessages: messagePage.hasPrevPage
                    //messagePage.hasPrevPage
                    , loadingMessages: false
                })
                this.count++;
                this.currentPage[this.activeChannel.sid] = messagePage;
                this.messages[this.activeChannel.sid] = messagePage.items.concat(this.messages[this.activeChannel.sid]);
                this.groupMessages(this.messages[this.activeChannel.sid]);
                this.loadingMessages = false;

                // if(messagePage.items && messagePage.items.length > 0)
                //     this.oldestMessages[channel.sid] = messagePage.items[0].index;
                //
                // this.messagesLoaded(this.activeChannel, messages)
            });
        }
        // console.log("Load mor messages called")
        // this.setState({hasMoreMessages: false});

    }


    render() {
        if (this.state.chatDisabled) {
            return <div></div>
        }
        if (!this.props.appState.user) {
            return <div></div>
        }
        let date_stamp_arr: Array<number> = [];
        // BCP: A good idea that doesn't quite work: chats are fine, but DMs show sender's name, not receiver's...
        let toWhom = this.chanInfo?.attributes?.mode === "directMessage"
            ? "Send a direct message"
            : this.activeChannel?.friendlyName ? "Send a message to " + this.activeChannel.friendlyName : "Send a message to this channel";

        return <div className="embeddedChatFrame">
            {this.props.header}
            {/*<Layout>*/}
            <div
                className="embeddedChatListContainer"
            >
                {/*<div style={{ height:"calc(100vh - "+(topHeight + 20)+"px)", overflow: "auto"}}>*/}
                {/*<Affix>*/}
                {/*    <Picker onSelect={this.reactTo}/>*/}
                {/*</Affix>*/}
                <InfiniteScroll
                    // getScrollParent={() => this.scrollParentRef}
                    isReverse={true}
                    useWindow={false}

                    style={{ width: "100%" }}
                    loadMore={this.loadMoreMessages.bind(this)} hasMore={!this.state.loadingMessages && this.state.hasMoreMessages}

                // className="embeddedChatListContainer"
                >
                    <List loading={this.state.chatLoading}
                        style={{ width: "100%" }}
                        dataSource={this.state.groupedMessages} size="small"
                        renderItem={
                            (item: GroupedMessages) => {
                                let itemUID = item.author;
                                let isMyMessage = this.props.appState.userProfile ?
                                    itemUID === this.props.appState.userProfile.id : false;
                                // let options = "";
                                // if (isMyMessage)
                                //     options = <Popconfirm
                                //         title="Are you sure that you want to delete this message?"
                                //         onConfirm={this.deleteMessage.bind(this, item)}
                                //         okText="Yes"
                                //         cancelText="No"
                                //     ><Tooltip mouseEnterDelay={0.5} title={"Delete this message"}><a
                                //         href="#"><CloseOutlined/></a></Tooltip></Popconfirm>
                                let addDate = false;
                                if (item.messages.length > 0) {
                                    let date = moment(item.timestamp).date()
                                    if (!date_stamp_arr.includes(date)) {
                                        date_stamp_arr.push(date);
                                        addDate = true;
                                    }
                                }

                                return (
                                    <List.Item style={{ padding: '0', width: "100%", textAlign: 'left' }}
                                        key={item.sid}>
                                        <div style={{ width: "100%" }}>
                                            {(addDate ? <Divider
                                                style={{ margin: '0' }}>{moment(item.timestamp).format("LL")}</Divider> : "")}
                                            {item.messages.length > 0 &&
                                                <div className={"chatMessageContainer"}>
                                                    <div>
                                                        <UserStatusDisplay
                                                            popover={true}
                                                            profileID={item.author}
                                                        // timestamp={this.formatTime(item.timestamp)} TODO: This does nothing
                                                        />
                                                    </div>

                                                    <div>
                                                        {item.messages.map((m) =>
                                                            this.wrapWithOptions(m, isMyMessage)
                                                        )}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    </List.Item>
                                )
                            }
                        }
                    >
                    </List>
                </InfiniteScroll>
            </div>
            {
                this.state.readOnly ? <></> : <div
                    className={"embeddedChatMessageEntry"}
                // style={{
                // padding: "0px 0px 0px 0px",
                // backgroundColor: "#f8f8f8",
                // position: "fixed",
                // bottom: "0px",
                // paddingLeft: "10px"
                //}}
                >
                    <Form ref={this.form} className="embeddedChatMessageEntry" name={"chat" + this.props.sid + Math.random()}>
                        <div className="chatEntryWrapper">
                            <Form.Item name="message">
                                <Input.TextArea
                                    disabled={this.state.readOnly}
                                    className="embeddedChatMessage"
                                    placeholder={this.state.readOnly ? "This channel is read-only" : toWhom}
                                    autoSize={{ minRows: 1, maxRows: 6 }}
                                    onPressEnter={this.sendMessage}
                                />

                                {/*<EmojiPickerPopover emojiSelected={(emoji)=>{*/}
                                {/*    console.log(emoji)*/}
                                {/*}} />*/}
                            </Form.Item>
                            <Button className="emojiPickerButton" onClick={(event) => {
                                this.props.appState.chatClient.openEmojiPicker(null, event, this);
                            }}><SmileOutlined /></Button>
                        </div>
                    </Form>
                </div>
            }

            {/*</Layout>*/}
        </div>

    }


    wrapWithOptions(m: Message, isMyMessage: boolean) {
        let options = [];
        // options.push(<a href="#" key="react" onClick={()=>{
        //     _this.setState({
        //         reactingTo: m
        //     })
        // }}><SmileOutlined/> </a>);
        //
        let actionButton;
        let attrs: any = m.attributes;
        if (m.attributes && attrs.linkTo) {
            actionButton = <Button onClick={() => { this.props.history.push(attrs.path) }}>Join Video</Button>
        }
        // if (isMyMessage || this.props.appState.isModerator || this.props.appState.isAdmin)
        options.push(
            <div key="emojiPicker">
                <Tag key="add-react" onClick={(event) => {
                    this.props.appState.chatClient.openEmojiPicker(m, event, this);
                }}><SmileOutlined />+</Tag>
            </div>
        );

        if (isMyMessage || this.props.appState.isModerator || this.props.appState.isAdmin)
            options.push(
                <div key="deleteButton" className="deleteButton">
                    <Popconfirm
                        key="delete"
                        title="Are you sure that you want to delete this message?"
                        onConfirm={this.deleteMessage.bind(this, m)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <a href="#">X</a>
                    </Popconfirm>
                </div>

            )
        /*
        
        <Popover key={m.sid} mouseEnterDelay={0.5} placement="leftTop"
                                    content={<div style={{backgroundColor: "white"}}>
                                        {options}
                                    </div>}>
         */
        let reactions = null;
        if (this.state.reactions && this.state.reactions[m.sid])
            reactions = this.state.reactions[m.sid];
        return <div key={m.sid}>
            <div ref={(el) => {
                this.messagesEnd = el;
            }} className="chatMessage">
                <div className="messageActions">
                    {options}

                </div>
                <ReactMarkdown source={m.body} renderers={{ text: emojiSupport, link: this.linkRenderer }} />
                {actionButton}
            </div>
            {
                !reactions ? <></> : (
                    <div className="reactionWrapper">
                        {
                            Object.keys(reactions).sort().map(emojiId => {
                                if (this.state.reactions[m.sid][emojiId].count <= 0)
                                    return <></>;
                                let hasMyReaction = this.state.reactions[m.sid][emojiId].emojiMessage;
                                let tagClassname = (hasMyReaction ? "emojiReact-mine" : "emojiReact");

                                let reactors: Array<string> = this.state.reactions[m.sid][emojiId].authors.map(id => {
                                    return this.props.appState.programCache.failFast_GetUserProfileByProfileID(id)?.get("displayName");
                                }).filter(x => x !== null);

                                let reactorList = intersperse(reactors, ", ").reduce((a, s) => a + s);
                                return this.state.reactions[m.sid][emojiId].count <= 0 ? null :
                                    <Tooltip key={emojiId}
                                        title={reactorList + " reacted with a " + emojiId}
                                    ><Tag.CheckableTag
                                        className={tagClassname}
                                        checked={hasMyReaction != null}
                                        onChange={this.sendReaction.bind(this, m, { id: emojiId })}>
                                            <Emoji size={15} emoji={emojiId} />
                                            {this.state.reactions[m.sid][emojiId].count}
                                        </Tag.CheckableTag></Tooltip>
                            })
                        }
                        <Tag key="add-react" onClick={(event) => {
                            this.props.appState.chatClient.openEmojiPicker(m, event, this);
                        }}><SmileOutlined />+</Tag>

                    </div>
                )}
        </div>
    }
}

const AuthConsumer = withRouter((props: ChatFrameProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <span>TODO: ChatFrame when clowdrState is null.</span> :
            <ChatFrame {...props} appState={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
