import React from 'react';
import {Avatar, Button, Card, Divider, Form, Input, Layout, List, message, Modal, Radio, Space, Spin, Tabs} from "antd";
import ActiveUsers from "./ActiveUsers";
import InfiniteScroll from "react-infinite-scroller";

const {Header, Content, Footer, Sider} = Layout;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);


class MeetingSummary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loadingMeeting: false, loading: false, members: this.props.item.members};
    }

    componentDidMount() {
        let ref = this.props.firebase.db.ref("users");
        if (this.props.item && this.props.item.members)
            Object.keys(this.props.item.members).forEach((key) => {
                ref.child(key).once("value").then((v) => {
                    this.setState((prevState) => {
                        let members = Object.assign({}, prevState.members);
                        members[key] = v.val();
                        return {members};
                    })
                })
            })
    }

    joinMeeting(meeting) {
        if (meeting.id.startsWith("demo")) {
            message.error('Sorry, you can not join the demo meetings. Try to create a new one!');

        } else {
            this.props.history.push("/videoChat/" + meeting.id);
        }
    }

    render() {
        let item = this.props.item;
        return <Card title={item.title} style={{width: "350px", "height": "350px", overflow: "scroll"}}
                     size={"small"}
                     extra={<a href="#" onClick={this.joinMeeting.bind(this, item)}>Join</a>}
        >
            {(this.state.members ? <span>
                {/*<h4>Currently here:</h4>*/}
                {/*<Divider orientation="left">Here now:</Divider>*/}
                <List
                    dataSource={Object.values(this.state.members)}
                    size={"small"}
                    renderItem={user => (
                        <List.Item key={user}>
                            <List.Item.Meta
                                avatar={
                                    <Avatar src={user.photoURL}/>
                                }
                                title={user.username}
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
        this.roomsRef = this.props.firebase.db.ref("breakoutRooms/");
        this.usersRef = this.props.firebase.db.ref("users/");
    }

    componentDidMount() {
        this.roomsRef.on('value', val => {
            const res = val.val();
            const rooms = {};
            const users = {};
            if (res) {
                val.forEach((room) => {
                    rooms[room.key] = room.val();
                    rooms[room.key].id = room.key;
                });
            }
            this.setState({rooms: rooms, loading: false});
        });
    }

    componentWillUnmount() {
        this.roomsRef.off("value");
    }

    onCreate(values) {
        var _this = this;
        var newRef = this.roomsRef.push();
        newRef.set({
            title: values.title,
            uid: this.props.user.uid
        }).then((val) => {
            _this.props.history.push("/videoChat/" + newRef.key);
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
        if (this.state.loading || !this.props.firebase.auth.currentUser) {
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
                            hasMore={this.hasMoreRoomsToShow.bind(this)}
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
                                        <MeetingSummary key={item.id} item={item} firebase={this.props.firebase}/>
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
                <Sider width="220px">
                    <ActiveUsers firebase={this.props.firebase}/>
                </Sider>
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
export default Lobby;