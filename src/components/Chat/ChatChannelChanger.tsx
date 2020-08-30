import React, { ReactNode } from "react";
import { AuthUserContext } from "../Session";
import { Button, Form, Input, Menu, message, Modal, Select, Spin, Switch } from "antd";
import { ChatChannelConsumer, ClowdrState, MultiChatApp } from "../../ClowdrTypes";
import CollapsedChatDisplay from "./CollapsedChatDisplay";
import { Channel } from "twilio-chat/lib/channel";
import ProgramItem from "../../classes/ProgramItem";
import UserProfile from "../../classes/UserProfile";
import Parse from "parse";
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import ProgramItemDisplay from "../Program/ProgramItemDisplay";
import { PromiseInjectNull } from "../../Util";

interface ChatChannelChangerProps {
    appState: ClowdrState;
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
    ProgramItems: ProgramItem[],
    UserProfiles: UserProfile[],
    filter?: string,
    searchLoading: boolean,
    openingChat: boolean,
    searchOptions: { label: string | ReactNode, value: string, object: ProgramItem | UserProfile | Channel, labeltext: string }[]
}

class ChatChannelChanger extends React.Component<ChatChannelChangerProps, ChatChannelChangerState> implements ChatChannelConsumer {
    private fetchingSearchOptions: boolean;
    private haveProgram: boolean;
    private searchBox: React.RefObject<Select>;
    private allSearchOptions: { label: string | ReactNode, value: string, object: ProgramItem | UserProfile | Channel, labeltext: string }[];
    constructor(props: ChatChannelChangerProps) {
        super(props);
        this.searchBox = React.createRef();
        this.haveProgram = false;
        this.fetchingSearchOptions = false;
        this.allSearchOptions = [];
        this.state = {
            loading: true,
            joinedChannels: [],
            allChannels: [],
            newChannelVisible: false,
            editChannelVisible: false,
            ProgramItems: [],
            UserProfiles: [],
            filter: undefined,
            searchLoading: false,
            searchOptions: [],
            openingChat: false
        };
    }

    setJoinedChannels(channels: string[]) {
        this.setState({ joinedChannels: channels, loading: false });
    }
    setAllChannels(channels: Channel[]) {
        this.setState({ allChannels: channels });
    }

    componentDidUpdate(prevProps: Readonly<ChatChannelChangerProps>, prevState: Readonly<ChatChannelChangerState>, snapshot?: any): void {
        if (this.haveProgram && (this.state.ProgramItems !== prevState.ProgramItems || this.state.UserProfiles !== prevState.UserProfiles || this.state.allChannels !== prevState.allChannels)) {
            let options = [];
            options = this.state.ProgramItems.filter(item => item.get("chatSID") != null).map(item => ({
                labeltext: item.get("title"), value: item.id, object: item,
                label: <ProgramItemDisplay id={item.id} auth={this.props.appState} hideLink={true} />
            }));
            options = options.concat(this.state.UserProfiles.map(profile => ({
                labeltext: profile.get("displayName"),
                value: profile.id,
                object: profile,
                label: <UserStatusDisplay profileID={profile.id} hideLink={true} />
            })));
            let moreOptions = this.state.allChannels.filter(chan => {
                if (chan) {
                    // @ts-ignore
                    if (chan.attributes && (chan.attributes.mode !== "directMessage"
                        // && chan.attributes.category !== 'socialSpace'
                        //@ts-ignore
                        && chan.attributes.category !== 'programItem' && chan.attributes.category !== "breakoutRoom"
                    ))
                        return true;
                }
                return false;
            }).map(chan => {
                return { label: chan.friendlyName, value: chan.sid, object: chan, labeltext: chan.friendlyName };
            });
            // @ts-ignore
            options = options.concat(moreOptions);
            if (this.state.UserProfiles.length) {
                this.allSearchOptions = options;
            }
        }
    }

    componentDidMount(): void {
        //@ts-ignore
        this.props.appState.refreshUser().then((user) => {
            this.props.multiChatWindow.registerChannelConsumer(this);
            this.props.appState.programCache.getProgramItems(this).then((items: ProgramItem[]) => {
                this.haveProgram = true;
                this.setState({ ProgramItems: items });
            })
        });

    }

    async createChannel(title: string, description: string, autoJoin: boolean): Promise<Channel | null> {
        let twilio = this.props.appState.chatClient.twilio;
        if (!twilio)
            throw new Error("Not connected to twilio");
        let attributes = {
            description: description,
            category: 'public-global',
            isAutoJoin: autoJoin ? "true" : "false",
            mode: 'group',
            type: 'public'
        };
        return this.props.appState.chatClient.callWithRetry(
            () => PromiseInjectNull(twilio?.createChannel({
                friendlyName: title,
                isPrivate: false,
                attributes: attributes
            })));
    }

    async createNewChannel(values: any) {
        let newChannel = await this.createChannel(
            values.title,
            values.description,
            values.autoJoin
        );
        if (newChannel) {
            await this.props.appState.chatClient.callWithRetry(newChannel.join);
            this.setState({ newChannelVisible: false });
            this.props.appState.chatClient.openChat(newChannel.sid, false);
        }
        else {
            console.error("Could not create new channel!");
            throw new Error("New channel not created. Channel was null.");
        }
    }

    sortChannels(chan1: any, chan2: any) {
        if (!chan1 || !chan2)
            return 0;
        let s1 = chan1.channelState.friendlyName;
        let s2 = chan2.channelState.friendlyName;

        if (s1 === '#general')
            s1 = chan1.sid;
        if (s2 === '#general')
            s2 = chan2.sid;

        if (chan1.attributes && chan1.attributes.category === "programItem") {
            let i1 = chan1.attributes.programItemID;
            let i = this.state.ProgramItems.find(i => i.id === i1);
            if (i) {
                s1 = i.get("title");
            }
        }
        if (chan2.attributes && chan2.attributes.category === "programItem") {
            let i2 = chan2.attributes.programItemID;
            let i = this.state.ProgramItems.find(i => i.id === i2);
            if (i) {
                s2 = i.get("title");
            }
        }
        if (s1 && s2) {
            return s1.localeCompare(s2);
        }
        return 0;
    }

    render() {
        // if (this.state.loading)
        //     return <Spin/>
        let addChannelButton = <></>
        if (this.props.appState.isModerator)
            addChannelButton = <Button size="small"
                onClick={() => { this.setState({ newChannelVisible: true }) }}
                type="primary"
            >Create a new text channel</Button>

        let sorted = this.state.joinedChannels.filter(sid => {
            // @ts-ignore   TS: fixme  
            let chan = this.props.appState.chatClient.joinedChannels[sid];
            if (chan) {
                if (chan.attributes && (//chan.attributes.category !== "socialSpace" &&
                    chan.attributes.category !== "breakoutRoom"))
                    return true;
            }
            return false;
        }).sort((sid1: string, sid2: string) => {
            // @ts-ignore   TS: fixme  
            let chan1 = this.props.appState.chatClient.joinedChannels[sid1];
            // @ts-ignore   TS: fixme  
            let chan2 = this.props.appState.chatClient.joinedChannels[sid2];
            return this.sortChannels(chan1.channel, chan2.channel);
        }
        );
        let dms = sorted.filter(sid => {
            let chan = this.props.appState.chatClient.joinedChannels[sid];
            if (chan) {
                if (chan.attributes && (chan.attributes.mode === "directMessage"))
                    return true;
            }
            return false;
        });
        let programChats = sorted.filter(sid => {
            // @ts-ignore   TS: fixme  
            let chan = this.props.appState.chatClient.joinedChannels[sid];
            if (chan) {
                if (chan.attributes && (chan.attributes.category === 'programItem'))
                    return true;
            }
            return false;
        });
        let otherChannels = sorted.filter(sid => {
            // @ts-ignore   TS: fixme  
            let chan = this.props.appState.chatClient.joinedChannels[sid];
            if (chan) {
                if (chan.attributes && (chan.attributes.mode !== "directMessage" //&& chan.attributes.category !== 'socialSpace'
                    && chan.attributes.category !== 'programItem'))
                    return true;
            }
            return false;
        });

        return <div id="channelChanger">
            <Select showSearch={true}
                placeholder="Search for user/paper/chat"
                className="chat-search"
                value={this.state.filter}
                showArrow={false}
                dropdownMatchSelectWidth={false}
                options={this.state.searchOptions}
                filterOption={(input, option) => {

                    if (input.length >= 3 && option && option.labeltext) {
                        let label = option.labeltext;
                        //@ts-ignore
                        return label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                    }
                    return false;
                }
                }
                loading={this.state.openingChat}
                onSelect={async (item, option) => {
                    let obj = option.object;
                    let sid;
                    // @ts-ignore
                    this.setState({ openingChat: true, filter: option.label })
                    if (obj instanceof ProgramItem) {
                        sid = obj.get("chatSID");
                        if (!sid) {
                            sid = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                                programItem: obj.id
                            });
                        }
                        if (sid) {
                            await this.props.appState.chatClient.openChatAndJoinIfNeeded(sid, false);
                        }
                        else {
                            message.error("Unable to find chat ID for " + obj.get("title"))
                        }
                    } else if (obj instanceof UserProfile) {
                        await this.props.appState.helpers.createOrOpenDM(obj);
                        // } else if (obj instanceof Channel) {  This does not work!
                    } else if (obj.sid) {
                        await this.props.appState.chatClient.openChatAndJoinIfNeeded(obj.sid, false);
                    }
                    // @ts-ignore
                    this.setState({ openingChat: false, filter: undefined, searchOptions: [] })
                }
                }
                notFoundContent={this.state.searchLoading ? <Spin size="small" /> : null}
                onSearch={async (val) => {
                    if (!this.fetchingSearchOptions) {
                        this.fetchingSearchOptions = true;
                        this.setState({ searchLoading: true });
                        let profiles = await this.props.appState.programCache.getUserProfiles(this);
                        this.setState({ UserProfiles: profiles, searchLoading: false })
                    }
                    if (val.length >= 3 && this.state.searchOptions.length !== this.allSearchOptions.length)
                        this.setState({ searchOptions: this.allSearchOptions });
                    if (val.length <= 2 && this.state.searchOptions.length === this.allSearchOptions.length)
                        this.setState({ searchOptions: [] });
                }
                }
            />
            <ChannelCreateForm visible={this.state.newChannelVisible} onCancel={() => {
                this.setState({ 'newChannelVisible': false })
            }}
                onCreate={this.createNewChannel.bind(this)} />

            {addChannelButton}
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

                onSelect={(selected) => {
                    if (selected.key) {
                        // `as string` is safe because menu items are only ever
                        // assigned keys with string values.
                        this.props.appState.chatClient.openChat(selected.key as string, false);
                    }
                }}
                // selectedKeys={selectedKeys}
                defaultOpenKeys={['joinedChannels', 'dms', 'programChannels', 'otherPublicChannels']}
                forceSubMenuRender={true}
            >
                <Menu.SubMenu key="dms" title="Direct Messages">
                    {dms.map((chan) => {
                        let className = "personHoverable";
                        // if (this.state.filteredUser === user.id)
                        //     className += " personFiltered"
                        return <Menu.Item key={chan} className={className}>
                            <CollapsedChatDisplay sid={chan} category="dm" noLink={true} />
                            {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                        </Menu.Item>
                    })
                    }
                </Menu.SubMenu>
                <Menu.SubMenu key="joinedChannels" title="Subscribed">
                    {otherChannels.map((chan) => {
                        let className = "personHoverable";
                        // if (this.state.filteredUser === user.id)
                        //     className += " personFiltered"
                        return <Menu.Item key={chan} className={className}>
                            <CollapsedChatDisplay sid={chan} category="subscriptions" noLink={true} />
                            {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                        </Menu.Item>
                    })
                    }
                </Menu.SubMenu>

                <Menu.SubMenu key="otherPublicChannels" title={<span>Not subscribed</span>}>
                    {
                        this.state.allChannels
                            .filter(chan => chan && chan.sid &&
                                //@ts-ignore
                                // (chan.attributes && chan.attributes.category !== 'socialSpace') && 
                                chan.attributes.category !== 'breakoutRoom' && chan.attributes.category !== "programItem" &&
                                !this.state.joinedChannels.includes(chan.sid))
                            .sort((chan1, chan2) => {
                                return this.sortChannels(chan1, chan2);
                            })
                            .map((chan) => {
                                let className = "personHoverable";
                                // if (this.state.filteredUser === user.id)
                                //     className += " personFiltered"
                                return <Menu.Item key={chan.sid} className={className}>
                                    <CollapsedChatDisplay sid={chan.sid} channel={chan} category="others" noLink={true} />
                                    {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                                </Menu.Item>
                            })
                    }
                </Menu.SubMenu>
                <Menu.SubMenu key="programChannels" title="Paper Channels">
                    {programChats.map((chan) => {
                        let className = "personHoverable";
                        // if (this.state.filteredUser === user.id)
                        //     className += " personFiltered"
                        return <Menu.Item key={chan} className={className}>
                            <CollapsedChatDisplay sid={chan} category="papers" noLink={true} />
                            {/*<UserStatusDisplay popover={true} profileID={user.id}/>*/}
                        </Menu.Item>
                    })
                    }
                </Menu.SubMenu>

            </Menu>
        </div>
    }
}

// const UpdateCreateForm = ({ visible, onCreate, onCancel, values }) => {
//     const [form] = Form.useForm();
//     if (!values)
//         return <div></div>
//     return (
//         <Modal
//             visible={visible}
//             title="Update a channel"
//             // okText="Create"
//             footer={[
//                 <Button form="myForm" key="submit" type="primary" htmlType="submit">
//                     Create
//                 </Button>
//             ]}
//             cancelText="Cancel"
//             onCancel={onCancel}
//         // onOk={() => {
//         //     form
//         //         .validateFields()
//         //         .then(values => {
//         //             form.resetFields();
//         //             onCreate(values);
//         //         })
//         //         .catch(info => {
//         //             console.log('Validate Failed:', info);
//         //         });
//         // }}
//         >
//             <Form
//                 form={form}
//                 layout="vertical"
//                 name="form_in_modal"
//                 id="myForm"
//                 initialValues={{
//                     modifier: 'public',
//                 }}
//                 onFinish={() => {
//                     form
//                         .validateFields()
//                         .then(values => {
//                             form.resetFields();
//                             onCreate(values);
//                         })
//                         .catch(info => {
//                             console.log('Validate Failed:', info);
//                         });
//                 }}
//             >
//                 <Form.Item
//                     name="title"
//                     label="Title"
//                     rules={[
//                         {
//                             required: true,
//                             message: 'Please input the title of the channel!',
//                         },
//                     ]}
//                 >
//                     <Input defaultValue={values.uniqueName} />
//                 </Form.Item>
//                 <Form.Item name="description" label="Description (optional)">
//                     <Input type="textarea" />
//                 </Form.Item>
//                 <Form.Item name="auto-join" className="collection-create-form_last-form-item" label="Automatically join all users to this room">
//                     <Switch />
//                 </Form.Item>
//             </Form>
//         </Modal>
//     );
// };

const ChannelCreateForm: (t: any) => JSX.Element
    = ({ visible, onCreate, onCancel }) => {
        const [form] = Form.useForm();
        return (
            <Modal
                visible={visible}
                title="Create a text channel"
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
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description (optional)">
                        <Input type="textarea" />
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
            {value => (value == null ? <span>TODO: ChatChannelChanger when appState is null</span> :
                <ChatChannelChanger {...props} appState={value} />
            )}
        </AuthUserContext.Consumer>

    );

export default AuthConsumer;
