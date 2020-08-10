import {AuthUserContext} from "../Session";
import Parse from "parse";

import emoji from 'emoji-dictionary';
import 'emoji-mart/css/emoji-mart.css'

import {Divider, Form, Input, Layout, List, Popconfirm, Popover, Tooltip, notification, Button} from 'antd';
import "./chat.css"
import React from "react";
import ReactMarkdown from "react-markdown";
import {CloseOutlined} from "@material-ui/icons";
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import InfiniteScroll from 'react-infinite-scroller';

const emojiSupport = text => text.value.replace(/:\w+:/gi, name => emoji.getUnicode(name));


const {Header, Content, Footer, Sider} = Layout;

var moment = require('moment');
const INITIAL_STATE = {
    chatLoading: true,
    token: '',
    chatReady: false,
    messages: [],
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
                this.client = await this.props.auth.chatClient.initChatClient(user, this.props.auth.currentConference, this.props.auth.userProfile);
            }
            // console.log("Prepared client for " + uniqueNameOrSID + ", " + this.currentUniqueNameOrSID)
            if (this.currentSID != sid) {
                return;//raced with another update
            }
            if (this.activeChannel) {
                //leave the current channel
                this.activeChannel.removeAllListeners("messageAdded");
                this.activeChannel.removeAllListeners("messageRemoved");
                this.activeChannel.removeAllListeners("messageUpdated");
                this.activeChannel.removeAllListeners("memberJoined");
                this.activeChannel.removeAllListeners("memberLeft");

                //we never actually leave a private channel because it's very hard to get back in
                // - we need to be invited by the server, and that's a pain...
                //we kick users out when they lose their privileges to private channels.
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
            this.activeChannel.getMessages(30).then((messages) => {
                if (this.currentSID != sid)
                    return;
                this.messagesLoaded(this.activeChannel, messages)
                //Load the unread counts.
                this.activeChannel.on('messageAdded', this.messageAdded.bind(this, this.activeChannel));
                this.activeChannel.on("messageRemoved", this.messageRemoved.bind(this, this.activeChannel));
                this.activeChannel.on("messageUpdated", this.messageUpdated.bind(this, this.activeChannel));
            });


            this.members = [];
            this.activeChannel.getMembers().then(members => this.members = members);
            this.activeChannel.on("memberLeft", (member)=> this.members = this.members.filter(m=>m.sid != member.sid));
            this.activeChannel.on("memberJoined", (member)=> this.members.push(member));

            let chanInfo = this.props.auth.chatClient.joinedChannels[sid];
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
                const accesToConf = new Parse.Query('InstancePermission');
                accesToConf.equalTo("conference", this.props.auth.currentConference);
                let actionQ = new Parse.Query("PrivilegedAction");
                actionQ.equalTo("action","announcement-global");
                accesToConf.matchesQuery("action", actionQ);
                const hasAccess = await accesToConf.first();
                if(!hasAccess){
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
        if(this.activeChannel) {
            this.activeChannel.removeAllListeners("messageAdded");
            this.activeChannel.removeAllListeners("messageRemoved");
            this.activeChannel.removeAllListeners("messageUpdated");
            this.activeChannel.removeAllListeners("memberJoined");
            this.activeChannel.removeAllListeners("memberLeft");
        }
    }

    updateUnreadCount(lastConsumed, lastTotal) {
        if (lastConsumed != this.lastConsumedMessageIndex || lastTotal > this.lastSeenMessageIndex) {
            if(lastTotal < 0)
                lastTotal = this.lastSeenMessageIndex;
            let unread = lastTotal - lastConsumed;
            if(unread < 0)
                unread = 0;
            if (unread != this.unread) {
                if (this.props.setUnreadCount)
                    this.props.setUnreadCount(unread);
            }
            this.lastConsumedMessageIndex = lastConsumed;
            this.lastSeenMessageIndex = lastTotal;
            this.unread = unread;
        }
    }

    groupMessages(messages) {
        let ret = [];
        let lastMessage = undefined;
        if (!messages)
            return undefined;
        let _this = this;
        let lastSID;
        let lastIndex = 0;

        let authorIDs = {};
        for (let message of messages) {
            if (lastSID && lastSID == message.sid)
                continue;
            lastSID = message.sid;
            lastIndex = message.index
            if (!lastMessage || message.author != lastMessage.author || moment(message.timestamp).diff(lastMessage.timestamp, 'minutes') > 5) {
                if (lastMessage)
                    ret.push(lastMessage);
                let authorID = message.author;
                authorIDs[authorID] = authorID;
                lastMessage = {
                    author: message.author,
                    timestamp: message.timestamp,
                    messages: [message],
                    sid: message.sid
                };
            } else {
                lastMessage.messages.push(message);
            }
        }
        if (lastMessage)
            ret.push(lastMessage);
        if(this.props.visible){
            this.activeChannel.setAllMessagesConsumed();
            this.updateUnreadCount(lastIndex, lastIndex);
        }else if(!this.props.visible){
            //TODO lastConsumedMessageIndex is wrong, not actually last seen
            let lastConsumed = this.lastConsumedMessageIndex;
            if(lastConsumed < 0){
                lastConsumed = this.activeChannel.lastConsumedMessageIndex;
            }
            if(lastConsumed !== undefined)
            this.updateUnreadCount(lastConsumed, lastIndex);
        }
        this.props.auth.helpers.getUserProfilesFromUserProfileIDs(Object.keys(authorIDs));

        this.setState({groupedMessages: ret});

    }

    messagesLoaded = (channel, messagePage) => {
        this.count = 0;
        if (messagePage.items && messagePage.items.length > 0)
            this.currentPage[channel.sid] = messagePage;
        this.messages[channel.sid] = messagePage.items
        this.groupMessages(this.messages[channel.sid]);
        this.setState({hasMoreMessages: messagePage.hasPrevPage, loadingMessages: false})
    };
    linkRenderer = (props) => {
        let currentDomain = window.location.origin;
            if(props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={()=>{this.props.auth.history.push(props.href.replace(currentDomain,""))}}>{props.children}</a>;
        return <a href={props.href} target="_blank">{props.children}</a>;
    };

    messageAdded = (channel, message) => {
        this.messages[channel.sid].push(message);
        this.groupMessages(this.messages[channel.sid]);
        if(this.isAnnouncements){
            //get the sender
            this.props.auth.helpers.getUserProfilesFromUserProfileID(message.author).then((profile)=>{
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
                            channel.advanceLastConsumedMessageIndex(message.index)
                        }
                    },
                    duration: 600,
                };
                notification.info(args);
            })
        }

    };

    messageRemoved = (channel, message) => {
        this.messages[channel.sid] = this.messages[channel.sid].filter((v) => v.sid != message.sid)
        this.groupMessages(this.messages[channel.sid]);
    };
    messageUpdated = (channel, message) => {
        this.messages[channel.sid] = this.messages[channel.sid].map(m => m.sid == message.sid ? message : m)
        this.groupMessages(this.messages[channel.sid]);
    };

    onMessageChanged = event => {
        // if (event.target.value != '\n')
        //     this.setState({newMessage: event.target.value});
    };

    sendMessage = event => {
        event.preventDefault();
        if (!event.getModifierState("Shift")) {
            let message = this.form.current.getFieldValue("message");
            if (message)
                message = message.replace(/\n/g, "  \n");
            this.activeChannel.sendMessage(message);
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
                        conference: this.props.auth.currentConference.get("slackWorkspace"),
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
            if(this.props.visible && this.unread){
                //update unreads...
                this.activeChannel.setAllMessagesConsumed();
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
            console.log(this.state.loadingMessages)
            this.loadingMessages = true;
            let intendedChanelSID = this.activeChannel.sid;
            this.setState({loadingMessages: true});
            this.currentPage[this.activeChannel.sid].prevPage().then(messagePage => {
                if (this.activeChannel.sid != intendedChanelSID) {
                    this.loadingMessages = false;
                    return;
                }
                console.log(messagePage)
                console.log(messagePage.hasPrevPage)
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
                                          let addDate = this.lastDate && this.lastDate != moment(item.timestamp).day();
                                          this.lastDate = moment(item.timestamp).day();


                                          return (
                                              <List.Item style={{padding: '0', width: "100%", textAlign: 'left'}}
                                                         key={item.sid}>
                                                  <div style={{width: "100%"}}>
                                                      {(addDate ? <Divider
                                                          style={{margin: '0'}}>{moment(item.timestamp).format("LL")}</Divider> : "")}
                                                      <div
                                                          className={"chatMessageContainer"}
                                                          // bodyStyle={{padding: '5px', backgroundColor: "#f8f8f8"}}
                                                          //   style={{border: 'none', width: "100%"}}
                                                      >

                                                              <div>
                                                                  <UserStatusDisplay
                                                                                     popover={true}
                                                                                     profileID={item.author}/>&nbsp;
                                                                  <span
                                                                      className="timestamp">{this.formatTime(item.timestamp)}</span>
                                                              </div>
                                                          <div>
                                                              {item.messages.map((m) =>
                                                                  this.wrapWithOptions(m, isMyMessage)
                                                              )}
                                                          </div>
                                                      </div></div>
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
                    <Form ref={this.form} className="embeddedChatMessageEntry" name={"chat"+this.props.sid}>
                        <Form.Item style={{width:"100%", marginBottom: "0px"}} name="message">
                            <Input.TextArea
                                disabled={this.state.readOnly}
                                className="embeddedChatMessage"
                                placeholder={this.state.readOnly? "This channel is read-only" : "Send a message"}
                                autoSize={{minRows: 1, maxRows: 6}}
                                onPressEnter={this.sendMessage}
                            />
                        </Form.Item>
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
        if (isMyMessage || this.props.auth.permissions.includes("moderator"))
            options.push(<Popconfirm
                key="delete"
                title="Are you sure that you want to delete this message?"
                onConfirm={this.deleteMessage.bind(this, m)}
                okText="Yes"
                cancelText="No"
            ><a href="#"><CloseOutlined style={{color: "red"}}/></a></Popconfirm>)
        if (options.length > 0)
            return <Popover key={m.sid} mouseEnterDelay={0.5} placement="topRight" content={<div style={{backgroundColor: "white"}}>
                {options}
            </div>}>
                <div ref={(el) => {
                    this.messagesEnd = el;
                }} className="chatMessage"><ReactMarkdown source={m.body}
                                                          renderers={{text: emojiSupport, link: this.linkRenderer}}/>{actionButton}</div>
            </Popover>
        return <div key={m.sid} className="chatMessage"><ReactMarkdown source={m.body}
                                                                       renderers={{
                                                                           text: emojiSupport,
                                                                           link: this.linkRenderer
                                                                       }}/>{actionButton}</div>


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
