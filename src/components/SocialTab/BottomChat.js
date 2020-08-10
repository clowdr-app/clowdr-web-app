import React from "react";
import {AuthUserContext} from "../Session";
import {Badge, Button, Form, Input, message, Modal, Select, Skeleton, Tooltip} from "antd"
import ChatFrame from "../Chat/ChatFrame";
import MultiChatWindow from "../Chat/MultiChatWindow"
import {CloseOutlined, MinusOutlined, PlusOutlined, VideoCameraAddOutlined} from "@ant-design/icons"
import Parse from "parse";

class BottomChat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chats: [],
        };
        this.form = React.createRef();

        this.channelSubscriptions = {};
        this.memberListener = {};
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
        // this.setState({title: this.getChatTitle(this.props.chatClient.joinedChannels[sid])})
        if(this.memberListener[sid]){
            this.memberListener[sid](this.props.auth.chatClient.joinedChannels[sid]);
        }
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

    async handleSearch(value){
        if (!this.triggeredUserLoad) {
            this.setState({loading: true})
            this.triggeredUserLoad = true;
            let users = await this.props.auth.helpers.getUsers();
            const options = Object.keys(users).map(d => {
                if(!users[d].get('displayName'))
                    return {
                        label: "undefined",
                        value: users[d].id
                    }
                return {
                    label: users[d].get("displayName"), value:
                    users[d].id
                };
            });
            this.setState({loading: false, userOptions: options});
        }
    }
    addUser(sid) {
        this.setState({
            addUserVisible: true,
            addUserLoading: false,
            addUserToSID: sid,
            addUserNeedsChatTitle: this.props.auth.chatClient.joinedChannels[sid].attributes.mode == "directMessage"
        })
    }

    handleCancel = () => {
        if (this.form && this.form.current)
            this.form.current.resetFields();
        this.setState({
            addUserVisible: false,
            adduserLoading: false,
            addUserNeedsChatTitle: false
        });

    };
    handleVideoCancel = () => {
        if (this.form && this.form.current)
            this.form.current.resetFields();
        this.setState({
            newVideoChatVisible: false,
            newVideoChatLoading: false,
        });

    };

    async toVideo(sid){
        this.setState({
            newVideoChatVisible: true,
            newVideoChatLoading: false,
            toVideoSID: sid,
        })
    }
    render() {
        if (this.state.user && !this.state.chatDisabled) {

            let setChatTitle;
            if(this.state.addUserNeedsChatTitle){
                setChatTitle =  <Form.Item
                    name="title"
                    label="Chat title"
                    extra="Please choose a name for this new group chat. Once you name the chat, it can't be changed."
                    rules={[
                        {
                            required: true,
                            message: 'Please input the title for your chat.',
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>
            }
            return (
                <><MultiChatWindow                                            parentRef={this}
                                                                              addUser={this.addUser.bind(this)}
                                                                              toVideo={this.toVideo.bind(this)}
                                                                              closeWindow={(sid) => this.removeChannel(sid)}
                />
                <div id="bottom-chat-container" style={this.props.style}>
                    <Modal
                        zIndex="200"
                        title="Add a User to this Chat"
                        visible={this.state.addUserVisible}
                        confirmLoading={this.state.addUserLoading}
                        footer={[
                            <Button form="addUserForm" key="submit" type="primary" htmlType="submit" loading={this.state.addUserLoading}>Add</Button>
                        ]}
                        onCancel={this.handleCancel}
                    >

                        <Form
                            layout="vertical"
                            name="form_in_modal"
                            ref={this.form}

                            id="addUserForm"
                            initialValues={{
                                title: this.props.initialName,
                            }}
                            onFinish={async (values) => {
                                this.setState({addUserLoading: true});
                                try{
                                    let res = await Parse.Cloud.run("chat-addToSID", {
                                        conference: this.props.auth.currentConference.id,
                                        sid: this.state.addUserToSID,
                                        title: values.title,
                                        users: values.users
                                    });
                                }catch(err){
                                    console.log(err);
                                }

                                this.form.current.resetFields();
                                this.setState({addUserLoading: false, addUserVisible: false})
                            }}
                        >
                            {setChatTitle}
                            <Form.Item name="users"
                                       className="aclSelector"
                                       extra="This chat window will immediately show up for any user you select here, and they will have access to the complete chat history">
                                <Select
                                    loading={this.state.loading}
                                    mode="multiple" style={{width: '100%'}} placeholder="Users"
                                    onSearch={this.handleSearch.bind(this)}
                                    filterOption={(input,option)=>option.label.toLowerCase().includes(input.toLowerCase())}
                                    options={this.state.userOptions}
                                >
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                    <Modal
                        zIndex="200"
                        title="Create a new Video Chat"
                        visible={this.state.newVideoChatVisible}
                        confirmLoading={this.state.newVideoChatLoading}
                        footer={[
                            <Button form="breakoutFromChatForm" key="submit" type="primary" htmlType="submit" loading={this.state.newVideoChatLoading}>Add</Button>
                        ]}
                        onCancel={this.handleVideoCancel}
                    >

                        <Form
                            layout="vertical"
                            name="form_in_modal"
                            ref={this.form}

                            id="breakoutFromChatForm"
                            initialValues={{
                                title: this.props.initialName,
                            }}
                            onFinish={async (values) => {
                                this.setState({newVideoChatLoading: true});
                                try{
                                    let res = await Parse.Cloud.run("chat-getBreakoutRoom", {
                                        conference: this.props.auth.currentConference.id,
                                        sid: this.state.toVideoSID,
                                        title: values.title,
                                        socialSpaceID: this.props.auth.activeSpace.id
                                    });
                                    if (res.status == "error") {
                                        message.error(res.message);
                                        this.setState({newVideoChatLoading: false})
                                    } else {
                                        this.form.current.resetFields();
                                        this.setState({newVideoChatLoading: false, newVideoChatVisible: false})
                                        if (res.status == "ok") {
                                            this.props.auth.history.push("/video/" + this.props.auth.currentConference.get("conferenceName") + "/" + values.title)
                                        }
                                    }

                                    }catch(err){
                                    console.log(err);
                                }

                            }}
                        >
                            <Form.Item
                                name="title"
                                label="Video room title"
                                extra="Shown in the sidebar"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input the title for your video room.',
                                    },
                                    ({ getFieldValue }) => ({
                                        validator(rule, value) {
                                            if (!value || !value.includes("/")) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject('Room title cannot include /');
                                        },
                                    }),
                                ]}
                            >
                                <Input/>
                            </Form.Item>
                        </Form>
                    </Modal>
                </div>
                    </>
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
            if(profileID == this.props.auth.userProfile.id)
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
                title = chat.channel.sid;
            }
            try{
                let profiles = await this.props.auth.helpers.getUserProfilesFromUserProfileIDs(chat.members);
                if(profiles.length != chat.members.length){
                    console.log(chat.members)
                    console.log(profiles)
                    throw "didn't get back all profiles";
                }
                let membersStr = "In this chat: " + profiles.map(p => p.get("displayName")).join(', ');
                this.setState({members: membersStr, title: title, membersCount: chat.members.length});
            }
            catch(err){
                console.log(chat.channel.sid)
                console.log(err);
                return;
            }
            return;
        }

    }

    updateTitle(update) {

        if (this.mounted) {
            if(update.channel && update.channel.attributes && update.updateReasons && update.updateReasons.length > 1){
                this.props.chatClient.joinedChannels[this.props.sid].channel = update.channel;
                this.props.chatClient.joinedChannels[this.props.sid].attributes = update.channel.attributes;
            }
            this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        }
    }
    async componentDidMount() {
        this.mounted= true;
        if(!this.state.chat){
            let res = await this.props.chatClient.getJoinedChannel(this.props.sid);
            this.setState({chat: this.props.chatClient.joinedChannels[this.props.sid]})
        }
        this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        this.parentRef.memberListener[this.props.sid] = async (channelInfo)=>{
            await this.getChatTitle(this.props.chatClient.joinedChannels[this.props.sid]);
        };
        this.props.chatClient.joinedChannels[this.props.sid].channel.on("updated",this.updateTitle.bind(this));
    }
    componentWillUnmount() {
        this.mounted = false;
        this.parentRef.memberListener[this.props.sid] = null;
        if(this.props.chatClient.joinedChannels[this.props.sid])
            this.props.chatClient.joinedChannels[this.props.sid].channel.off("updated",this.updateTitle.bind(this));

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.open != this.state.open){
            this.collectFocus = true;
            this.setState({open: this.props.open});
        }
    }

    closeChat(){
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
            if(item.get("breakoutRoom")){
                this.props.auth.history.push("/video/" + item.get('breakoutRoom').id)
                return;
            }
        }
        if (dat.channel.type == 'private' ) {
            this.setState({newVideoChatLoading: true});
            try{
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

            }catch(err){
                console.log(err);
            }
        }
        else{
            this.props.toVideo();
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

        let title = this.state.title;
        if(this.state.members){
            title = <Tooltip mouseEnterDelay={0.5} title={this.state.members}>{this.state.title} ({this.state.membersCount} members)</Tooltip>
        }
        let header = <div className="bottomChatHeader">
            <div className="bottomChatHeaderItems">
            <div className="bottomChatIdentity">{title}</div>
            <div className="bottomChatClose">
                <Tooltip mouseEnterDelay={0.5} title="Launch a video chat room">
                    <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}
                            loading={this.state.newVideoChatLoading}
                            icon={<VideoCameraAddOutlined />}
                            onClick={this.toVideo.bind(this)} />
                </Tooltip>
                <Tooltip mouseEnterDelay={0.5} title="Add someone to this chat">
                    <Button size="small" type="primary" shape="circle" style={{minWidth: "initial"}}  icon={<PlusOutlined />}
                                                              onClick={this.props.addUser}
                /></Tooltip>
                <Tooltip mouseEnterDelay={0.5} title="Close this chat"><Button size="small" type="primary" shape="circle"
                                                              style={{minWidth: "initial"}}  icon={<CloseOutlined />}
            onClick={
                this.closeChat.bind(this)
            }
            /></Tooltip>
                <Tooltip mouseEnterDelay={0.5} title="Minimize this window"><Button size="small" type="primary" shape="circle"
                                                              style={{minWidth: "initial"}}  icon={<MinusOutlined />}
                                                              onClick={
                                                                  this.props.toggleOpen
                                                              }
                /></Tooltip>
            </div>
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
            <Tooltip mouseEnterDelay={0.5} title={"Chat window for " + this.state.title}><Button type="primary" className={buttonClass} onClick={this.props.toggleOpen}><Badge count={this.state.unreadCount} overflowCount={9} offset={[-5,-10]}/>{this.state.title}</Button></Tooltip>{chatWindow}</div>
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
