import {AuthUserContext} from "../Session";
import {Emoji} from 'emoji-mart'
import {emojify} from 'react-emojione';
// import emoji from 'emoji-dictionary';
import 'emoji-mart/css/emoji-mart.css'

import {Button, Divider, Form, Input, Layout, List, notification, Popconfirm, Tag, Tooltip} from 'antd';
import "./chat.css"
import React from "react";
import ReactMarkdown from "react-markdown";
import {SmileOutlined} from "@ant-design/icons"
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import InfiniteScroll from 'react-infinite-scroller';
// import EmojiPickerPopover from "./EmojiPickerPopover";

const emojiSupport = text => emojify(text.value, {output: 'unicode'});

const {Header, Content, Footer, Sider} = Layout;

var moment = require('moment');
const INITIAL_STATE = {
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
};

class ChatFrame extends React.Component {
    constructor(props) {
        super(props);

        this.messages = {};
        this.currentPage = {};
        this.state = {
            ...INITIAL_STATE,
            hasMoreMessages: false,
            loadingMessages: true,
            numMessagesDisplayed: 0,
            visible: this.props.visible
        }
        this.form = React.createRef();
        this.lastConsumedMessageIndex= -1;
        this.lastSeenMessageIndex = -1;
        this.pendingReactions = {};
        this.consumptionFrontier = 0;
    }

    formatTime(timestamp) {
        return <Tooltip mouseEnterDelay={0.5} title={moment(timestamp).calendar()}>{moment(timestamp).format('LT')}</Tooltip>
    }

    async componentDidMount() {
        if (this.props.auth.user) {
            this.user = this.props.auth.user;
            this.sid = this.props.sid;
            this.changeChannel(this.props.sid);
        }
    }

    async changeChannel(sid) {
        // console.log("currentSID: " + this.currentSID + " sid: " + sid + " activeChannel: " + this.activeChannel);
        let user = this.props.auth.user;
        if (!sid) {
            this.setState({chatDisabled: true});
        } else if (this.state.chatDisabled) {
            this.setState({chatDisabled: false});
        }
        if (sid == this.currentSID)
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
                this.client = await this.props.auth.chatClient.initChatClient(user, this.props.auth.currentConference, this.props.auth.userProfile, this.props.auth);
            }
            // console.log("Prepared client for " + uniqueNameOrSID + ", " + this.currentUniqueNameOrSID)
            if (this.currentSID != sid) {
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
            if (this.currentSID != sid) {
                return;//raced with another update
            }
            this.activeChannel = await this.props.auth.chatClient.getJoinedChannel(sid);
            if(!this.activeChannel){
                console.log("Unable to join channel: " + sid)
                return;
            }
            if (this.currentSID != sid) {
                return;//raced with another update
            }
            if (this.chanInfo) {
                this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v => v != this);
                this.chanInfo.components = this.chanInfo.components.filter(v => v != this);
            }
            this.props.auth.chatClient.callWithRetry(()=>this.activeChannel.getMessages(30)).then((messages) => {
                if (this.currentSID != sid)
                    return;
                this.messagesLoaded(this.activeChannel, messages)
            });


            this.members = [];
            this.props.auth.chatClient.callWithRetry(()=>this.activeChannel.getMembers()).then(members => this.members = members);

            let chanInfo = this.props.auth.chatClient.joinedChannels[sid];
            this.chanInfo = chanInfo;
            chanInfo.components.push(this);
            if(this.props.visible)
                chanInfo.visibleComponents.push(this);
            this.dmOtherUser = null;
            if(chanInfo.attributes.mode == "directMessage"){
                let p1 = chanInfo.conversation.get("member1").id;
                let p2 = chanInfo.conversation.get("member2").id;
                this.dmOtherUser = p1;
                if(p1 == this.props.auth.userProfile.id)
                   this.dmOtherUser = p2;
            }
            let stateUpdate = {
                chatLoading: false,
                activeChannelName: (this.activeChannel.friendlyName ? this.activeChannel.friendlyName : this.activeChannel.uniqueName),
            }
            this.isAnnouncements = false;
            if(chanInfo.attributes.category == "announcements-global"){
                this.isAnnouncements = true;
                //find out if we are able to write to this.
                if(!this.props.auth.isModerator && !this.props.auth.isAdmin && !this.props.auth.isManager){
                    console.log("read only")
                    stateUpdate.readOnly = true;
                }

            }


            if (this.currentSID != sid) {
                return;//raced with another update
            }
            this.setState(stateUpdate);

        } else {
            if (this.currentSID != sid) {
                return;//raced with another update
            }
            // console.log("Unable to set channel because no user or something:")
            // console.log(user);
            // console.log(uniqueNameOrSID)
            this.setState({
                chatAvailable: false,
                // siderWidth: 0,
                meesages: []
            })
        }

    }
    componentWillUnmount() {
        if(this.chanInfo){
            this.chanInfo.components = this.chanInfo.components.filter(v=>v!=this);
            this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v=>v!=this);
        }
    }

    updateUnreadCount(lastConsumed, lastTotal) {
        if (lastConsumed != this.lastConsumedMessageIndex || lastTotal > this.lastSeenMessageIndex) {
            if(lastTotal < 0)
                lastTotal = this.lastSeenMessageIndex;
            let unread = lastTotal - lastConsumed;
            if(unread < 0)
                unread = 0;
            if(lastConsumed == null){
                unread++;
            }
            if (unread != this.unread) {
                if (this.props.setUnreadCount)
                    this.props.setUnreadCount(unread);
            }
            this.lastConsumedMessageIndex = lastConsumed;
            this.lastSeenMessageIndex = lastTotal;
            this.unread = unread;
        }
    }

    groupMessages(messages, channelId) {
        let ret = [];
        let reactions = {};
        let myReactions = {};
        let lastMessage = undefined;
        if (!messages)
            return undefined;
        let _this = this;
        let lastSID;
        let lastIndex = -1;

        let authorIDs = {};
        for (let message of messages) {
            if (lastSID && lastSID == message.sid) {
                continue;
            }
            lastSID = message.sid;
            lastIndex = message.index;
            if (!lastMessage || (!message.attributes.associatedMessage && (message.author != lastMessage.author || moment(message.timestamp).diff(lastMessage.timestamp, 'minutes') > 5))) {
                if (lastMessage)
                    ret.push(lastMessage);
                let authorID = message.author;
                authorIDs[authorID] = authorID;
                lastMessage = {
                    author: message.author,
                    timestamp: message.timestamp,
                    messages: message.attributes.associatedMessage ? [] : [message],
                    sid: message.sid
                };
            } else {
                if (message.attributes.associatedMessage) {
                    let messageWithObj = reactions[message.attributes.associatedMessage] === undefined ? {} : reactions[message.attributes.associatedMessage];
                    let emojiObj = messageWithObj[message.body] === undefined ? {count: 0, emojiMessage: null, authors: []} : messageWithObj[message.body];

                    if (!emojiObj.authors.includes(message.author)) {
                        if (message.author === this.props.auth.userProfile.id) {
                            let newCount = emojiObj.emojiMessage ? emojiObj.count : emojiObj.count + 1;
                            emojiObj = {...emojiObj, emojiMessage: message, count: newCount};
                        } else {
                            emojiObj = {...emojiObj, count: emojiObj.count + 1};
                        }
                        emojiObj.authors.push(message.author);
                    }
                    messageWithObj = {...messageWithObj, [message.body]: emojiObj};
                    reactions = {...reactions, [message.attributes.associatedMessage]: messageWithObj};

                } else {
                    lastMessage.messages.push(message);
                }
            }
        }

        if (lastMessage)
            ret.push(lastMessage);
        let atLeastOneIsVisible = this.chanInfo.visibleComponents.length > 0;
        if ((this.props.visible || atLeastOneIsVisible) && lastIndex >= 0){
            this.consumptionFrontier++;
            let idx = this.consumptionFrontier;
            this.props.auth.chatClient.callWithRetry(()=>{
                if(this.consumptionFrontier != idx)
                    return;
                return this.activeChannel.setAllMessagesConsumed()});

            this.updateUnreadCount(lastIndex, lastIndex);
        } else if(!(this.props.visible || atLeastOneIsVisible)){
            //TODO lastConsumedMessageIndex is wrong, not actually last seen
            let lastConsumed = this.lastConsumedMessageIndex;
            if (lastConsumed < 0 && lastIndex >=0){
                lastConsumed = this.activeChannel.lastConsumedMessageIndex;
            }
            if (lastConsumed !== undefined && lastIndex >= 0)
                this.updateUnreadCount(lastConsumed, lastIndex);
        }

        if(!this.props.visible){
            this.deferredGroupedMessages = ret;
            this.deferredReactions = reactions;
        }else {
            this.setState({
                groupedMessages: ret,
                reactions: reactions
            });
        }
    }

    messagesLoaded = (channel, messagePage) => {
        this.count = 0;
        if (messagePage.items && messagePage.items.length > 0)
            this.currentPage[channel.sid] = messagePage;
        this.messages[channel.sid] = messagePage.items
        this.groupMessages(this.messages[channel.sid], channel.sid);
        this.setState({hasMoreMessages: messagePage.hasPrevPage, loadingMessages: false})
    };
    linkRenderer = (props) => {
        let currentDomain = window.location.origin;
            if(props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={()=>{this.props.auth.history.push(props.href.replace(currentDomain,""))}}>{props.children}</a>;
        return <a href={props.href} target="_blank">{props.children}</a>;
    };


    memberLeft = (member)=>{
        this.members = this.members.filter(m=>m.sid != member.sid);
    }

    memberJoined = (member)=>{
        this.members.push(member);
    }

    messageAdded = (channel, message) => {
        if (!this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to add message to non-existing channel " + channel.sid);
            return;
        }
        // do not display a reaction message
        this.messages[channel.sid].push(message);
        this.groupMessages(this.messages[channel.sid], channel.sid);
        if (this.isAnnouncements){
            //get the sender
            this.props.auth.programCache.getUserProfileByProfileID(message.author,null).then((profile)=>{
                const args = {
                    message: <span>Announcement from {profile.get("displayName")} @ <Tooltip mouseEnterDelay={0.5} title={moment(message.timestamp).calendar()}>{moment(message.timestamp).format('LT')}</Tooltip></span>,
                    description:
                    <ReactMarkdown source={message.body} renderers={{
                        text: emojiSupport,
                        link: this.linkRenderer
                    }}/>,
                    placement: 'topLeft',
                    onClose: ()=>{
                        if(message.index > this.lastConsumedMessageIndex){
                            this.updateUnreadCount(message.index, -1);
                            let idx = message.index;
                            this.settingConsumedIdx = idx;
                            this.props.auth.chatClient.callWithRetry(
                                ()=>{
                                    if(idx < this.settingConsumedIdx)
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

    messageRemoved = (channel, message) => {
        if (this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to remove message from non-existing channel " + channel.sid);
            return;
        }
        this.messages[channel.sid] = this.messages[channel.sid].filter((v) => v.sid != message.sid)
        this.groupMessages(this.messages[channel.sid], channel.sid);
    };
    messageUpdated = (channel, message) => {
        if (this.messages[channel.sid]) {
            console.log("[ChatFrame]: attempt to update message in non-existing channel " + channel.sid);
            return;
        }
        this.messages[channel.sid] = this.messages[channel.sid].map(m => m.sid == message.sid ? message : m)
        this.groupMessages(this.messages[channel.sid], channel.sid);
    };

    onMessageChanged = event => {
        // if (event.target.value != '\n')
        //     this.setState({newMessage: event.target.value});
    };
    timeout = async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    sendMessageWithRetry = async (message, data) => {
        return this.props.auth.chatClient.callWithRetry(() => {
                return this.activeChannel.sendMessage(message, data)
            }
        );
    };

    sendMessage = async (event) => {
        event.preventDefault();
        if (!event.getModifierState("Shift")) {
            let msg = this.form.current.getFieldValue("message");
            if (msg)
                msg = msg.replace(/\n/g, "  \n");
            try {
                await this.sendMessageWithRetry(msg);
            } catch(err){
                msg.error("Unable to send message, please try again.");
                return;
            }
            if(!this.clearedTempFlag){
                this.props.auth.chatClient.channelsThatWeHaventMessagedIn = this.props.auth.chatClient.channelsThatWeHaventMessagedIn.filter(c=>c!=this.activeChannel.sid);
                this.clearedTempFlag = true;
            }
            // if (this.form && this.form.current)
            //     this.form.current.resetFields();

            let values={message: ""}
            this.form.current.setFieldsValue(values);
            // this.form.current.resetFields();
            // this.form.current.scrollToField("message");
            //TODO if no longer a DM (converted to group), don't do this...
            if(this.dmOtherUser && !this.members.find(m => m.identity == this.dmOtherUser)){
                this.activeChannel.add(this.dmOtherUser).catch((err)=>console.log(err));
            }

        }
    };

    async sendReaction(msg, event) {
        if(msg == null){
            //add to the current input
            let message = this.form.current.getFieldValue("message");
            if(message === undefined)
                message = "";

            let values={message: message + event.native}
            this.form.current.setFieldsValue(values);
            return;
        }
        if(this.pendingReactions[msg.sid]){
            return;
        }
        this.pendingReactions[msg.sid] = true;
        let emoji = event.colons? event.colons: event.id;
        if (this.state.reactions?.[msg.sid]?.[emoji]?.emojiMessage) {
            this.state.reactions[msg.sid][emoji].emojiMessage.remove().then(()=>{
                this.pendingReactions[msg.sid] = false;
            });
            return;
        }
        await this.sendMessageWithRetry(emoji, {associatedMessage: msg.sid});
        this.pendingReactions[msg.sid] = false;
    }

    deleteMessage(message) {
        if (message.author == this.props.auth.userProfile.id)
            message.remove();
        else {
            let idToken = this.props.auth.user.getSessionToken();

            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/chat/deleteMessage`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        conference: this.props.auth.currentConference.id,
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

    areEqualID(o1, o2) {
        if (!o1 && !o2)
            return true;
        if (!o1 || !o2)
            return false;
        return o1.id == o2.id;
    }

    areEqualSID(o1, o2) {
        if (!o1 && !o2)
            return true;
        if (!o1 || !o2)
            return false;
        return o1.sid == o2.sid;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        let isDifferentChannel = this.props.sid != this.sid;

        if(prevProps.visible!= this.props.visible){
            if(this.chanInfo) {
                if (this.props.visible)
                    this.chanInfo.visibleComponents.push(this);
                else {
                    this.chanInfo.visibleComponents = this.chanInfo.visibleComponents.filter(v => v != this);
                }
            }

            if(this.props.visible && this.deferredGroupedMessages){
                this.setState({
                    groupedMessages: this.deferredGroupedMessages,
                    reactions: this.deferredReactions
                });
                this.deferredReactions = null;
                this.deferredGroupedMessages = null;
            }
            if(this.props.visible && this.unread){
                //update unreads...
                this.consumptionFrontier++;
                let idx = this.consumptionFrontier;
                this.props.auth.chatClient.callWithRetry(()=>{
                    if(this.consumptionFrontier != idx)
                        return;
                    return this.activeChannel.setAllMessagesConsumed()});
                this.updateUnreadCount(this.lastSeenMessageIndex, this.lastSeenMessageIndex);
            }
            this.setState({visible: this.props.visible});
        }
        if (isDifferentChannel) {
            this.sid = this.props.sid;
            this.setState({sid: this.props.sid});
            this.changeChannel(this.props.sid);
        }
    }

    loadMoreMessages() {
        if (this.activeChannel && !this.loadingMessages) {
            this.loadingMessages = true;
            let intendedChanelSID = this.activeChannel.sid;
            this.setState({loadingMessages: true});
            if(!this.currentPage[this.activeChannel.sid])
                return;
            this.currentPage[this.activeChannel.sid].prevPage().then(messagePage => {
                if (this.activeChannel.sid != intendedChanelSID) {
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
        if (!this.props.auth.user) {
            return <div></div>
        }
        let date_stamp_arr = [];
        return <div className="embeddedChatFrame"
        >
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

                                style={{width: "100%"}}
                                loadMore={this.loadMoreMessages.bind(this)} hasMore={!this.state.loadingMessages && this.state.hasMoreMessages}

                                // className="embeddedChatListContainer"
                            >
                            <List loading={this.state.chatLoading}
                                  style={{width: "100%"}}
                                  dataSource={this.state.groupedMessages} size="small"
                                  renderItem={
                                      item => {
                                          let itemUID = item.author;
                                          let isMyMessage = itemUID == this.props.auth.userProfile.id;
                                          // let options = "";
                                          // if (isMyMessage)
                                          //     options = <Popconfirm
                                          //         title="Are you sure that you want to delete this message?"
                                          //         onConfirm={this.deleteMessage.bind(this, item)}
                                          //         okText="Yes"
                                          //         cancelText="No"
                                          //     ><Tooltip mouseEnterDelay={0.5} title={"Delete this message"}><a
                                          //         href="#"><CloseOutlined/></a></Tooltip></Popconfirm>
                                          let initials = "";
                                          let authorID = item.author;
                                          let addDate = false;
                                          if (item.messages.length > 0) {
                                              let date = moment(item.timestamp).date()
                                              if (!date_stamp_arr.includes(date)) {
                                                date_stamp_arr.push(date);
                                                addDate = true;
                                              }
                                          }



                                          return (
                                              <List.Item style={{padding: '0', width: "100%", textAlign: 'left'}}
                                                         key={item.sid}>
                                                  <div style={{width: "100%"}}>
                                                    {(addDate ? <Divider
                                                          style={{margin: '0'}}>{moment(item.timestamp).format("LL")}</Divider> : "")}
                                                      {item.messages.length > 0 &&
                                                          <div className={"chatMessageContainer"}>
                                                              <div>
                                                                  <UserStatusDisplay
                                                                      popover={true}
                                                                      profileID={item.author}
                                                                      timestamp={this.formatTime(item.timestamp)}/>
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
                this.state.readOnly? <></> :  <div
                    className={"embeddedChatMessageEntry"}
                    // style={{
                    // padding: "0px 0px 0px 0px",
                    // backgroundColor: "#f8f8f8",
                    // position: "fixed",
                    // bottom: "0px",
                    // paddingLeft: "10px"
                    //}}
                >
                    <Form ref={this.form} className="embeddedChatMessageEntry" name={"chat"+this.props.sid+Math.random()}>
                        <div className="chatEntryWrapper">
                        <Form.Item name="message">
                            <Input.TextArea
                                disabled={this.state.readOnly}
                                className="embeddedChatMessage"
                                placeholder={this.state.readOnly? "This channel is read-only" : "Send a message"}
                                autoSize={{minRows: 1, maxRows: 6}}
                                onPressEnter={this.sendMessage}
                            />

                            {/*<EmojiPickerPopover emojiSelected={(emoji)=>{*/}
                            {/*    console.log(emoji)*/}
                            {/*}} />*/}
                        </Form.Item>
                            <Button className="emojiPickerButton" onClick={(event)=>{
                                this.props.auth.chatClient.openEmojiPicker(null, event, this);
                            }}><SmileOutlined /></Button>
                        </div>
                    </Form>
                </div>
            }

                    {/*</Layout>*/}
                </div>

    }


    wrapWithOptions(m, isMyMessage, data) {
        let options = [];
        let _this = this;
        // options.push(<a href="#" key="react" onClick={()=>{
        //     _this.setState({
        //         reactingTo: m
        //     })
        // }}><SmileOutlined/> </a>);
        //
        let actionButton;
        if(m.attributes && m.attributes.linkTo){
            actionButton = <Button onClick={()=>{this.props.auth.history.push(m.attributes.path)}}>Join Video</Button>
        }
        // if (isMyMessage || this.props.auth.isModerator || this.props.auth.isAdmin)
        options.push(
            <div key="emojiPicker">
                <Tag key="add-react" onClick={(event)=>{
                    this.props.auth.chatClient.openEmojiPicker(m, event, this);
                }}><SmileOutlined />+</Tag>
            </div>
        );

        if (isMyMessage || this.props.auth.isModerator || this.props.auth.isAdmin)
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
                    this.messagesEnd = el;}} className="chatMessage">
                    <div className="messageActions">
                        {options}

                    </div>
                    <ReactMarkdown source={m.body} renderers={{text: emojiSupport, link: this.linkRenderer}}/>
                    {actionButton}
                </div>
                {
                    !reactions ? <></> : (
                    <div className="reactionWrapper">
                        {
                            Object.keys(reactions).sort().map(emojiId => {
                                if(this.state.reactions[m.sid][emojiId] <= 0)
                                return <></>;
                                let hasMyReaction = this.state.reactions[m.sid][emojiId].emojiMessage;
                                let tagClassname = (hasMyReaction ? "emojiReact-mine" : "emojiReact");
                                // let authors = this.state.reactions[m.sid][emojiId].
                                let reactors = this.state.reactions[m.sid][emojiId].authors.map((id)=><UserStatusDisplay
                                profileID={id}
                                inline={true}
                                key={id}
                                />)
                                if(reactors.length == 1){
                                    reactors = reactors[0];
                                }
                                else if(reactors.length > 1){
                                    reactors = reactors.reduce((prev,cur)=>[prev, ", ", cur]);
                                }
                                return this.state.reactions[m.sid][emojiId] <= 0 ? null :
                                    <Tooltip key={emojiId}
                                             title={<div>{reactors} reacted with a {emojiId}</div>}
                                    ><Tag.CheckableTag className={tagClassname} checked={hasMyReaction}
                                                      onChange={this.sendReaction.bind(this, m, {id: emojiId})}>
                                        <Emoji size={15} emoji={emojiId} />
                                        {this.state.reactions[m.sid][emojiId].count}
                                    </Tag.CheckableTag></Tooltip>
                            })
                        }
                        <Tag key="add-react" onClick={(event)=>{
                            this.props.auth.chatClient.openEmojiPicker(m, event, this);
                        }}><SmileOutlined />+</Tag>

                    </div>
                )}
            </div>
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ChatFrame {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;
