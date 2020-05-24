import React, {Component} from 'react';
import Chat from 'twilio-chat';

import {Badge, Button, Form, Input, Layout, List, Modal, Popconfirm, Radio, Tabs} from 'antd';
import {ArrowUpOutlined, CloseOutlined, PlusOutlined} from '@ant-design/icons'
import {AuthUserContext} from "../Session";
import ParseLiveContext from "../parse/context";

const {Header, Content, Footer, Sider} = Layout;

const {TabPane} = Tabs;
const INITIAL_STATE = {
    expanded: true,
    chatLoading: true,
    token: '',
    chatReady: false,
    messages: [],
    loadingChannels: true,
    newMessage: ''
};

class ChatContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {...INITIAL_STATE};
        this.channelName = 'general';
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
        console.log("calling refresh");
        this.props.refreshUser(this.handleAuthChange.bind(this)).then(this.handleAuthChange.bind(this));
    }

    handleAuthChange(user) {
        let myName = "";
        if(user){
            myName = user.id+":"+user.get('displayname');
        }
        this.setState({user: user, myName: myName});
        if (user) {
            this.getToken(user);
        } else {
            console.log("Unable to find user id");
        }

    }

    componentWillUnmount() {
        if (this.chatClient) {
            this.chatClient.shutdown();
        }
        if(this.sub) {
            this.sub.unsubscribe();
        }
    }

    getToken = (user) => {
        let _this = this;
        let idToken = user.getSessionToken();
        if (idToken) {
            console.log("Got token: " + idToken)
            const data = fetch(
                'https://a9ffd588.ngrok.io/chat/token'
                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        identity: idToken
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                res.json().then((data) => {
                    _this.setState(
                        {
                            token: data.token
                        }, _this.initChat.bind(_this)
                    )
                })
            });
        } else {
            console.log("Unable to get our token?");
        }


    };

    initChat = () => {
        this.chatClient = new Chat(this.state.token);
        this.chatClient.initialize().then(this.clientInitiated.bind(this));
    };

    clientInitiated = async () => {
        console.log("Setting up")
        let _this = this;
        await this.setState({chatReady: true});
        let channelDescriptors = await this.chatClient.getPublicChannelDescriptors();
        this.setState({loadingChannels: false,
                    channels: channelDescriptors.items});
        this.channelName ="general";
        if(this.state.user.get("lastChatChannel"))
            this.channelName = this.state.user.get("lastChatChannel");
        //Find any channels that we are part of and join them
        let joinedChannelDescritporPaginator = await this.chatClient.getUserChannelDescriptors();
        console.log("Joined: ");
        console.log(joinedChannelDescritporPaginator.items);
        _this.setState({
            joinedChannels: joinedChannelDescritporPaginator.items,
            activeChannel: this.channelName
        });
        if (joinedChannelDescritporPaginator.items.length == 0) {
            //force join general
            let generalRoom = await this.chatClient.getChannelByUniqueName("general");
            let room = await generalRoom.join();
            joinedChannelDescritporPaginator = await this.chatClient.getUserChannelDescriptors();
        }
        for (const channelDescriptor of joinedChannelDescritporPaginator.items) {
            let channel = await channelDescriptor.getChannel();
            if(channel.uniqueName == this.channelName){
                this.channel = channel;
            }
            console.log("Joining:");
            console.log(channel);
            this.joinedChannel(channel);
        }
        //set up  listeners for channel changes
        this.chatClient.on("channelAdded", (channel)=>{
            console.log("Channel added: " + channel);
            console.log(channel);
            _this.setState(
                (prevState)=>({
                    channels: [...prevState.channels.filter((v)=>(
                        v.sid != channel.sid
                    )), channel]
                })
            )
        });
        this.chatClient.on("channelRemoved", (channel)=>{
            console.log("channel removed " + channel);
            _this.setState(
                (prevState)=>({
                    channels: prevState.channels.filter((v) => (
                        v.sid != channel.sid
                    ))
                })
            )
        });

        console.log("listeners installed");
        this.chatClient.on("channelJoined", (channel)=>{
            _this.joinedChannel(channel);
        });
        this.chatClient.on("channelLeft", (channel)=>{
            _this.leaveChannel(channel);
        });
    };

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
    createNewChannel(values){
        var _this = this;
        console.log(values);
        this.channelName = values.title;
    }
    messageAdded = (channel, message) => {
        let unreadCount = 0;
        if(channel.uniqueName != this.state.activeChannel){
            //Background
            unreadCount++;
        }
        console.log(unreadCount);
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: [...prevState["messages"+channel.uniqueName], message],
            ["unread"+channel.uniqueName]: (prevState['unread'+channel.uniqueName] ? prevState['unread'+channel.uniqueName]+unreadCount : unreadCount)
        }));
    };

    messageRemoved = (channel, message) => {
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: prevState["messages"+channel.uniqueName].filter((v)=>v.sid!=message.sid)
        }));
    };
    messageUpdated = (channel, message) => {
        let unreadCount = 0;
        this.setState((prevState, props) => ({
            ["messages"+channel.uniqueName]: prevState["messages"+channel.uniqueName].map(m => m.sid==message.sid ? message:m)
        }));
    };

    joinedChannel(channel){
        //set up listeners
        //push to
        console.log("Subscribed to: ")
        console.log(channel)
        this.setState((prevState) => ({
            joinedChannels: [... prevState.joinedChannels, channel]
        }));
        channel.getMessages().then(this.messagesLoaded.bind(this,channel));
        channel.on('messageAdded', this.messageAdded.bind(this,channel));
        channel.on("messageRemoved", this.messageRemoved.bind(this,channel));
        channel.on("messageUpdated", this.messageUpdated.bind(this,channel));
        // channel.on("typingStarted", this.typingStarted.bind(this,channel));
        // channel.on("typingEnded", this.typingEnded.bind(this,channel));
    }
    async changeActiveChannel(channel) {
        let _this = this;
        this.channelName = channel.uniqueName;
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
        window.channel = this.channel;
        this.setState({activeChannel: channel.uniqueName});
    }

    async leaveChannelClick(channel){
        console.log(channel);
        console.log("Trying to leave " +channel);
        let chan = channel;
        if (channel.getChannel)
            chan = await channel.getChannel();
        console.log(chan);
        chan.leave().then((res) => {
            console.log("Left " + res);
            console.log(res);
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
            joinedChannels: prevState.joinedChannels.filter(v => (v.sid != chan.sid))
        }));
    }

    deleteMessage(message) {
        message.remove();
    }
    render() {
        var loginOrChat;
        const selectedChannelStyle = {backgroundColor: "#0095dd", width: "100%"};
        const joinedChannelStyle = {fontWeight: "bolder", width: "100%"};
        const nonJoinedChannelStyle = {color: "#121212", width: "100%"};
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
                    <Tabs type="card" tabBarStyle={{margin: 0}}
                          activeKey="Chat">
                        <TabPane tab={<span onClick={this.onChangeTab.bind(this)}>
                            Chat {this.state.expanded ?
                            <CloseOutlined style={{verticalAlign: 'middle'}}/> :
                            <ArrowUpOutlined style={{verticalAlign: 'middle'}}/>}</span>} key="Chat" style={{
                            backgroundColor: "#FAFAFA",
                            overflow: 'auto',
                            border: "1px solid #CCCCCC"
                        }}>

                            {this.state.expanded ?
                                <Layout>
                                    <Layout>
                                    <Sider style={{backgroundColor: "#CCCCCC"}}>
                                        <ChannelCreateForm visible={this.state.newChannelVisible} onCancel={()=>{this.setState({'newChannelVisible': false})}}
                                        onCreate={this.createNewChannel.bind(this)} />
                                        <List header={<div style={{clear: 'both', verticalAlign: 'middle', padding: "5px"}}>
                                            <span style={{float:'left', fontWeight:"bold"}}>Channels</span>
                                            <PlusOutlined
                                                onClick={()=>{this.setState({'newChannelVisible': true})}}
                                                style={{float: "right"}}/></div>}
                                              loading={this.state.loadingChannels}
                                              style={{backgroundColor:"#EFEFEF",
                                                  height: "100%",
                                              border: "1px solid #666666"}}
                                        dataSource={this.state.channels} size="small"
                                        renderItem={
                                            item =>{
                                                let isJoined = false;
                                                if(this.state.joinedChannels)
                                                    isJoined = this.state.joinedChannels.find((v)=>(item.sid==v.sid));
                                                return (
                                                <List.Item style={(item.uniqueName == this.state.activeChannel ?
                                                        selectedChannelStyle :
                                                        (isJoined ? joinedChannelStyle : nonJoinedChannelStyle)
                                                )} key={item.sid} >
                                                    <div style={{clear: 'both'}}>

                                                        <span style={{float: 'left'}} onClick={this.changeActiveChannel.bind(this, item)}>
                                                                <Badge status={isJoined? "success":"default"} />
                                                            {item.uniqueName}</span>
                                                        <div style={{float: 'right'}}>
                                                            {isJoined ? <CloseOutlined onClick={this.leaveChannelClick.bind(this,item)} />: ""}
                                                            <Badge
                                                                count={this.state["unread" + item.uniqueName]}/>
                                                        </div>
                                                    </div>
                                                </List.Item>
                                            )}
                                        }/>
                                    </Sider>
                                    <Content>
                                    <List loading={this.state.chatLoading} dataSource={this.state["messages"+this.state.activeChannel]} size="small"
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
                                                     ><a href="#"><CloseOutlined /></a></Popconfirm>
                                                  return (
                                                  <List.Item style={{width:"100%", textAlign: 'left'}} key={item.sid}>
                                                      <div style={{width:"100%", clear: 'both'}}>
                                                      <div style={{float: 'left' }}>{
                                                          item.body.startsWith("/me") ? <span style={{fontStyle:"italic"}}>
                                                              {item.author.substring(1 + item.author.indexOf(":"))} {item.body.substring(item.body.indexOf(" "))}
                                                          </span> : <span>
                                                              <b>{item.author.substring(1 + item.author.indexOf(":"))}:</b>
                                                              {item.body}
                                                          </span>
                                                      }</div>
                                                          <div style={{float:'right'}}>{options}</div>
                                                      </div>
                                                  </List.Item>
                                              )}
                                          }
                                          style={{
                                              height: "400px",
                                              display: 'flex',
                                              flexDirection: 'column-reverse',
                                              overflow: 'auto',
                                              border: '1px solid #FAFAFA'
                                          }}
                                    >
                                    </List>
                                    </Content></Layout>
                                    <Footer>
                                        <Form onFinish={this.sendMessage}>
                                            <Form.Item>
                                                <Input name={"message"} id={"message"} type="text"
                                                       placeholder={"Send a message to other attendes in #"+this.channelName}
                                                       onChange={this.onMessageChanged}
                                                       value={this.state.newMessage}/>
                                            </Form.Item>
                                            {/*<Button type="primary" htmlType="submit">Send</Button>*/}
                                        </Form>
                                    </Footer>
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
}

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
    <ParseLiveContext.Consumer>
        {parseLive => (
            <AuthUserContext.Consumer>
                {value => (
                    <ChatContainer {...props}  parseLive={parseLive} auth={value} user={value.user} refreshUser={value.refreshUser}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ParseLiveContext.Consumer>

);

export default AuthConsumer
