import {AuthUserContext} from "../Session";

import emoji from 'emoji-dictionary';
import 'emoji-mart/css/emoji-mart.css'

import {Badge, Layout, Popconfirm, Popover, Tooltip} from 'antd';
import "./chat.css"
import React from "react";
import ReactMarkdown from "react-markdown";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import {CloseOutlined} from "@material-ui/icons";
import ChatFrame from "../Chat/ChatFrame";

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
    newMessage: '',
    unreadCount: 0
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
            priorWidth: siderWidth,
        numMessagesDisplayed: 0}
        this.form = React.createRef();


    }

    setDrawerWidth(width){
        this.setState({siderWidth: width})
        this.props.setWidth(width);
        localStorage.setItem("chatWidth", (width == 0 ? -1 : width));
    }

    async componentDidMount() {
        if(this.props.auth.user && this.props.auth.user.get('passwordSet')){
            this.user = this.props.auth.user;
            // this.changeChannel("#general");
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            this.props.setWidth(this.state.siderWidth)
        }
        else{
            this.setState({chatDisabled: true})
            this.props.setWidth(0);

        }
    }


    async componentDidUpdate(prevProps, prevState, snapshot) {
        let isDifferentUser = this.user != this.props.auth.user;
        this.user = this.props.auth.user;
        let isDifferentChannel = this.props.auth.chatChannel != this.state.channel;

        if(!this.state.visible && this.props.auth.user && this.props.auth.user.get("passwordSet")){
            this.setState({visible: true});
            this.props.setWidth(250);
        }
        if(this.state.chatDisabled && this.props.auth.user && this.props.auth.user.get("passwordSet")){
            this.setState({chatDisabled: false})
        }
        if(this.props.auth.forceChatOpen && this.state.siderWidth == 0){
            this.setState({siderWidth: 250});
            this.props.auth.helpers.setGlobalState({forceChatOpen: false})
        }
        if (isDifferentChannel || isDifferentUser) {
            if(!isDifferentUser && this.props.auth.chatChannel == null &&
                this.props.auth.activeSpace && !this.props.auth.chatChannel &&
                this.props.auth.activeSpace.get("chatChannel") == this.state.channel){
                return;
            }
            let newChannel = this.props.auth.chatChannel;
            if(!newChannel && this.props.auth.activeSpace){
                //fall back to the current social space
                newChannel = this.props.auth.activeSpace.get("chatChannel");
            }
            if (this.desiredChannel == newChannel)
                return;
            this.desiredChannel = newChannel;
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            //check to make sure we are a member
            let channels = this.props.auth.chatClient.joinedChannels;
            let found = channels[newChannel];
            if (!found) {
                found = await this.props.auth.chatClient.joinAndGetChannel(newChannel);
                if (this.desiredChannel != newChannel)
                    return;
            }
            else{
                found = found.channel;
            }
            this.setState({sid: newChannel, channel: found});
        }
    }


    render() {
        if(this.state.chatDisabled){
            return <div></div>
        }
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

        if(!this.state.sid){
            return <div></div>
        }
        let containerStyle = {width: this.state.siderWidth, top: topHeight};
        if(this.state.siderWidth <5){
            containerStyle.width="10px";
        }
        return <div className="chatTab" style={containerStyle}>
            <ChatFrame sid={this.state.sid} visible={this.state.siderWidth > 0} setUnreadCount={(c)=>{this.setState({unreadCount: c})}} header={<div className="chatIdentitySidebar">Chat: {this.state.channel.friendlyName}</div>}/>

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

                <div className="roomDraggerRight" onMouseDown={e => handleMouseDown(e)} ><Badge count={this.state.unreadCount} offset={[-20,0]}  overflowCount={99} onClick={()=>{
                    localStorage.setItem("chatWidth", this.state.siderWidth == 0 ? 250 : -1);
                    this.props.setWidth((this.state.siderWidth == 0 ? 250 : 10));
                    this.setState((prevState)=>({siderWidth: prevState.siderWidth == 0 ? 250 : 0}))
                }} /></div>

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