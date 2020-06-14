import {AuthUserContext} from "../Session";
import Meta from "antd/lib/card/Meta";

import emoji from 'emoji-dictionary';
import 'emoji-mart/css/emoji-mart.css'

import InfiniteScroll from 'react-infinite-scroller';

import {Card, Divider, Form, Input, Layout, List, Popconfirm, Popover, Tooltip} from 'antd';
import "./chat.css"
import React from "react";
import ReactMarkdown from "react-markdown";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import {CloseOutlined} from "@material-ui/icons";

const emojiSupport = text => text.value.replace(/:\w+:/gi, name => emoji.getUnicode(name));

const linkRenderer = props => <a href={props.href} target="_blank">{props.children}</a>;

const {Header, Content, Footer, Sider} = Layout;

var moment = require('moment');
const INITIAL_STATE = {
    expanded: true,
    chatLoading: true,
    token: '',
    chatReady: false,
    messages: [],
    profiles: [],
    authors: {},
    loadingChannels: true,
    chatHeight: "400px",
    groupedMessages: [],
    newMessage: ''
};

class SidebarChat extends React.Component {
    constructor(props) {
        super(props);

        this.messages = {};
        this.currentPage = {};
        let siderWidth = Number(localStorage.getItem("chatWidth"));
        if(siderWidth == 0)
            siderWidth = 250;
        else if(siderWidth == -1)
            siderWidth = 0;
        this.state = {...INITIAL_STATE, chatChannel: "#general", siderWidth: siderWidth, hasMoreMessages: false, loadingMessages: true,
        numMessagesDisplayed: 0}
        this.form = React.createRef();


    }

    setDrawerWidth(width){
        this.setState({siderWidth: width})
        this.props.setWidth(width);
        localStorage.setItem("chatWidth", (width == 0 ? -1 : width));
    }


    formatTime(timestamp) {
        return <Tooltip title={moment(timestamp).calendar()}>{moment(timestamp).format('LT')}</Tooltip>
    }

    async componentDidMount() {
        if(this.props.auth.user){
            this.user = this.props.auth.user;
            this.changeChannel("#general");
        }
        this.props.setWidth(this.state.siderWidth)
    }

    async changeChannel(uniqueNameOrSID) {
        let user = this.props.auth.user;
        console.log("Change channel: " + uniqueNameOrSID)
        if(uniqueNameOrSID == this.currentUniqueName && this.props.auth.currentConference == this.currentConference)
            return;
        this.currentConference = this.props.auth.currentConference;
        this.currentUniqueName = uniqueNameOrSID
        if (user && uniqueNameOrSID) {
            if (!this.client) {
                this.client = await this.props.auth.chatClient.initChatClient(user, this.props.auth.currentConference);
            }
            this.setState({
                chatLoading: true,
                messages: [],
                numMessagesDisplayed: 0,
                hasMoreMessages: false,
                loadingMessages: true
            }, async () => {
                if(this.currentUniqueName != uniqueNameOrSID){
                    return;//raced with another update
                }
                if (this.activeChannel) {
                    //leave the current channel
                    this.activeChannel.removeAllListeners("messageAdded");
                    this.activeChannel.removeAllListeners("messageRemoved");
                    this.activeChannel.removeAllListeners("messageUpdated");
                    //we never actually leave a private channel because it's very hard to get back in
                    // - we need to be invited by the server, and that's a pain...
                    //we kick users out when they lose their privileges to private channels.
                    if (this.activeChannel.type !== "private")
                        await this.activeChannel.leave();
                }
                this.activeChannel = await this.props.auth.chatClient.joinAndGetChannel(uniqueNameOrSID);
                this.activeChannel.getMessages(300).then((messages)=> {
                    if(this.currentUniqueName != uniqueNameOrSID)
                        return;
                    this.messagesLoaded(this.activeChannel, messages)
                });
                this.activeChannel.on('messageAdded', this.messageAdded.bind(this, this.activeChannel));
                this.activeChannel.on("messageRemoved", this.messageRemoved.bind(this, this.activeChannel));
                this.activeChannel.on("messageUpdated", this.messageUpdated.bind(this, this.activeChannel));
               let stateUpdate = {
                    chatLoading: false,
                   activeChannelName: (this.activeChannel.friendlyName ? this.activeChannel.friendlyName : this.activeChannel.uniqueName)
               }
               console.log("Changing active channel name to: " + stateUpdate.activeChannelName)
               if(!uniqueNameOrSID.startsWith("#"))
               {
                   if(this.state.siderWidth == 0)
                       stateUpdate.siderWidth = 250;
               }
                this.setState(stateUpdate);
            });

        } else {
            if(this.currentUniqueName != uniqueNameOrSID){
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

    groupMessages(messages) {
        let ret = [];
        let lastMessage = undefined;
        if (!messages)
            return undefined;
        let _this = this;
        let lastSID;

        for (let message of messages) {
            if(lastSID && lastSID==message.sid)
                continue;
            lastSID = message.sid;
            if (!lastMessage || message.author != lastMessage.author || moment(message.timestamp).diff(lastMessage.timestamp, 'minutes') > 5) {
                if (lastMessage)
                    ret.push(lastMessage);
                let authorID = message.author;
                if (!this.state.authors[authorID]) {
                    this.props.auth.helpers.getUserRecord(authorID).then((user) => {
                        _this.setState((prevState) => ({
                            authors: {...prevState.authors, [authorID]: (user ? user.get("displayName") : authorID)}
                        }))
                    })
                }

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
        this.setState({groupedMessages: ret});

    }

    messagesLoaded = (channel, messagePage) => {
        this.count = 0;
        if(messagePage.items && messagePage.items.length > 0)
            this.currentPage[channel.sid] = messagePage;
        this.messages[channel.uniqueName] = messagePage.items
        this.groupMessages(this.messages[channel.uniqueName]);
        this.setState({hasMoreMessages: messagePage.hasPrevPage, loadingMessages: false})
    };
    messageAdded = (channel, message) => {
        this.messages[channel.uniqueName].push(message);
        this.groupMessages(this.messages[channel.uniqueName]);

    };

    messageRemoved = (channel, message) => {
        this.messages[channel.uniqueName] = this.messages[channel.uniqueName].filter((v) => v.sid != message.sid)
        this.groupMessages(this.messages[channel.uniqueName]);
    };
    messageUpdated = (channel, message) => {
        this.messages[channel.uniqueName] = this.messages[channel.uniqueName].map(m => m.sid == message.sid ? message : m)
        this.groupMessages(this.messages[channel.uniqueName]);
    };

    onMessageChanged = event => {
        if(event.target.value != '\n')
        this.setState({newMessage: event.target.value});
    };

    sendMessage = event => {
        if(!event.getModifierState("Shift")){
            let message = this.state.newMessage;
            this.setState({newMessage: ''});
            if(message)
                message = message.replace(/\n/g, "  \n");
            this.activeChannel.sendMessage(message);
            if (this.form && this.form.current)
                this.form.current.resetFields();
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
        if (this.props.auth.chatChannel != this.state.chatChannel) {
            this.setState({chatChannel: this.props.auth.chatChannel});
            this.changeChannel(this.props.auth.chatChannel);
        }
    }

    loadMoreMessages(){
        console.log("LMM " + this.loadingMessages)
        if(this.activeChannel && !this.loadingMessages){
            this.loadingMessages =true;
            let intendedChanelSID = this.activeChannel.sid;
            this.setState({loadingMessages: true});
            console.log("Old oldest message:" + this.currentPage[this.activeChannel.sid] )
            this.currentPage[this.activeChannel.sid].prevPage().then(messagePage=>{
                if(this.activeChannel.sid != intendedChanelSID){
                    this.loadingMessages =false;
                    return;
                }
                this.setState({hasMoreMessages: messagePage.hasPrevPage
                    //messagePage.hasPrevPage
                    , loadingMessages: false})
                this.count++;
                console.log(messagePage.items[0].index);
                console.log(messagePage)
                this.currentPage[this.activeChannel.sid] = messagePage;
                this.messages[this.activeChannel.uniqueName] = messagePage.items.concat(this.messages[this.activeChannel.uniqueName]);
                this.groupMessages(this.messages[this.activeChannel.uniqueName]);
                this.loadingMessages =false;
                console.log("Set loadingMessages =false")

                // if(messagePage.items && messagePage.items.length > 0)
                //     this.oldestMessages[channel.sid] = messagePage.items[0].index;
                //
                // this.messagesLoaded(this.activeChannel, messages)
            });
        }

    }
    render() {
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if (topElement)
            topHeight = topElement.clientHeight;

        const handleMouseDown = e => {
            console.log("Mouse down")
            document.addEventListener("mouseup", handleMouseUp, true);
            document.addEventListener("mousemove", handleMouseMove, true);
        };

        const handleMouseUp = () => {
            console.log("Mouse up")
            document.removeEventListener("mouseup", handleMouseUp, true);
            document.removeEventListener("mousemove", handleMouseMove, true);
        };

        const handleMouseMove = (e) => {
            const newWidth = document.body.offsetWidth - e.clientX;
            if (newWidth >= 0 && newWidth <= document.body.offsetWidth - 20)
            {
                this.setDrawerWidth(newWidth);
                localStorage.setItem("chatWidth", (newWidth == 0 ? -1 : newWidth));
            }
        };

        if(!this.props.auth.user){
            return <div></div>
        }
        let containerStyle = {width: this.state.siderWidth, top: topHeight};
        if(this.state.siderWidth <5){
            containerStyle.width="10px";
        }
        return <div className="chatTab" style={containerStyle}>
            <Layout.Sider collapsible collapsed={this.state.siderWidth == 0}
                          trigger={null}
                          width={this.state.siderWidth}
                          collapsedWidth={0}
                          theme="light"
                          style={{backgroundColor: '#f8f8f8', position: "absolute", top:"0", bottom:"0",right:"0", width: this.state.siderWidth}}>
                <div>
                    <Layout>
                        <Header style={{backgroundColor: "#f8f8f8", paddingRight:0, paddingBottom:"5px", paddingLeft:"10px", fontWeight: "bold"}}>
                            <div className="chatChannelID">Chat: {this.state.activeChannelName}</div>
                        </Header>
                        <Content style={{backgroundColor: "#f8f8f8", overflowY:"auto", overflowWrap:"break-word", position: "fixed", top: topHeight+40, bottom: "50px",
                            paddingLeft: "10px",
                            display: 'flex',
                            flexDirection: 'column-reverse'}}>
                            {/*<div style={{ height:"calc(100vh - "+(topHeight + 20)+"px)", overflow: "auto"}}>*/}
                                {/*<Affix>*/}
                                {/*    <Picker onSelect={this.reactTo}/>*/}
                                {/*</Affix>*/}
                                {/*<InfiniteScroll*/}
                                {/*    getScrollParent={() => this.scrollParentRef}*/}

                                {/*    loadMore={this.loadMoreMessages.bind(this)} hasMore={!this.state.loadingMessages && this.state.hasMoreMessages}*/}
                                {/*style={{overflow:"auto", display:"flex"}}>*/}
                                <List loading={this.state.chatLoading}
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
                                              //     ><Tooltip title={"Delete this message"}><a
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
                                                          <Card bodyStyle={{padding: '5px', backgroundColor:"#f8f8f8"}}
                                                                style={{border: 'none', width: "100%"}}>
                                                              <Meta
                                                                  title={<div>{this.state.authors[item.author]}&nbsp;
                                                                     <span
                                                                          className="timestamp">{this.formatTime(item.timestamp)}</span>
                                                                  </div>}
                                                              />
                                                              <div>
                                                                  {item.messages.map((m) =>
                                                                      this.wrapWithOptions(m, isMyMessage)
                                                                  )}
                                                              </div>
                                                          </Card></div>
                                                  </List.Item>
                                              )
                                          }
                                      }
                                      style={{
                                          width: this.state.siderWidth,
                                          // height: 'calc(100vh - '+(topHeight+90)+"px)",
                                          overflow: 'auto',
                                          display: 'flex',
                                          flexDirection: 'column-reverse',
                                          border: '1px solid #FAFAFA'
                                      }}
                                >
                                </List>
                                {/*</InfiniteScroll>*/}
                        </Content>
                        <Footer style={{padding: "0px 0px 0px 0px", backgroundColor: "#f8f8f8", position: "fixed", bottom: "0px", width: this.state.siderWidth, paddingLeft: "10px"}}>
                            <div></div>
                            <Form ref={this.form}>
                                <Form.Item>
                                    <Input.TextArea
                                        name={"message"}
                                        id={"message"}
                                        placeholder={"Send a message"}
                                        autoSize={{ minRows: 1, maxRows: 6 }}
                                        onChange={this.onMessageChanged}
                                        onPressEnter={this.sendMessage}
                                        value={this.state.newMessage}/>
                                </Form.Item>
                            </Form>
                        </Footer>
                    </Layout>
                </div>
            </Layout.Sider>
                <div className="dragIconMiddleRight"
                     onClick={()=>{
                         localStorage.setItem("chatWidth", this.state.siderWidth == 0 ? 250 : -1);
                         this.props.setWidth((this.state.siderWidth == 0 ? 250 : 10));
                         this.setState((prevState)=>({siderWidth: prevState.siderWidth == 0 ? 250 : 0}))
                     }}
                >
                    {this.state.siderWidth == 0 ? <Tooltip title="Open the chat drawer"><ChevronLeftIcon/></Tooltip>:<Tooltip title="Close the chat drawer"><ChevronRightIcon/></Tooltip>}
                    {/*<Button className="collapseButton"><ChevronLeftIcon /></Button>*/}
                </div>

                <div className="roomDraggerRight" onMouseDown={e => handleMouseDown(e)} ></div>

                {/*<div className="dragIconBottom" onMouseDown={e => handleMouseDown(e)}></div>*/}

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
        if(isMyMessage || this.props.auth.permissions.includes("moderator"))
            options.push( <Popconfirm
                key="delete"
                title="Are you sure that you want to delete this message?"
                onConfirm={this.deleteMessage.bind(this, m)}
                okText="Yes"
                cancelText="No"
            ><a href="#"><CloseOutlined style={{color: "red"}}/></a></Popconfirm>)
        if(options.length > 0)
         return <Popover  key={m.sid} placement="topRight" content={<div style={{backgroundColor:"white"}}>
            {options}
        </div>}><div ref={(el) => { this.messagesEnd = el; }} className="chatMessage"><ReactMarkdown source={m.body} renderers={{ text: emojiSupport, link:linkRenderer}} /></div>
        </Popover>
        return <div key={m.sid} className="chatMessage"><ReactMarkdown source={m.body}
                                                                       renderers={{text: emojiSupport, link:linkRenderer}}/></div>


    }

}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <SidebarChat {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;