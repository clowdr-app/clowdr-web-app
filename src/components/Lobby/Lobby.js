import React from 'react';
import {
    Avatar,
    Button,
    Card,
    Divider,
    Form,
    Input,
    Layout,
    List,
    message,
    Modal,
    Popconfirm,
    Radio,
    Space,
    Spin
} from "antd";
import ActiveUsers from "./ActiveUsers";
import InfiniteScroll from "react-infinite-scroller";
import {AuthUserContext} from "../Session";
import ParseLiveContext from "../parse/context";
import Parse from "parse";

const { Content, Footer, Sider} = Layout;

// const {TabPane} = Tabs;
// const IconText = ({icon, text}) => (
//     <Space>
//         {React.createElement(icon)}
//         {text}
//     </Space>
// );


class MeetingSummary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loadingMeeting: false, loading: false, members: this.props.item.members};
    }

    componentDidMount() {
        // let ref = this.props.firebase.db.ref("users");
        // if (this.props.item && this.props.item.members)
        //     Object.keys(this.props.item.members).forEach((key) => {
        //         ref.child(key).once("value").then((v) => {
        //             this.setState((prevState) => {
        //                 let members = Object.assign({}, prevState.members);
        //                 members[key] = v.val();
        //                 return {members};
        //             })
        //         })
        //     })
    }

    joinMeeting(meeting) {
        if (meeting.get('twilioID').startsWith("demo")) {
            message.error('Sorry, you can not join the demo meetings. Try to create a new one!');

        } else {
            this.props.history.push("/videoChat/" + meeting.id);
        }
    }

    render() {
        let item = this.props.item;
        let _this = this;
        return <Card title={item.get('title')} style={{width: "350px", "height": "350px", overflow: "scroll"}}
                     size={"small"}
                     extra={<Popconfirm
                         title="You are about to join a video call. Are you ready?"
                         onConfirm={_this.joinMeeting.bind(_this, item)}
                         okText="Yes"
                         cancelText="No"
                     ><a href="#">Join</a></Popconfirm>}
        >
            {(item.get('members') ? <span>
                {/*<h4>Currently here:</h4>*/}
                {/*<Divider orientation="left">Here now:</Divider>*/}
                <List
                    dataSource={item.get('members').filter((v)=>(v != null ))}
                    size={"small"}
                    renderItem={user => (
                        <List.Item key={user.id}>
                            <List.Item.Meta
                                avatar={
                                    <Avatar src={(user.get("profilePhoto") ? user.get("profilePhoto").url() : "")} />
                                }
                                title={user.get('displayname')}
                            />
                        </List.Item>
                    )}
                >
                    {this.state.loading && this.state.hasMore && (
                        <div className="demo-loading-container">
                            <Spin/>
                        </div>
                    )}
                </List>
            </span> : <span>Nobody's here yet</span>)}

        </Card>

    }
}

class Lobby extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'loading': true, 'visible': false, maxDisplayedRooms: 10};
    }

    componentDidMount() {
        let query = new Parse.Query("BreakoutRoom");
        query.include(["members.displayname","members.profilePhoto"]);
        query.addDescending("createdAt");
        query.find().then(res => {
            this.setState({
                rooms: res,
                loading: false
            });
            this.sub = this.props.parseLive.subscribe(query);
            this.sub.on('create', newItem => {
                this.setState((prevState) => ({
                    rooms: [newItem, ...prevState.rooms]
                }))
            })
            this.sub.on('update', newItem => {
                this.setState((prevState) => ({
                    rooms: prevState.rooms.map(room => room.id == newItem.id ? newItem : room)
                }))
            })
            this.sub.on("delete", vid => {
                this.setState((prevState) => ({
                    rooms: prevState.rooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            });
        })
    }

    componentWillUnmount() {
        if(this.sub) {
            this.sub.unsubscribe();
        }
    }

    onCreate(values) {
        var _this = this;
        let Room =Parse.Object.extend("BreakoutRoom");
        let room = new Room();
        room.set("title", values.title);
        room.set("creator", this.props.auth.user);
        room.set("description", values.description);
        room.save().then((val) => {
            _this.props.history.push("/videoChat/" + room.id);
        }).catch(err => {
            console.log(err);
        });
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }


    displayMore() {
        this.setState((prevState) => ({
            maxDisplayedRooms: prevState.maxDisplayedRooms + 10
        }));
    }

    hasMoreRoomsToShow() {
        return this.state.maxDisplayedRooms < this.state.rooms.length;
    }

    render() {
        if (this.state.loading || !this.props.auth.user) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
        return (
            // <Tabs defaultActiveKey="1">
            //     <TabPane tab="Breakout Areas" key="1">
            <Layout>
                <Content>
                    <Card title={"The Lobby Track"} style={{textAlign: "left"}}>

                        Some say that the most valuable part of an academic conference is the "lobby track" - where
                        colleagues meet, catch up, and share
                        casual conversation. To bring the metaphor into the digital world, the digital lobby session
                        allows you to create a small group video chat, and switch between group chats. Take
                        a look at the breakout rooms that participants have formed so far and join one, or create a new
                        one!<br/>
                        <Button
                            type="primary"
                            onClick={() => {
                                this.setVisible(true);
                            }}
                        >
                            New breakout room
                        </Button>
                    </Card>
                    <Divider/>
                    <div style={{maxHeight: "80vh", overflow: 'auto', border: '1px sold #FAFAFA'}}>
                        <InfiniteScroll
                            pageStart={0}
                            // hasMore={Object.keys(this.state.activeUsers).length >= 20}
                            hasMore={this.hasMoreRoomsToShow()}
                            loadMore={this.displayMore.bind(this)}
                            useWindow={false}
                            initialLoad={false}
                            loader={<Spin>Loading...</Spin>}
                        >
                            <Space style={{
                                maxWidth: '80vw',
                                display: "flex",
                                marginLeft: "20px",
                                flexWrap: "wrap"
                            }}>
                                {
                                    Object.values(this.state.rooms).slice(0, this.state.maxDisplayedRooms).map((item) => (
                                        <MeetingSummary history={this.props.history} key={item.id} item={item} parseLive={this.props.parseLive} />
                                    ))}
                            </Space>
                        </InfiniteScroll>
                    </div>
                    <CollectionCreateForm
                        visible={this.state.visible}
                        onCreate={this.onCreate.bind(this)}
                        onCancel={() => {
                            this.setVisible(false);
                        }}
                    />
                </Content>
                {/*<Sider width="220px">*/}
                    {/*<ActiveUsers parseLive={this.props.parseLive} />*/}
                {/*</Sider>*/}
            </Layout>
            //     </TabPane>
            //     <TabPane tab="Tab 2" key="2">
            //         Content of Tab Pane 2
            //     </TabPane>
            //     <TabPane tab="Tab 3" key="3">
            //         Content of Tab Pane 3
            //     </TabPane>
            // </Tabs>
        );
    }
}

const CollectionCreateForm = ({visible, onCreate, onCancel}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title="Create a new breakout room"
            // okText="Create"
            footer={[
                <Button form="myForm" key="submit" type="primary" htmlType="submit">
                    Submit
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
                            message: 'Please input the title of the breakout room!',
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item name="description" label="Description">
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
        {parseValue => (
            <AuthUserContext.Consumer>
                {value => (
                    <Lobby {...props} auth={value} parseLive={parseValue}/>
                )}
            </AuthUserContext.Consumer>
        )
        }

    </ParseLiveContext.Consumer>
);
export default AuthConsumer;