import React from "react";
import {AuthUserContext} from "../Session";
import {Badge, Button, Skeleton, Tooltip} from "antd"
import ChatFrame from "../Chat/ChatFrame";
import {CloseOutlined, PlusOutlined, MinusOutlined} from "@ant-design/icons"

class BottomChat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chats: [],
        };
        this.channelSubscriptions = {};
    }

    openChat(sid, dontActuallyOpen) {
        this.setState((prevState) => {
            let stateUpdate = {};
            stateUpdate.chats = prevState.chats.filter(c =>c!=sid);
            stateUpdate.chats = [sid, ...stateUpdate.chats];
            if(!dontActuallyOpen)
                stateUpdate[sid] = true;
            return stateUpdate;
        });
    }

    async componentDidMount() {
        this.setState({user: this.props.auth.user})
        if(this.props.auth.user){
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            this.props.auth.chatClient.initBottomChatBar(this);
        }
        if(this.props.auth.user && !this.props.auth.user.get("passwordSet")){
            this.setState({chatDisabled: true});
        }
    }
    registerChatSubscriptions(sid){
    }
    componentWillUnmount() {
    }

    membersUpdated(sid){

    }
    removeChannel(sid){
        this.setState((prevState) => {
            let stateUpdate = {};
            stateUpdate.chats = prevState.chats.filter(c => c!= sid);
            stateUpdate[sid] = undefined;
            return stateUpdate;
        });
    }
    channelUpdated(channelContainer){

    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.auth.user != this.state.user) {
            this.setState({
                    user: this.props.auth.user
                }
            );
        }
        if(this.state.chatDisabled && this.props.auth.user && this.props.auth.user.get("passwordSet")){
            this.setState({chatDisabled: false})
        }
    }

    render() {
        if (this.state.user && !this.state.chatDisabled) {
            return (
                <div id="bottom-chat-container" style={this.props.style}><div id="bottom-chat-button-bar">{
                    this.state.chats.map((sid)=>
                        (<BottomChatWindow key={sid} open={this.state[sid]}
                                           sid={sid}
                                           auth={this.props.auth}
                                           toggleOpen={()=>{
                            this.setState((prevState) => ({[sid]: !prevState[sid]}))
                        }}
                        chatClient={this.props.auth.chatClient}
                        />)
                    )
                }
                </div>
                </div>
            )
        }
        return <></>
    }
}

class BottomChatWindow extends React.Component{
    constructor(props){
        super(props);
        this.state ={open: this.props.open, sid: this.props.sid, unreadCount: 0,
            chat: this.props.chatClient.joinedChannels[this.props.sid],
        // channel: this.props.chatClient.getJoinedChannel(this.props.sid)
        }
    }

    getChatTitle(chat) {
        if(!chat)
            return <Skeleton.Input active style={{width: '20px', height: '1em'}}/>;
        if (chat.attributes.mode == "directMessage") {
            let p1 = chat.conversation.get("member1");
            let p2 = chat.conversation.get("member2");
            let profileID = p1.id;
            if(profileID == this.props.auth.userProfile.id)
                profileID = p2.id;
            this.props.auth.helpers.getUserProfilesFromUserProfileID(profileID).then((profile) => {
                this.setState({title: profile.get("displayName")})
            })
        }
        else if(chat.attributes.category == "announcements-global"){
            return "Announcements";
        }
        else if(chat.attributes.category == "programItem") {
            return chat.channel.friendlyName;
        }
        return chat.channel.sid;
    }

    async componentDidMount() {
        if(!this.state.chat){
            let res = await this.props.chatClient.getJoinedChannel(this.props.sid);
            this.setState({chat: this.props.chatClient.joinedChannels[this.props.sid]})
        }
        this.setState({title: this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid])})
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.open != this.state.open){
            this.collectFocus = true;
            this.setState({open: this.props.open});
        }
    }

    addUser(){
        this.setState({addUserVisible: true, addUserLoading: false});
    }
    destroyChat(){
        let attr = this.props.chatClient.joinedChannels[this.props.sid].attributes;
        if(attr.category == "announcements-global"){
            this.props.toggleOpen();
        }
        else{
            this.state.chat.channel.leave();
        }
    }

    render() {
        let chatWindow = "";
        let buttonClass = "chatButtonCollapsed";
        if(this.state.loading){
            return <div className="bottomChatWindowContainer"></div>
        }

        let windowClass = "bottomChatWindowCollapsed"
        if(this.state.open){
            buttonClass="chatButtonExpanded"
            windowClass = "bottomChatWindow"
        }

        let header = <div className="bottomChatHeader">
            <div className="bottomChatIdentity">{this.state.title}</div>
            <div className="bottomChatClose">
                <Tooltip title="Add someone to this chat (not yet implemented)">
                    <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}  icon={<PlusOutlined />}
                                                              onClick={this.addUser.bind(this)}
                /></Tooltip>
                <Tooltip title="Leave this chat"><Button size="small" type="primary" shape="circle"
                                                              style={{minWidth: "initial"}}  icon={<CloseOutlined />}
            onClick={
                // this.props.toggleOpen
                this.destroyChat.bind(this)
            }
            /></Tooltip>
                <Tooltip title="Minimize this window"><Button size="small" type="primary" shape="circle"
                                                              style={{minWidth: "initial"}}  icon={<MinusOutlined />}
                                                              onClick={
                                                                  this.props.toggleOpen
                                                              }
                /></Tooltip>

            </div>
        </div>
        chatWindow = <div className={windowClass} >
            <ChatFrame sid={this.state.sid} width="240px" header={header} visible={this.state.open} setUnreadCount={(c)=>{
                this.setState({unreadCount: c})
                this.props.auth.chatClient.setUnreadCount(this.state.sid, c)
            }
            }/>
        </div>
        if(!this.state.open && this.state.chat && this.state.chat.attributes.category == "announcements-global"){
            return chatWindow
        }
        return <div className="bottomChatWindowContainer">
            <Tooltip title={"Chat window for " + this.state.title}><Button type="primary" className={buttonClass} onClick={this.props.toggleOpen}><Badge count={this.state.unreadCount} overflowCount={9} offset={[-5,-10]}/>{this.state.title}</Button></Tooltip>{chatWindow}</div>
    }
}
const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <BottomChat {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;