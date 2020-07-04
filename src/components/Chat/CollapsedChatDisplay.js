import React from "react";
import {Badge, Skeleton} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";

class CollapsedChatDisplay extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            sid: this.props.sid,
            unread: this.props.unread
        }
    }

    getChatTitle(chat) {
        if(!chat){
            console.log("No chat!")
            return <Skeleton.Input active style={{width: '20px', height: '1em'}}/>;
        }
        this.titleSet = true;
        if (chat.attributes && chat.attributes.mode == "directMessage") {
            let p1 = chat.conversation.get("member1");
            let p2 = chat.conversation.get("member2");
            let profileID = p1.id;
            if(profileID == this.props.auth.userProfile.id)
                profileID = p2.id;
            this.setState({title: "Loading..."});
            this.props.auth.helpers.getUserProfilesFromUserProfileID(profileID).then((profile) => {
                this.setState({title: profile.get("displayName")})
            })
        } else if (chat.attributes.category == "announcements-global") {
            this.setState({title: "Announcements"});
        }
        else if(chat.attributes.category == "programItem"
            || chat.attributes.category == "breakoutRoom" || chat.attributes.mode == "group") {
            this.setState({title: chat.channel.friendlyName});
        }
        else{
            this.setState({title: chat.channel.sid});
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.state.unread != this.props.unread)
            this.setState({unread: this.props.unread})
        if(this.props.auth.chatClient.joinedChannels[this.state.sid] && !this.titleSet){
            this.getChatTitle(this.props.auth.chatClient.joinedChannels[this.state.sid])
            if(!this.listenerActivated)
            {
                this.listenerActivated = true;
                this.props.auth.chatClient.joinedChannels[this.state.sid].channel.on("updated",this.updateTitle);
            }
        }
    }
    updateTitle(update) {
        if (this.mounted) {
            if(update.channel && update.channel.attributes && update.updateReasons && update.updateReasons.length > 1){
                this.props.auth.chatClient.joinedChannels[this.state.sid].channel = update.channel;
                this.props.auth.chatClient.joinedChannels[this.state.sid].attributes = update.channel.attributes;
            }
            this.getChatTitle(this.props.auth.chatClient.joinedChannels[this.state.sid]);
        }
    }
    componentWillUnmount() {
        if(this.props.auth.chatClient.joinedChannels[this.state.sid])
            this.props.auth.chatClient.joinedChannels[this.state.sid].channel.off("updated",this.updateTitle.bind(this));
    }

    async componentDidMount() {
        this.mounted = true;
        this.getChatTitle(this.props.auth.chatClient.joinedChannels[this.state.sid])
        if(this.props.auth.chatClient.joinedChannels[this.state.sid]){
            this.listenerActivated = true;
            this.props.auth.chatClient.joinedChannels[this.state.sid].channel.on("updated",this.updateTitle.bind(this));
        }

        if(!this.mounted)
            return;
    }

    openDM(){
        this.props.auth.helpers.createOrOpenDM(this.state.profile);
    }

    render() {
        if (!this.state.title)
            return <Skeleton.Input active style={{width: '100px', height: '1em'}}/>
       return <span
            key={this.state.sid}
            className="userTag"
            onClick={()=>{this.props.auth.chatClient.openChat(this.state.sid)}}
            >
           <Badge overflowCount={9} className="chat-unread-count" count={this.state.unread} /> {this.state.title}
        </span>

    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <CollapsedChatDisplay {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default withRouter(AuthConsumer);
