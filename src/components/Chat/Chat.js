import React, {Component} from 'react';

import emoji from 'emoji-dictionary';
import 'emoji-mart/css/emoji-mart.css'


import {
    Avatar,
    Badge,
    Button,
    Card,
    Divider,
    Form,
    Input,
    Layout,
    List,
    Menu,
    Modal,
    Popconfirm,
    Popover,
    Radio,
    Spin,
    Tabs,
    Tag,
    Tooltip
} from 'antd';
import {ArrowUpOutlined, CloseOutlined, SmileOutlined, ToolOutlined, VideoCameraAddOutlined} from '@ant-design/icons'
import {AuthUserContext} from "../Session";
import Meta from "antd/lib/card/Meta";
import "./chat.css"
import ReactMarkdown from "react-markdown";
import * as ROUTES from "../../constants/routes";
import {withRouter} from "react-router";

const emojiSupport = text => text.value.replace(/:\w+:/gi, name => emoji.getUnicode(name));

const {Header, Content, Footer, Sider} = Layout;

var moment = require('moment'); // require

const {TabPane} = Tabs;
const INITIAL_STATE = {
    expanded: true,
    chatLoading: true,
    token: '',
    chatReady: false,
    messages: [],
    profiles: [],
    loadingChannels: true,
    chatHeight:"400px",
    newMessage: ''
};

class ChatContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {...INITIAL_STATE};
    }

    componentDidMount() {
        // let query = new Parse.Query("ChatRoom");
        // query.addAscending("title");
        // query.find().then(res => {
        //     this.setState({
        //         channels: res,
        //         loadingChannels: false
        //     });
        //     this.sub = this.props.parseLive.subscribe(query);
        //     this.sub.on('create', newItem => {
        //         this.setState((prevState) => ({
        //             channels: [newItem, ...prevState.channels]
        //         }))
        //     })
        //     this.sub.on('update', newItem => {
        //         this.setState((prevState) => ({
        //             channels: prevState.channels.map(obj => obj.id == newItem.id ? newItem : obj)
        //         }))
        //     })
        //     this.sub.on("delete", vid => {
        //         this.setState((prevState) => ({
        //             channels: prevState.channels.filter((v) => (
        //                 v.id != vid.id
        //             ))
        //         }));
        //     });
        // })
        this.props.auth.refreshUser(this.handleAuthChange.bind(this));
    }

    handleAuthChange(user) {
        let myName = "";
        if(user){
            myName = user.id+":"+user.get('displayName');
        }
        if (user) {
            this.setState({user: user, myName: myName});
            this.getToken(user);
        } else {
            this.setState({user:null});
            this.cleanup();
        }

    }


    componentWillUnmount() {
      this.cleanup();
    }

    messagesLoaded = (channel, messagePage) => {
        this.setState({["messages"+channel.uniqueName]: messagePage.items, chatLoading: false});
    };


    onMessageChanged = event => {
        this.setState({newMessage: event.target.value});
    };

    sendMessage = event => {
        const message = this.state.newMessage;
        this.setState({newMessage: ''});
        this.channel.sendMessage(message);
    };

    onChangeTab() {
        this.setState((prevState) => ({
            expanded: !prevState.expanded
        }));
    }

    async createNewChannel(values) {
        var _this = this;
        let newChannel = await this.chatClient.createChannel({
            uniqueName: values.title,
            attributes: {description: values.description}
        });
        let room = await newChannel.join();
        this.setState({newChannelVisible: false, activeChannel: newChannel.uniqueName});
        this.channel = newChannel;

    }
    messageAdded = (channel, message) => {
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: [...prevState["messages"+channel.uniqueName], message],
        }));
    };

    messageRemoved = (channel, message) => {
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: prevState["messages"+channel.uniqueName].filter((v)=>v.sid!=message.sid)
        }));
    };
    messageUpdated = (channel, message) => {
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: prevState["messages"+channel.uniqueName].map(m => m.sid==message.sid ? message:m)
        }));
    };


    async changeActiveChannel(channel) {
        let _this = this;
        this.channel = this.state.joinedChannels.find((item)=>(item.uniqueName == channel.uniqueName));
        if(!this.channel){
            try {
                if(channel.getChannel)
                    this.channel = await channel.getChannel();
                else
                    this.channel = channel;
                this.channel = await this.channel.join();
                //set up subscriptions
                // this.joinedChannel(this.channel);
            } catch (err) {
                //already joined
                console.log(err);
            }
        }
        else if(this.channel.getChannel){
            this.channel = await this.channel.getChannel();
        }
        window.channel = this.channel;
        this.setState({activeChannel: channel.uniqueName});
    }

    async leaveChannelClick(channel){
        let chan = channel;
        if (channel.getChannel)
            chan = await channel.getChannel();
        chan.leave().then((res) => {
        }).catch((err) => {
            console.log(err);
        })
    }

    leaveChannel(chan) {
        console.log("Removed: " + chan.sid)
        chan.removeAllListeners("messageAdded");
        chan.removeAllListeners("messageAdded");
        console.log(this.state.joinedChannels);
        this.setState((prevState) => ({
            activeChannel: 'general',
            joinedChannels: prevState.joinedChannels.filter(v => (v.sid != chan.sid))
        }));
    }

    async sendReactToMessage(message, emoji) {
        let idToken = this.state.user.getSessionToken();
        if (idToken) {
            console.log("Got token: " + idToken)
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/chat/reactTo`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        room: message.channel.sid,
                        message: message.sid,
                        reaction: emoji
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
        } else {
            console.log("Unable to get our token?");
        }

    }

    async deleteChatRoom(chan) {
        let idToken = this.state.user.getSessionToken();
        if (idToken) {
            console.log("Got token: " + idToken)
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/chat/deleteRoom`
                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        room: chan.sid
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
        } else {
            console.log("Unable to get our token?");
        }
    }
    async updateChannel(values) {
        let idToken = this.state.user.getSessionToken();
        let _this = this;
        if (idToken) {
            console.log("Got token: " + idToken)
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/chat/updateRoom`
                    ,{method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        room: this.state.editingChannel.sid,
                        newUniqueName: values.title
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(()=>{_this.setState({editChannelVisible : false})})
        } else {
            console.log("Unable to get our token?");
        }

    }

    deleteMessage(message) {
        message.remove();
    }



    groupMessages(messages) {
        let ret = [];
        let lastMessage = undefined;
        if(!messages)
            return undefined;
        let _this = this;

        for (let message of messages) {
            if (!lastMessage || message.author != lastMessage.author || moment(message.timestamp).diff(lastMessage.timestamp,'minutes') > 5) {
                if (lastMessage)
                    ret.push(lastMessage);
                let authorID = message.author.substring(0, message.author.indexOf(":"));
                if (!this.state.profiles[authorID]) {
                    this.props.auth.getUserProfile(authorID, (u) => {
                        _this.setState((prevState) => ({
                            profiles: {
                                ...prevState.profiles,
                                [u.id]: u
                            }
                        }))
                    });
                }

                lastMessage = {
                    author: message.author,
                    timestamp: message.timestamp,
                    messages: [message]
                };
            } else {
                lastMessage.messages.push(message);
            }
        }
        if (lastMessage)
            ret.push(lastMessage);
        return ret;

    }
    joinVideoRoom(chatRoom){
        console.log(chatRoom);
        let idToken = this.state.user.getSessionToken();
        let _this = this;
        if (idToken) {
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/getVideoRoomForChatRoom`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken,
                        name: chatRoom.uniqueName,
                        chatSID: chatRoom.sid,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                res.json().then((data) => {
                    _this.props.history.push(ROUTES.VIDEO_ROOM+data.roomID);

                    console.log(data.roomID);
                })
            })
        } else {
            console.log("Unable to get our token?");
        }
    }

    render() {
        var loginOrChat;
        let _this = this;
        // const messages = this.state.messages.map(message => {
        //         //     return (
        //         //         <li key={message.sid} ref={this.newMessageAdded}>
        //         //             <b>{message.author}:</b> {message.body}
        //         //         </li>
        //         //     );
        //         // });
        if (this.state.user) {
            return (
                <div>
                    <Tabs id="chatTabs" type="card" tabBarStyle={{margin: 0, maxWidth: "500px"}}
                          activeKey="Chat">
                        <TabPane tab={<span onClick={this.onChangeTab.bind(this)}>
                            Chat {this.state.expanded ?
                            <CloseOutlined style={{verticalAlign: 'middle'}}/> :
                            <ArrowUpOutlined style={{verticalAlign: 'middle'}}/>}</span>} key="Chat" style={{
                            border: "1px solid #CCCCCC"
                        }}>

                            {this.state.expanded ?
                                <Layout>
                                    <Sider style={{backgroundColor: "white"}}>
                                        <Divider style={{verticalAlign: 'middle'}}>Channels <Popover
                             mouseEnterDelay={0.5}
                                            content={<span onClick={()=>{this.setState({newChannelVisible: true})}}><a href="#">New channel</a></span>}
                                        ><ToolOutlined /></Popover></Divider>

                                        <ChannelCreateForm visible={this.state.newChannelVisible} onCancel={()=>{this.setState({'newChannelVisible': false})}}
                                        onCreate={this.createNewChannel.bind(this)} />
                                        <UpdateCreateForm visible={this.state.editChannelVisible}
                                                          onCancel={()=>{this.setState({'editChannelVisible': false})}}
                                                           onCreate={this.updateChannel.bind(this)}
                                                          values={this.state.editingChannel} />
                                        {this.state.channels ?
                                            <Menu theme="light" style={{height:"100%"}} selectedKeys={[_this.state.activeChannel]}>
                                            {
                                                this.state.channels.map(function(item){
                                                    let isJoined = false;

                                                    if(_this.state.joinedChannels)
                                                        isJoined = _this.state.joinedChannels.find((v) => (item.sid == v.sid));
                                                    return <Menu.Item key={item.uniqueName}
                                                                      onClick={_this.changeActiveChannel.bind(_this, item)}>
                                                        <Popover
                                                            placement="topRight"                              mouseEnterDelay={0.5} content={<span>
                                                             <Popconfirm
                                                                 title="Are you sure that you want to delete this chat room?"
                                                                 onConfirm={_this.deleteChatRoom.bind(_this, item)}
                                                                 okText="Yes"
                                                                 cancelText="No"
                                                             ><a href="#">Delete</a></Popconfirm> | <a href="#" onClick={()=>_this.setState({editChannelVisible: true, editingChannel: item})}>Edit</a> | {(isJoined ?
                                                            <a href="#" onClick={_this.leaveChannelClick.bind(_this, item)}>Leave</a> : "")}</span>}
                                                        >
                                                            <div style={{width: "100%", height: "100%"}}>
                                                                <div style={{clear: 'both'}}>

                                                           <span style={{float: 'left'}}>
                                                           <Badge status={isJoined ? "success" : "default"}/>
                                                               {item.uniqueName}</span>
                                                                    <div style={{float: 'right'}}>
                                                                        <Popconfirm
                                                                            title="You are about to join a video call. Are you ready?"
                                                                            onConfirm={_this.joinVideoRoom.bind(_this, item)}
                                                                            okText="Yes"
                                                                            cancelText="No"
                                                                        ><a href="#"><VideoCameraAddOutlined /></a></Popconfirm>
                                                                        <Badge
                                                                            className="chat-unread-count"
                                                           count={_this.state["unread" + item.uniqueName]}/>
                                                           </div></div>
                                                           </div></Popover>
                                                           {/*</List.Item>*/}
                                                   </Menu.Item>
                                                })
                                            }
                                        </Menu>
                                         : <Spin tip="Loading..." />}
                                    </Sider>
                                    <Layout>
                                    <Content style={{backgroundColor:"#FFFFFF", overflow:"auto"}}>
                                        {/*<Affix>*/}
                                        {/*    <Picker onSelect={this.reactTo}/>*/}
                                        {/*</Affix>*/}
                                    <List loading={this.state.chatLoading} dataSource={this.groupMessages(this.state["messages"+this.state.activeChannel])} size="small"
                                          renderItem={
                                              item => {
                                                 let isMyMessage = item.author.endsWith(this.state.myName);
                                                 let options = "";
                                                 if(isMyMessage)
                                                     options = <Popconfirm
                                                         title="Are you sure that you want to delete this message?"
                                                         onConfirm={this.deleteMessage.bind(this, item)}
                                                         okText="Yes"
                                                         cancelText="No"
                                                     ><Tooltip mouseEnterDelay={0.5} title={"Delete this message"}><a href="#"><CloseOutlined /></a></Tooltip></Popconfirm>
                                                  let authorName = item.author.substring(1+item.author.indexOf(":"));
                                                  let initials = "";
                                                  let authorID = item.author.substring(0,item.author.indexOf(":"));
                                                  let addDate = this.lastDate && this.lastDate != moment(item.timestamp).day();
                                                  this.lastDate = moment(item.timestamp).day();

                                                  authorName.split(" ").forEach((v=>initials+=v.substring(0,1)))

                                                  return (
                                                  <List.Item style={{padding: '0', width:"100%", textAlign: 'left'}} key={item.sid}>
                                                      <div style={{width: "100%"}}>
                                              {(addDate ? <Divider style={{margin: '0'}}>{moment(item.timestamp).format("LL")}</Divider>: "") }
                                              <Card bodyStyle={{padding: '10px'}} style={{border: 'none', width: "100%"}}>
                                                         <Meta avatar={ (this.state.profiles[authorID] && this.state.profiles[authorID].get("profilePhoto") ? <Avatar src={this.state.profiles[authorID].get("profilePhoto").url()}></Avatar>: <Avatar>{initials}</Avatar>)}
                                                               title={<div>{authorName}<span className="timestamp">{this.formatTime(item.timestamp)}</span><span className="user-flair-lineup">
                                                                   {
                                                                       (this.state.profiles[authorID] && this.state.profiles[authorID].get("tags") ? this.state.profiles[authorID].get("tags").map((tag)=>(
                                                                          <Tag color={tag.get("color")} key={tag.id}>{tag.get("label")}</Tag>
                                                                       )):"")
                                                                   }
                                                               </span></div>}
                                                               />
                                                               <div>
                                                                   {item.messages.map((m)=>
                                                                       this.wrapWithOptions(m,isMyMessage)
                                                                   )}
                                                               </div>
                                                      </Card></div>
                                                  </List.Item>
                                              )}
                                          }
                                          style={{
                                              height: this.state.chatHeight,
                                              display: 'flex',
                                              flexDirection: 'column-reverse',
                                              overflow: 'auto',
                                              border: '1px solid #FAFAFA'
                                          }}
                                    >
                                    </List>

                                    </Content>
                                        <Footer style={{padding: "0px 0px 0px 0px", backgroundColor: "#FFFFFF"}}>
                                            <Form onFinish={this.sendMessage}>
                                                <Form.Item>
                                                    <Input name={"message"} id={"message"} type="text"
                                                           placeholder={"Send a message to other attendes in #" + this.state.activeChannel}
                                                           autoComplete="off"
                                                           onChange={this.onMessageChanged}
                                                           value={this.state.newMessage}/>
                                                </Form.Item>
                                            </Form>
                                        </Footer>
                                    </Layout>
                                </Layout> : <div></div>
                            }

                        </TabPane>
                    </Tabs>

                </div>
            );
        }
        return (
            <div>
            </div>
        );
    }

    reactTo(event, emojji){
        console.log(event);
        console.log(emoji);
        console.log(emoji.colons);
        // console.log(more);
        // this.sendReactToMessage(message, emoji.unified);
    }
    wrapWithOptions(m, isMyMessage, data) {
        let options = [];
        let _this = this;
        options.push(<a href="#" key="react" onClick={()=>{
            _this.setState({
                reactingTo: m
            })
        }}><SmileOutlined/> </a>);

        if(isMyMessage)
            options.push( <Popconfirm
                key="delete"
                title="Are you sure that you want to delete this message?"
                onConfirm={this.deleteMessage.bind(this, m)}
                okText="Yes"
                cancelText="No"
            ><a href="#"><CloseOutlined style={{color: "red"}}/></a></Popconfirm>)
        return <Popover  key={m.sid} mouseEnterDelay={0.5} placement="topRight" content={<div style={{backgroundColor:"white"}}>
            {options}
        </div>}><div className="chatMessage"><ReactMarkdown source={m.body} renderers={{ text: emojiSupport }} /></div>
        </Popover>

    }
}

const UpdateCreateForm = ({visible, onCreate, onCancel, values}) => {
    const [form] = Form.useForm();
    if(!values)
        return <div></div>
    return (
        <Modal
            visible={visible}
            title="Update a channel"
            // okText="Create"
            footer={[
                <Button form="myForm" key="submit" type="primary" htmlType="submit">
                    Create
                </Button>
            ]}
            cancelText="Cancel"
            onCancel={onCancel}
            // onOk={() => {
            //     form
            //         .validateFields()
            //         .then(values => {
            //             form.resetFields();
            //             onCreate(values);
            //         })
            //         .catch(info => {
            //             console.log('Validate Failed:', info);
            //         });
            // }}
        >
            <Form
                form={form}
                layout="vertical"
                name="form_in_modal"
                id="myForm"
                initialValues={{
                    modifier: 'public',
                }}
                onFinish={() => {
                    form
                        .validateFields()
                        .then(values => {
                            form.resetFields();
                            onCreate(values);
                        })
                        .catch(info => {
                            console.log('Validate Failed:', info);
                        });
                }}
            >
                <Form.Item
                    name="title"
                    label="Title"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the title of the channel!',
                        },
                    ]}
                >
                    <Input defaultValue={values.uniqueName} />
                </Form.Item>
                <Form.Item name="description" label="Description (optional)">
                    <Input type="textarea"/>
                </Form.Item>
                <Form.Item name="modifier" className="collection-create-form_last-form-item">
                    <Radio.Group>
                        <Radio value="public">Public</Radio>
                        <Radio value="private">Private</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Modal>
    );
};

const ChannelCreateForm = ({visible, onCreate, onCancel}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title="Create a channel"
            // okText="Create"
            footer={[
                <Button form="myForm" key="submit" type="primary" htmlType="submit">
                    Create
                </Button>
            ]}
            cancelText="Cancel"
            onCancel={onCancel}
            // onOk={() => {
            //     form
            //         .validateFields()
            //         .then(values => {
            //             form.resetFields();
            //             onCreate(values);
            //         })
            //         .catch(info => {
            //             console.log('Validate Failed:', info);
            //         });
            // }}
        >
            <Form
                form={form}
                layout="vertical"
                name="form_in_modal"
                id="myForm"
                initialValues={{
                    modifier: 'public',
                }}
                onFinish={() => {
                    form
                        .validateFields()
                        .then(values => {
                            form.resetFields();
                            onCreate(values);
                        })
                        .catch(info => {
                            console.log('Validate Failed:', info);
                        });
                }}
            >
                <Form.Item
                    name="title"
                    label="Title"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the title of the channel!',
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item name="description" label="Description (optional)">
                    <Input type="textarea"/>
                </Form.Item>
                <Form.Item name="modifier" className="collection-create-form_last-form-item">
                    <Radio.Group>
                        <Radio value="public">Public</Radio>
                        <Radio value="private">Private</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Modal>
    );
};
const AuthConsumer = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ChatContainer {...props}  parseLive={value.parseLive} auth={value} />
                )}
            </AuthUserContext.Consumer>

);
