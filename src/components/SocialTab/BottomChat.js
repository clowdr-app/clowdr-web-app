import React from "react";
import {AuthUserContext} from "../Session";
import {Button, Skeleton, Tooltip} from "antd"
import ChatFrame from "../Chat/ChatFrame";
import {CloseOutlined, PlusOutlined} from "@ant-design/icons"

class BottomChat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chats: [],
        };
        this.channelSubscriptions = {};
    }

    openChat(sid) {
        console.log("Opening chat: "+ sid)
        console.trace();
        this.registerChatSubscriptions(sid);
        this.setState((prevState) => {
            let found = prevState.chats.find((c) => c== sid);
            let stateUpdate = {};
            if (!found) {
                stateUpdate.chats = [sid, ...prevState.chats];
            }
            stateUpdate[sid] = true;
            return stateUpdate;
        });
    }

    async componentDidMount() {
        this.setState({user: this.props.auth.user})
        if(this.props.auth.user){
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            this.props.auth.chatClient.initBottomChatBar(this);
            // this.openChat('CH283e1041f395495e847c3d25e53606ca')
        }
        // for(let chat of this.state.chats){
        //     this.registerChatSubscriptions(chat);
        // }
    }
    registerChatSubscriptions(sid){
        // this.props.auth.chatClient.addChannelListener(this);
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
    }

    render() {
        if (this.state.user) {
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
            chat: this.props.chatClient.joinedChannels[this.props.sid]
        // channel: this.props.chatClient.getJoinedChannel(this.props.sid)
        }
        console.log(this.props.sid)
        console.log(this.props.chatClient.joinedChannels)
        console.log(this.props.chatClient.joinedChannels[this.props.sid])
        console.log(this.state.chat)
    }

    async componentDidMount() {
        console.log("Moutned " + this.state.sid)
        console.log(this.state.chat)
        if(!this.state.chat){
            //TODO
            let res = await this.props.chatClient.getJoinedChannel(this.props.sid);
            console.log("waited for")
            console.log(res);
            console.log(this.props.chatClient.joinedChannels[this.props.sid])
            this.setState({chat: this.props.chatClient.joinedChannels[this.props.sid]})
        }
        this.setState({title: this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid])})
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
                console.log(profile);
                this.setState({title: profile.get("displayName")})
            })
        }
        return chat.channel.sid;
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
        this.state.chat.channel.leave();
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
                <Tooltip title="Add someone to this chat">
                    <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}  icon={<PlusOutlined />}
                                                              onClick={this.addUser.bind(this)}
                /></Tooltip>
                <Tooltip title="Minimize this window"><Button size="small" type="primary" shape="circle"
                                                              style={{minWidth: "initial"}}  icon={<CloseOutlined />}
            onClick={
                // this.props.toggleOpen
                this.destroyChat.bind(this)
            }
            /></Tooltip>
            </div>
        </div>
        chatWindow = <div className={windowClass} >
            <ChatFrame sid={this.state.sid} width="240px" header={header}/>
        </div>
        return <div className="bottomChatWindowContainer"><Button type="primary" className={buttonClass} onClick={this.props.toggleOpen}>{this.state.title}</Button>{chatWindow}</div>
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