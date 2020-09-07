import { AuthUserContext } from "../Session";

import 'emoji-mart/css/emoji-mart.css'

import "./chat.css"
import React from "react";
import ChatFrame from "../Chat/ChatFrame";

// const emojiSupport = text => text.value.replace(/:\w+:/gi, name => emoji.getUnicode(name));

// const linkRenderer = props => <a href={props.href} rel="noopener noreferrer" target="_blank">{props.children}</a>;

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

export class SidebarChat extends React.Component {
    constructor(props) {
        super(props);

        this.messages = {};
        this.currentPage = {};
        let siderWidth = Number(localStorage.getItem("chatWidth"));
        if (siderWidth === 0)
            siderWidth = 250;
        else if (siderWidth === -1)
            siderWidth = 0;
        this.state = {
            ...INITIAL_STATE, siderWidth: siderWidth, hasMoreMessages: false, loadingMessages: true,
            priorWidth: siderWidth,
            numMessagesDisplayed: 0
        }
        this.form = React.createRef();


    }

    setDrawerWidth(width) {
        this.setState({ siderWidth: width })
        localStorage.setItem("chatWidth", (width === 0 ? -1 : width));
    }

    async componentDidMount() {
        if (this.props.auth.user && this.props.auth.user.get('passwordSet')) {
            this.user = this.props.auth.user;
            // this.changeChannel("#general");
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            this.props.auth.chatClient.initChatSidebar(this);
        }
        else {
            this.setState({ chatDisabled: true })

        }
    }

    async setChannel(channel, leaveWhenChanges) {
        // this.shouldLeaveChannel = leaveWhenChanges;
        this.shouldLeaveChannel = false;
        this.setState({ sid: channel.sid, channel: channel, chatDisabled: false });
    }

    async setChatDisabled(disabled) {
        this.setState({ chatDisabled: disabled });
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.user = this.props.auth.user;

        if (!this.state.visible && this.props.auth.user && this.props.auth.user.get("passwordSet")) {
            this.setState({ visible: true });
        }
        if (this.state.chatDisabled && this.props.auth.user && this.props.auth.user.get("passwordSet")) {
            this.setState({ chatDisabled: false })
        }
        if (this.props.auth.forceChatOpen && this.state.siderWidth === 0) {
            this.setState({ siderWidth: 250 });
        }
    }

    render() {
        if (this.state.chatDisabled) {
            return <div></div>
        }
        if (!this.state.sid) {
            return <div></div>
        }
        return <ChatFrame sid={this.state.sid} leaveOnChange={this.shouldLeaveChannel} visible={true} setUnreadCount={(c) => { this.setState({ unreadCount: c }) }} header={<div className="chatIdentitySidebar">Context Channel: {this.state.channel.friendlyName}</div>} />
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <SidebarChat {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;
