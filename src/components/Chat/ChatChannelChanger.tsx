import React from "react";
import {AuthUserContext} from "../Session";
import {Button, Form, Input, Menu, Modal, Switch} from "antd";
// @ts-ignore
import {ChatChannelConsumer, ClowdrAppState, MultiChatApp} from "../../ClowdrTypes";
import CollapsedChatDisplay from "./CollapsedChatDisplay";
import {Channel} from "twilio-chat/lib/channel";
import {PlusOutlined} from "@ant-design/icons"


var moment = require('moment');
var timezone = require('moment-timezone');


interface ChatChannelChangerProps {
    appState: ClowdrAppState | null;
    multiChatWindow: MultiChatApp;
}
interface PublicChannelChangerProps {
    multiChatWindow: MultiChatApp;
}

interface ChatChannelChangerState {
    loading: boolean,
    joinedChannels: string[], //list of sid's
    allChannels: Channel[], //list of sid's
    newChannelVisible: boolean,
    editChannelVisible: boolean
}

class ChatChannelChanger extends React.Component<ChatChannelChangerProps, ChatChannelChangerState> implements ChatChannelConsumer {
    constructor(props: ChatChannelChangerProps) {
        super(props);
        this.state = {
            loading: true,
            joinedChannels: [],
            allChannels: [],
            newChannelVisible: false,
            editChannelVisible: false
        };
    }

    setJoinedChannels(channels: string[]){
        this.setState({joinedChannels: channels, loading: false});
    }
    setAllChannels(channels: Channel[]){
        this.setState({allChannels: channels});
    }
    componentDidMount(): void {
        // this.props.appState?.chatClient.initMultiChatWindow(this);
        this.props.multiChatWindow.registerChannelConsumer(this);
    }
    async createChannel(title: string, description: string, autoJoin: boolean) : Promise<Channel>{
        let twilio = this.props.appState?.chatClient.twilio;
        if(!twilio)
            throw "Not connected to twilio";
        let attributes = {
            description: description,
            category: 'public-global',
            isAutoJoin: autoJoin ? "true":"false",
            mode: 'group',
            type: 'public'
        };
        return await twilio.createChannel({
            friendlyName: title,
            isPrivate: false,
            attributes: attributes
        });
    }
    async createNewChannel(values: any) {
        var _this = this;
        let newChannel = await this.createChannel(
            values.title,
            values.description,
            values.autoJoin
        );
        let room = await newChannel.join();
        this.setState({newChannelVisible: false});
        this.props.appState?.chatClient.openChat(newChannel.sid, false);

    }

    render() {
        // if (this.state.loading)
        //     return <Spin/>
        let addChannelButton = <></>
        if(this.props.appState?.permissions.includes("moderator"))
            addChannelButton = <Button size="small"
                                       onClick={()=>{this.setState({newChannelVisible: true})}
                                       } type="primary"
                                       shape="circle" icon={
                <PlusOutlined/>}/>

        return <div id="channelChanger">
            <ChannelCreateForm visible={this.state.newChannelVisible} onCancel={()=>{this.setState({'newChannelVisible': false})}}
                               onCreate={this.createNewChannel.bind(this)} />
            {/*<UpdateCreateForm visible={this.state.editChannelVisible}*/}
            {/*                  onCancel={()=>{this.setState({'editChannelVisible': false})}}*/}
            {/*                  onCreate={this.updateChannel.bind(this)}*/}
            {/*                  values={this.state.editingChannel} />*/}
            <Menu mode="inline"
                  className="activeRoomsList"
                // style={{height: "calc(100vh - "+ topHeight+ "px)", overflowY:"auto", overflowX:"visible"}}
                  style={{
                      // height: "100%",
                      // overflow: 'auto',
                      // display: 'flex',
                      // flexDirection: 'column-reverse',
                      border: '1px solid #FAFAFA'

                  }}
                  inlineIndent={0}

                  onSelect={(selected)=>{
                      if(selected.key) {
                          this.props.appState?.chatClient.openChat(selected.key, false);
                      }
                  }}
                  // selectedKeys={selectedKeys}
                  defaultOpenKeys={['joinedChannels','otherPublicChannels']}
                  forceSubMenuRender={true}
            >
                    <Menu.SubMenu key="joinedChannels" title="Your Channels">

                        {this.state.joinedChannels.filter(sid=>{
                            // @ts-ignore
                            let chan = this.props.appState?.chatClient.joinedChannels[sid];
                            if(chan){
                                if(chan.attributes && chan.attributes.category != 'socialSpace')
                                    return true;
                            }
                            return false;
                        }).map((chan) => {
                            let className = "personHoverable";
                            // if (this.state.filteredUser == user.id)
                            //     className += " personFiltered"
                            return <Menu.Item key={chan} className={className}>
                                <CollapsedChatDisplay sid={chan}  />

                                {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                            </Menu.Item>
                        })
                        }
                    </Menu.SubMenu>

                <Menu.SubMenu key="otherPublicChannels" title={<span>Other Channels{addChannelButton}</span>}>

                    {this.state.allChannels.filter(chan => chan && chan.sid && !this.state.joinedChannels.includes(chan.sid)).map((chan) => {
                        let className = "personHoverable";
                        // if (this.state.filteredUser == user.id)
                        //     className += " personFiltered"
                        return <Menu.Item key={chan.sid} className={className}>
                            <CollapsedChatDisplay sid={chan.sid} channel={chan} />

                            {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                        </Menu.Item>
                    })
                    }
                </Menu.SubMenu>
            </Menu>
        </div>
    }
}
// @ts-ignore
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
                <Form.Item name="auto-join" className="collection-create-form_last-form-item" label="Automatically join all users to this room">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// @ts-ignore
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
                <Form.Item name="autoJoin" className="collection-create-form_last-form-item" label="Automatically join all users to this room" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
};
const
    AuthConsumer = (props: PublicChannelChangerProps) => (
        <AuthUserContext.Consumer>
            {value => (
    <ChatChannelChanger {...props} appState={value}/>
)}
</AuthUserContext.Consumer>

);

export default AuthConsumer;