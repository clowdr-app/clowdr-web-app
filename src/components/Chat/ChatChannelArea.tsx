import React from "react";
import { AuthUserContext } from "../Session";
import Parse from "parse"
import { Button, message, Skeleton, Tooltip } from "antd";
import ChatFrame from "./ChatFrame"
import { PlusOutlined, VideoCameraAddOutlined } from "@ant-design/icons"
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import ProgramItemDisplay from "../Program/ProgramItemDisplay";
import { ChannelInfo } from "../../classes/ChatClient"
import { intersperse } from "../../Util";
import { RouteComponentProps, withRouter } from "react-router";
import { ClowdrState } from "../../ClowdrTypes";
import assert from "assert";

interface ChatChannelAreaProps extends RouteComponentProps {
    sid: string;
    parentRef: any;
    visible: boolean;
    toVideo: (sid: string) => void;
    setUnreadCount: (sid: string, count: number) => void;
    addUser: () => void;
}

interface _ChatChannelAreaProps extends ChatChannelAreaProps {
    appState: ClowdrState;
}

interface ChatChannelAreaState {
    sid: string;
    chat: ChannelInfo | null;
    unreadCount: number;
    visible: boolean;
    title: JSX.Element;
    members: string;
    membersCount: number;
    newVideoChatLoading: boolean;
    newVideoChatVisible: boolean;
}

class ChatChannelArea extends React.Component<_ChatChannelAreaProps, ChatChannelAreaState> {
    parentRef: any;
    mounted: boolean = false;
    collectFocus: boolean = false;

    constructor(props: _ChatChannelAreaProps) {
        super(props);
        this.state = {
            sid: this.props.sid,
            unreadCount: 0,
            chat: this.props.appState.chatClient.joinedChannels[this.props.sid],
            visible: this.props.visible,
            title: <></>,
            members: "",
            membersCount: 0,
            newVideoChatLoading: false,
            newVideoChatVisible: false,
        };
        this.parentRef = this.props.parentRef;
    }

    async getChatTitle(chat: ChannelInfo) {
        if (!chat) {
            this.setState({
                title:
                    <Skeleton.Input active style={{ width: '20px', height: '1em' }} />
            })
            return;
        }
        if (chat.attributes.mode === "directMessage" && chat.conversation) {
            let p1 = chat.conversation.get("member1");
            let p2 = chat.conversation.get("member2");
            let profileID = p1.id;
            assert(this.props.appState.userProfile, "userProfile is null");
            if (profileID === this.props.appState.userProfile.id)
                profileID = p2.id;
            this.setState({
                title: <UserStatusDisplay profileID={profileID} hideLink={true} />
            })
            return;
        } else {
            let title = <>{chat.channel.friendlyName}</>;
            if (chat.attributes.category === "announcements-global") {
                title = <>Announcements</>;
            } else if (chat.attributes.category === "programItem" && chat.attributes.programItemID) {
                // console.log(chat.attributes.programItemID)
                title = <ProgramItemDisplay auth={this.props.appState} id={chat.attributes.programItemID} />
            } else if (chat.attributes.category === "breakoutRoom" || chat.attributes.mode === "group") {
                title = <>{chat.channel.friendlyName}</>;
            } else {
                title = <>{chat.channel.friendlyName}</>;
            }
            try {
                let members = intersperse(chat.members, ", ");
                let membersStr = "In this chat: " + members.reduce((a, s) => a + s);
                this.setState({ members: membersStr, title: title, membersCount: chat.members.length });
            } catch (err) {
                console.log(chat.channel.sid)
                console.error(err);
                return;
            }
            return;
        }

    }

    updateTitle(update: any) { // TODO: fix any
        if (this.mounted) {
            if (update.channel && update.channel.attributes && update.updateReasons && update.updateReasons.length > 1) {
                this.props.appState.chatClient.joinedChannels[this.props.sid].channel = update.channel;
                this.props.appState.chatClient.joinedChannels[this.props.sid].attributes = update.channel.attributes;
            }
            this.getChatTitle(this.props.appState.chatClient.joinedChannels[this.props.sid]);
        }
    }

    async componentDidMount() {
        this.mounted = true;
        if (!this.state.chat) {
            await this.props.appState.chatClient.getJoinedChannel(this.props.sid);
            this.setState({ chat: this.props.appState.chatClient.joinedChannels[this.props.sid] })
        }
        this.getChatTitle(this.props.appState.chatClient.joinedChannels[this.props.sid]);
        this.parentRef.memberListener[this.props.sid] = async (channelInfo: ChannelInfo) => {
            await this.getChatTitle(this.props.appState.chatClient.joinedChannels[this.props.sid]);
        };
        this.props.appState.chatClient.joinedChannels[this.props.sid].channel.on("updated", this.updateTitle.bind(this));
    }

    componentWillUnmount() {
        this.mounted = false;
        this.parentRef.memberListener[this.props.sid] = null;
        if (this.props.appState.chatClient.joinedChannels[this.props.sid])
            this.props.appState.chatClient.joinedChannels[this.props.sid].channel.off("updated", this.updateTitle.bind(this));

    }

    componentDidUpdate() {
        if (this.props.visible !== this.state.visible) {
            this.collectFocus = true;
            this.setState({ visible: this.props.visible });
        }
    }

    async toVideo() {
        let dat = this.props.appState.chatClient.joinedChannels[this.props.sid];
        if (dat.attributes.breakoutRoom) {
            this.props.history.push("/video/" + dat.attributes.breakoutRoom)
            return;
        }
        if (dat.attributes.category === 'programItem') {
            let itemQ = new Parse.Query("ProgramItem");
            let item = await itemQ.get(dat.attributes.programItemID || "");
            if (item.get("breakoutRoom")) {
                this.props.history.push("/video/" + item.get('breakoutRoom').id)
                return;
            }
        }
        if (dat.channel.type === 'private') {
            this.setState({ newVideoChatLoading: true });
            try {
                assert(this.props.appState.currentConference, "Current conference is null");
                let res = await Parse.Cloud.run("chat-getBreakoutRoom", {
                    conference: this.props.appState.currentConference.id,
                    sid: this.props.sid,
                    socialSpaceID: this.props.appState.activeSpace.id
                });
                if (res.status === "error") {
                    message.error(res.message);
                    this.setState({ newVideoChatLoading: false })
                } else {
                    this.setState({ newVideoChatLoading: false, newVideoChatVisible: false })
                    if (res.status === "ok") {
                        this.props.history.push("/video/" + res.room)
                    }
                }

            } catch (err) {
                console.error(err);
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
            title = <Tooltip
                mouseEnterDelay={0.5}
                overlayStyle={{ zIndex: 10 }}
                title={this.state.members}>
                <>{this.state.title} ({this.state.membersCount} members)</>
            </Tooltip>
        }
        let header = <div className="bottomChatHeader">
            <div className="bottomChatHeaderItems">
                <div className="bottomChatIdentity">{title}</div>
                <div className="bottomChatClose">
                    <Tooltip mouseEnterDelay={0.5} title="Launch a video chat room">
                        <Button size="small" type="text"
                            style={{ minWidth: "initial" }}
                            loading={this.state.newVideoChatLoading}
                            icon={<VideoCameraAddOutlined />}
                            onClick={this.toVideo.bind(this)}>Launch video</Button>
                    </Tooltip>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Tooltip mouseEnterDelay={0.5} title="Add someone to this channel">
                        <Button size="small" type="text" style={{ minWidth: "initial" }}
                            icon={<PlusOutlined />}
                            onClick={this.props.addUser}
                        >Add people</Button></Tooltip>
                </div>
            </div>
        </div>
        // @ts-ignore
        return <ChatFrame sid={this.props.sid}
            visible={this.state.visible}
            header={header}
            setUnreadCount={(c: number) => this.props.setUnreadCount(this.props.sid, c)}
        />;
    }
}

const
    AuthConsumer = withRouter((props: ChatChannelAreaProps) => (
        <AuthUserContext.Consumer>
            {value => (value == null ? <span>TODO: ChatChannelAreaProps when clowdrState is null.</span> :
                <ChatChannelArea {...props} appState={value} />
            )}
        </AuthUserContext.Consumer>
    ));

export default AuthConsumer;
