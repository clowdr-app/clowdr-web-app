import React, {Component} from 'react';
import Chat from 'twilio-chat';

import {Form, Input, List, Tabs} from 'antd';
import {ArrowUpOutlined, CloseOutlined} from '@ant-design/icons'
import {AuthUserContext} from "../Session";

const {TabPane} = Tabs;
const INITIAL_STATE = {
    expanded: true,
    chatLoading: true,
    token: '',
    chatReady: false,
    messages: [],
    newMessage: ''
};

class ChatContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {...INITIAL_STATE};
        this.channelName = 'general';

    }

    componentDidMount() {
        this.props.refreshUser().then(() => {
            if (this.props.user) {
                this.getToken();
            }else{
                console.log("Unable to find user id");
            }
        })
    }

    componentWillUnmount() {
        if (this.chatClient) {
            this.chatClient.shutdown();
        }
    }

    getToken = () => {
        let _this = this;
        let idToken = this.props.user.getSessionToken();
        if (idToken) {
            console.log("Got token: " + idToken + '; callback is ' + process.env.REACT_APP_TWILIO_CALLBACK_URL)
            const data = fetch(
                process.env.REACT_APP_TWILIO_CALLBACK_URL + '/chat/token'
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

    clientInitiated = () => {
        this.setState({chatReady: true}, () => {
            this.chatClient
                .getChannelByUniqueName(this.channelName)
                .then(channel => {
                    if (channel) {
                        return (this.channel = channel);
                    }
                })
                .catch(err => {
                    if (err.body.code === 50300) {
                        return this.chatClient.createChannel({
                            uniqueName: this.channelName
                        });
                    }
                })
                .then(channel => {
                    this.channel = channel;
                    window.channel = channel;
                    if (this.channel.status == "joined")
                        return Promise.resolve;
                    return this.channel.join();
                })
                .then(() => {
                    this.channel.getMessages().then(this.messagesLoaded);
                    this.channel.on('messageAdded', this.messageAdded);
                });
        });
    };

    messagesLoaded = messagePage => {
        this.setState({messages: messagePage.items, chatLoading: false});
    };

    messageAdded = message => {
        this.setState((prevState, props) => ({
            messages: [...prevState.messages, message]
        }));
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

    render() {
        var loginOrChat;
        // const messages = this.state.messages.map(message => {
        //         //     return (
        //         //         <li key={message.sid} ref={this.newMessageAdded}>
        //         //             <b>{message.author}:</b> {message.body}
        //         //         </li>
        //         //     );
        //         // });
        if (this.props.user) {
            return (
                <div>
                    <Tabs type="card" tabBarStyle={{margin: 0}}
                          activeKey="Chat">
                        <TabPane tab={<span onClick={this.onChangeTab.bind(this)}>
                            Chat {this.state.expanded ?
                            <CloseOutlined style={{verticalAlign: 'middle'}}/> :
                            <ArrowUpOutlined style={{verticalAlign: 'middle'}}/>}</span>} key="Chat" style={{
                            backgroundColor: "#FAFAFA",
                            border: "1px solid #CCCCCC"
                        }}>

                            {this.state.expanded ?
                                <div>
                                    <List loading={this.state.chatLoading} dataSource={this.state.messages} size="small"
                                          renderItem={
                                              item => (
                                                  <List.Item style={{textAlign: 'left'}} key={item.sid}>
                                                      {
                                                          item.body.startsWith("/me") ? <span style={{fontStyle:"italic"}}>
                                                              {item.author.substring(1 + item.author.indexOf(":"))} {item.body.substring(item.body.indexOf(" "))}
                                                          </span> : <span>
                                                              <b>{item.author.substring(1 + item.author.indexOf(":"))}:</b>
                                                              {item.body}
                                                          </span>
                                                      }

                                                  </List.Item>
                                              )
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
                                    <Form onFinish={this.sendMessage}>
                                        <Form.Item>
                                            <Input name={"message"} id={"message"} type="text"
                                                   placeholder={"Send a message to other attendes"}
                                                   onChange={this.onMessageChanged}
                                                   value={this.state.newMessage}/>
                                        </Form.Item>
                                        {/*<Button type="primary" htmlType="submit">Send</Button>*/}
                                    </Form>
                                </div> : <div></div>
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

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ChatContainer {...props} user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer
