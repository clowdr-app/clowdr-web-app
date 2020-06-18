import React from "react";
import {AuthUserContext} from "../Session";
import {Button, Card, Form, Input, message, Modal, Radio, Select, Skeleton, Tooltip, Typography} from "antd"
import ChatFrame from "../Chat/ChatFrame";
import {CloseOutlined, PlusOutlined} from "@ant-design/icons"

class BottomChat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chats: [],
        };
    }

    openChat(sid){
        this.setState({
            [sid]: true
        });
    }

    async componentDidMount() {
        this.setState({user: this.props.auth.user})
        if(this.props.auth.user){
            this.twilioChatClient = await this.props.auth.chatClient.initChatClient(this.props.auth.user, this.props.auth.currentConference, this.props.auth.userProfile);
            this.props.auth.chatClient.initBottomChatBar(this);
            // this.openChat('CH283e1041f395495e847c3d25e53606ca')
        }
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
                    this.state.chats.map((chat)=>
                        (<BottomChatWindow key={chat.channel.sid} chat={chat} open={this.state[chat.channel.sid]}
                                           auth={this.props.auth}
                                           toggleOpen={()=>{
                            this.setState((prevState) => ({[chat.channel.sid]: !prevState[chat.channel.sid]}))
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
        this.state ={open: this.props.open, sid: this.props.chat.channel.sid, unreadCount: 0,
            channel: this.props.chat.channel, title:this.getChatTitle(this.props.chat)
        // channel: this.props.chatClient.getJoinedChannel(this.props.sid)
        }
    }
    getChatTitle(chat){
        if(chat.attributes.mode=="directMessage"){
            this.props.auth.helpers.getUserProfilesFromUserProfileID(this.props.chat.members[0]).then((profile)=>
            {
                this.setState({title: profile.get("displayName")})
            })
            return <Skeleton.Input active style={{width: '20px', height: '1em'}}/>
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
                <Tooltip title="Minimize this window"><Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}  icon={<CloseOutlined />}
            onClick={this.props.toggleOpen}
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