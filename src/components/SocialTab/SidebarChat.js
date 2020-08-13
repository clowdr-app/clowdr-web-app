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
        this.state = {...INITIAL_STATE, siderWidth: siderWidth, hasMoreMessages: false, loadingMessages: true,
            priorWidth: siderWidth,
        numMessagesDisplayed: 0}
        this.form = React.createRef();


    }

    setDrawerWidth(width){
        this.setState({siderWidth: width})
        localStorage.setItem("chatWidth", (width == 0 ? -1 : width));
    }

    async componentDidMount() {
        if(this.props.auth.user && this.props.auth.user.get('passwordSet')){
            this.user = this.props.auth.user;
            // this.changeChannel("#general");
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile, this.props.auth);
            this.props.auth.chatClient.initChatSidebar(this);
        }
        else{
            this.setState({chatDisabled: true})

        }
    }


    async componentDidUpdate(prevProps, prevState, snapshot) {
        let isDifferentUser = this.user != this.props.auth.user;
        this.user = this.props.auth.user;
        let isDifferentChannel = this.props.auth.chatChannel != this.state.channel;
        if(this.props.auth.chatChannel == "@chat-ignore"){
            if(!this.state.chatDisabled)
                this.setState({chatDisabled: true});
            return;
        }

        if(!this.state.visible && this.props.auth.user && this.props.auth.user.get("passwordSet")){
            this.setState({visible: true});
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
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile, this.props.auth);
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
            if(found)
                this.setState({sid: found.sid, channel: found});
        }
    }


    render() {
        if(this.state.chatDisabled){
            return <div></div>
        }

        if(!this.state.sid){
            return <div></div>
        }
        return <ChatFrame sid={this.state.sid} visible={this.state.siderWidth > 0} setUnreadCount={(c)=>{this.setState({unreadCount: c})}} header={<div className="chatIdentitySidebar">Chat: {this.state.channel.friendlyName}</div>}/>

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
