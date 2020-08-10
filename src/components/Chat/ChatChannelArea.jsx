import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Button, message, Skeleton, Tooltip} from "antd";
// @ts-ignore
import ProgramItem from "../../classes/ProgramItem";
import ChatFrame from "./ChatFrame"
import {CloseOutlined, MinusOutlined, PlusOutlined, VideoCameraAddOutlined} from "@ant-design/icons"

var moment = require('moment');
var timezone = require('moment-timezone');

class ChatChannelArea extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sid: this.props.sid,
            unreadCount: 0,
            chat: this.props.chatClient.joinedChannels[this.props.sid],
            visible: this.props.visible
        };
        this.parentRef = this.props.parentRef;
    }

    async getChatTitle(chat) {
        if (!chat) {
            this.setState({
                title:
                    <Skeleton.Input active style={{width: '20px', height: '1em'}}/>
            })
            return;
        }
        if (chat.attributes.mode == "directMessage") {
            let p1 = chat.conversation.get("member1");
            let p2 = chat.conversation.get("member2");
            let profileID = p1.id;
            if (profileID == this.props.auth.userProfile.id)
                profileID = p2.id;
            this.props.auth.helpers.getUserProfilesFromUserProfileID(profileID).then((profile) => {
                this.setState({title: profile.get("displayName")})
            })
            return;
        } else {
            let title = chat.channel.friendlyName;
            if (chat.attributes.category == "announcements-global") {
                title = "Announcements";
            } else if (chat.attributes.category == "programItem" ||
                chat.attributes.category == "breakoutRoom" || chat.attributes.mode == "group") {
                title = chat.channel.friendlyName;
            } else {
                title = chat.channel.friendlyName;
            }
            try {
                let profiles = await this.props.auth.helpers.getUserProfilesFromUserProfileIDs(chat.members);
                if (profiles.length != chat.members.length) {
                    console.log(chat.members)
                    console.log(profiles)
                    throw "didn't get back all profiles";
                }
                let membersStr = "In this chat: " + profiles.map(p => p.get("displayName")).join(', ');
                this.setState({members: membersStr, title: title, membersCount: chat.members.length});
            } catch (err) {
                console.log(chat.channel.sid)
                console.log(err);
                return;
            }
            return;
        }

    }

    updateTitle(update) {

        if (this.mounted) {
            if (update.channel && update.channel.attributes && update.updateReasons && update.updateReasons.length > 1) {
                this.props.chatClient.joinedChannels[this.props.sid].channel = update.channel;
                this.props.chatClient.joinedChannels[this.props.sid].attributes = update.channel.attributes;
            }
            this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        }
    }

    async componentDidMount() {
        this.mounted = true;
        if (!this.state.chat) {
            let res = await this.props.chatClient.getJoinedChannel(this.props.sid);
            this.setState({chat: this.props.chatClient.joinedChannels[this.props.sid]})
        }
        this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        this.parentRef.memberListener[this.props.sid] = async (channelInfo) => {
            await this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        };
        this.props.chatClient.joinedChannels[this.props.sid].channel.on("updated", this.updateTitle.bind(this));
    }

    componentWillUnmount() {
        this.mounted = false;
        this.parentRef.memberListener[this.props.sid] = null;
        if (this.props.chatClient.joinedChannels[this.props.sid])
            this.props.chatClient.joinedChannels[this.props.sid].channel.off("updated", this.updateTitle.bind(this));

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.visible != this.state.visible) {
            this.collectFocus = true;
            this.setState({visible: this.props.visible});
        }
    }

    closeChat() {
        this.props.closeWindow();
    }

    async toVideo() {
        let dat = this.props.chatClient.joinedChannels[this.props.sid];
        if (dat.attributes.breakoutRoom) {
            this.props.auth.history.push("/video/" + dat.attributes.breakoutRoom)
            return;
        }
        if (dat.channel.attributes.category == 'programItem') {
            let itemQ = new Parse.Query("ProgramItem");
            let item = await itemQ.get(dat.channel.attributes.programItemID);
            if (item.get("breakoutRoom")) {
                this.props.auth.history.push("/video/" + item.get('breakoutRoom').id)
                return;
            }
        }
        if (dat.channel.type == 'private') {
            this.setState({newVideoChatLoading: true});
            try {
                let res = await Parse.Cloud.run("chat-getBreakoutRoom", {
                    conference: this.props.auth.currentConference.id,
                    sid: this.props.sid,
                    socialSpaceID: this.props.auth.activeSpace.id
                });
                if (res.status == "error") {
                    message.error(res.message);
                    this.setState({newVideoChatLoading: false})
                } else {
                    this.setState({newVideoChatLoading: false, newVideoChatVisible: false})
                    if (res.status == "ok") {
                        this.props.auth.history.push("/video/" + res.room)
                    }
                }

            } catch (err) {
                console.log(err);
            }
        } else {
            this.props.toVideo(this.props.sid);
        }
    }

    render() {
        // if (this.state.loading)
        //     return <Spin/>
        let title = this.state.title;
        if (this.state.members) {
            title = <Tooltip mouseEnterDelay={0.5}
                             title={this.state.members}>{this.state.title} ({this.state.membersCount} members)</Tooltip>
        }
        let header = <div className="bottomChatHeader">
            <div className="bottomChatHeaderItems">
                <div className="bottomChatIdentity">{title}</div>
                <div className="bottomChatClose">
                    <Tooltip mouseEnterDelay={0.5} title="Launch a video chat room">
                        <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}
                                loading={this.state.newVideoChatLoading}
                                icon={<VideoCameraAddOutlined/>}
                                onClick={this.toVideo.bind(this)}/>
                    </Tooltip>
                    <Tooltip mouseEnterDelay={0.5} title="Add someone to this chat">
                        <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}
                                icon={<PlusOutlined/>}
                                onClick={this.props.addUser}
                        /></Tooltip>
                </div>
            </div>
        </div>
        return <>
            <ChatFrame sid={this.props.sid} visible={this.state.visible} header={header} setUnreadCount={(c) => {
                this.props.multiChatWindow.setUnreadCount(this.props.sid, c)
            }
            }/>
        </>
    }
}

const
    AuthConsumer = (props) => (
        <AuthUserContext.Consumer>
            {value => (
                <ChatChannelArea {...props} appState={value} chatClient={value.chatClient} auth={value} />
            )}
        </AuthUserContext.Consumer>

    );

export default AuthConsumer;