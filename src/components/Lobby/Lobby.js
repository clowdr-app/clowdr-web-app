import React from 'react';
import {Button, Card, Form, Input, Modal, Radio, Spin, Tabs} from "antd";
import { List, Avatar, Space } from 'antd';
import { MessageOutlined, LikeOutlined, StarOutlined } from '@ant-design/icons';
import Room from "./examplecode/Room";
import InfiniteScroll from 'react-infinite-scroller';

const {TabPane} = Tabs;
const IconText = ({ icon, text }) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);
class Lobby extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'loading': true, 'visible': false};
        this.roomsRef = this.props.firebase.db.ref("breakoutRooms/");
        this.usersRef = this.props.firebase.db.ref("users/");
    }

    componentDidMount() {
        this.roomsRef.on('value', val => {
            const res = val.val();
            if (res) {
                const rooms = {};
                const users = {};
                val.forEach((room) => {
                    rooms[room.key]= room.val();
                    Object.keys(room.val().members).forEach((member)=>{
                        this.usersRef.child(member).once("value").then((userData)=>{
                            this.setState((prevState)=>{
                                prevState.rooms[room.key].members[member] = userData.val();
                                return prevState;
                            });
                        })
                    })
                });
                this.setState({rooms: rooms, loading: false, users: users});
            }
        });
    }

    onCreate(values) {
        var newRef = this.roomsRef.push();
        newRef.set({
            title: values.title,
            uid: this.props.user.uid
        }).catch(err => {
            console.log(err);
        });
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    joinMeeting(meeting){
        var _this = this;
        this.setState({loadingMeeting:'true'})
        this.props.firebase.auth.currentUser.getIdToken(/* forceRefresh */ true).then(function(idToken) {
            const data = fetch('http://localhost:3001/video/token', {
                method: 'POST',
                body: JSON.stringify({
                    room: meeting.id,
                    identity: idToken
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(res => {
                res.json().then((data)=>{
                    _this.setState(
                        {
                            meeting: meeting,
                            token: data.token,
                            loadingMeeting: false
                        }
                    )
                    console.log(data.token);
                })
            });
        }).catch(function(error) {
            // Handle error
        });


        //
        // setToken(data.token);
    }

    closeMeeting(meeting){

        this.setState({token:null});
    }
    render() {
        if (this.state.loading || !this.props.firebase.auth.currentUser) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
        return (
            <Tabs defaultActiveKey="1">
                <TabPane tab="Breakout Areas" key="1">
                    <h4>{Object.keys(this.state.rooms).length > 0 ? "Join a room or create a new one!" : "Looks like there aren't any breakout rooms right now. Be the first to create a breakout room!"}</h4>

                    <Button
                        type="primary"
                        onClick={() => {
                            this.setVisible(true);
                        }}
                    >
                        New breakout room
                    </Button>
                    <List
                        itemLayout="horizontal"
                        dataSource={Object.values(this.state.rooms)}
                        renderItem={item => (
                            <List.Item
                                key={item.id}
                                // actions={[
                                //     <IconText icon={StarOutlined} text="156" key="list-vertical-star-o" />,
                                //     <IconText icon={LikeOutlined} text="156" key="list-vertical-like-o" />,
                                //     <IconText icon={MessageOutlined} text="2" key="list-vertical-message" />,
                                // ]}
                                // extra={
                                //     <img
                                //         width={272}
                                //         alt="logo"
                                //         src="https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png"
                                // }
                            >
                                <Card title={item.title}>
                                    {item.description}

                                    <br />
                                    <Button type="primary" onClick={this.joinMeeting.bind(this,item)} loading={this.state.loadingMeeting}>Join Room</Button>
                                    <h4>Currently here:</h4>
                                    <List
                                        dataSource={Object.values(item.members)}
                                        renderItem={user => (
                                            <List.Item key={user}>
                                                <List.Item.Meta
                                                    avatar={
                                                        <Avatar src={user.photoURL} />
                                                    }
                                                    title={<a href="https://ant.design">{user.name}</a>}
                                                    description={user.email}
                                                />
                                            </List.Item>
                                        )}
                                    >
                                        {this.state.loading && this.state.hasMore && (
                                            <div className="demo-loading-container">
                                                <Spin />
                                            </div>
                                        )}
                                    </List>
                                </Card>


                            </List.Item>
                        )}
                    />,
                    <CollectionCreateForm
                        visible={this.state.visible}
                        onCreate={this.onCreate.bind(this)}
                        onCancel={() => {
                            this.setVisible(false);
                        }}
                    />
                    {this.state.token ? <Modal
                        visible={true}
                    title={this.state.meeting.title}
                    onCancel={this.closeMeeting.bind(this,this.state.meeting)}
                    ><Room roomName={this.state.meeting.title} token={this.state.token} handleLogout={this.closeMeeting.bind(this,this.state.meeting)} /> </Modal>: ""}
                </TabPane>
                <TabPane tab="Tab 2" key="2">
                    Content of Tab Pane 2
                </TabPane>
                <TabPane tab="Tab 3" key="3">
                    Content of Tab Pane 3
                </TabPane>
            </Tabs>
        );
    }
}

const CollectionCreateForm = ({visible, onCreate, onCancel}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title="Create a new breakout room"
            okText="Create"
            cancelText="Cancel"
            onCancel={onCancel}
            onOk={() => {
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
            <Form
                form={form}
                layout="vertical"
                name="form_in_modal"
                initialValues={{
                    modifier: 'public',
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