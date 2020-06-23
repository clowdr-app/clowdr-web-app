import React, {Fragment} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import moment from 'moment';
import {
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';

const { Option } = Select;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

const Livesessionsources = ['', 'YouTube', 'Twitch', 'Facebook', 'iQIYI', 'ZoomUS', 'ZoomCN'];

class ProgramSessions extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: true, 
            toggle: false,
            sessions: [],
            rooms: [],
            gotSessions: false,
            gotRooms: false,
            editing: false,
            edt_session: undefined
        };

        console.log('[Admin/Sessions]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.rooms = this.props.rooms;
            this.state.sessions = this.props.sessions;
        }
    }


    onCreate(values) {
        console.log("OnCreate! " + values.title)
        var _this = this;
        let room = this.state.rooms.find(r => r.id == values.room);
        if (!room)
            console.log('Invalid room ' + values.room);

        // Create the session record
        var Session = Parse.Object.extend("ProgramSession");
        var session = new Session();
        session.set('conference', this.props.auth.currentConference);
        session.set("title", values.title);
        session.set("startTime", values.startTime.toDate());
        session.set("endTime", values.endTime.toDate());
        session.set("room", room);
        session.set("confKey", Math.floor(Math.random() * 10000000).toString());
        session.save().then((val) => {
            _this.setState({visible: false /*, sessions: sortedSessions*/})
        }).catch(err => {
            console.log(err + " " + session.id);
        });

        // let data = {
        //     conference: this.props.auth.currentConference.id,
        //     title: values.title,
        //     startTime: values.startTime.toDate(),
        //     endTime: values.endTime.toDate(),
        //     room: room.id
        // }
        // Parse.Cloud.run("newProgramSession", data).then(() => {
        //     console.log('[ProgramSession]: sent request to create new session ' + data.title);
        // });

    }

    onDelete(value) {
        console.log("Deleting " + value + " " + value.get("title"));
        // Delete the watchers first
        
        value.destroy().then(() => {
            this.setState({
                sessions: [...this.state.sessions]
            });
        });
    }

    onEdit(session) {
        console.log("Editing " + session.get("title") + " " + session.id);
        this.setState({
            visible: true, 
            editing: true, 
            edt_session: {
                objectId: session.id,
                title: session.get("title"),
                startTime: moment(session.get("startTime")),
                endTime: moment(session.get("endTime")),
                room: session.get("room").get('name'), 
                roomId: session.get('room').id
            }
        });
    }

    onUpdate(values) {
        var _this = this;
        console.log("Updating session " + values.title);
        let session = this.state.sessions.find(r => r.id == values.objectId);

        if (session) {
            session.set("title", values.title);
            session.set("startTime", values.startTime.toDate());
            session.set("endTime", values.endTime.toDate());
            let room = this.state.rooms.find(r => r.id == values.roomId);
            if (!room)
                console.log('Invalid room ' + values.room);
            session.set("room", room);
            session.save().then((val) => {
                _this.setState({visible: false, editing: false});
            }).catch(err => {
                console.log(err + ": " + values.objectId);
            })
        }
        else {
            console.log("Program session not found: " + values.title);
        }
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        console.log("[Admin/Sessions]: Something changed");

        if (this.state.loading) {
            if (this.state.gotRooms && this.state.gotSessions) {
                console.log('[Admin/Sessions]: Program download complete');
                this.setState({
                    rooms: this.props.rooms,
                    sessions: this.props.sessions,
                    loading: false
                });
            }
            else {
                console.log('[Admin/Sessions]: Program still downloading...');
                if (prevProps.rooms.length != this.props.rooms.length) {
                    this.setState({gotRooms: true});
                    console.log('[Admin/Sessions]: got rooms');
                }
                if (prevProps.sessions.length != this.props.sessions.length) {
                    this.setState({gotSessions: true});
                    console.log('[Admin/Sessions]: got sessions');
                }
            }
        }
        else {
            console.log('[Admin/Sessions]: Program cached');
            if (prevProps.rooms.length != this.props.rooms.length) {
                this.setState({rooms: this.props.rooms});
                console.log('[Admin/Sessions]: changes in rooms');
            }
            if (prevProps.sessions.length != this.props.sessions.length) {
                let sortedSessions = [...this.props.sessions];
                sortedSessions.sort((s1, s2) => s1.get("startTime") - s2.get("startTime"));

                this.setState({sessions: sortedSessions});
                console.log('[Admin/Sessions]: changes in sessions');
            }
        }
    }

    refreshList(){
        let query = new Parse.Query("ProgramSession");
        console.log('Current conference: ' + this.props.auth.currentConference.get('name'));
        query.equalTo("conference", this.props.auth.currentConference);
        query.limit(1000);
        query.find().then(res=>{
            console.log('Found sessions ' + res.length);
            this.setState({
                sessions: res,
                loading: false
            });
        })
    }

    componentWillUnmount() {
        // this.sub.unsubscribe();
    }

    formatTime(time) {
        var word = time.split(" ");
        var displayTime = "";
        displayTime += word[3] + "-" + word[1] + "-" + word[2] + " "
                        + word[4].substr(0, 5) + " "
                        + word[6].charAt(1) + word[7].charAt(0) + word[8].charAt(0);
        return displayTime;
        // return time;
    }

    render() {
        const columns = [
            {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
                render: (text, record) => <span>{record.get("title")}</span>,
            },
            {
                title: 'Start Time',
                dataIndex: 'start',
                render: (text,record) => <span>{this.formatTime(record.get("startTime").toString())}</span>,
                key: 'start',
            },
            {
                title: 'End Time',
                dataIndex: 'end',
                render: (text,record) => <span>{this.formatTime(record.get("endTime").toString())}</span>,
                key: 'end',
            },
            {
                title: 'Room',
                dataIndex: 'room',
                render: (text,record) => <span>{record.get("room") ? record.get("room").get('name') : ""}</span>,
                key: 'room',
            },
            {
                title: 'Action',
                key: 'action',
                render: (text, record) => (
                    <Space size="small">
                        <a href="#" title="Edit" session={record} onClick={() => this.onEdit(record)}>{<EditOutlined />}</a>
                        <Popconfirm
                            title="Are you sure delete this session?"
                            onConfirm={()=>this.onDelete(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                        <a href="#" title="Delete">{<DeleteOutlined />}</a>
                        </Popconfirm>
                    </Space>
                ),
            },
        ];

        if (!this.props.downloaded)
            return (
                <Spin tip="Loading...">
                </Spin>)

        else if (this.state.editing)
            return (
                <Fragment>
                    <CollectionEditForm
                        title="Edit Session"
                        visible={this.state.visible}
                        data={this.state.edt_session}
                        onAction={this.onUpdate.bind(this)}
                        onCancel={() => {
                            this.setVisible(false);
                            this.setState({editing: false});
                        }}
                        rooms={this.state.rooms}
                    />
                <Table columns={columns} dataSource={this.state.sessions} rowKey={(s)=>(s.id)}>
                </Table>
            </Fragment>
            )
        return <div>
            <Button
                type="primary"
                onClick={() => {
                    this.setVisible(true);
                }}
            >
                New session
            </Button>
            <CollectionEditForm
                title="Add Session"
                visible={this.state.visible}
                onAction={this.onCreate.bind(this)}
                onCancel={() => {
                    this.setVisible(false);
                }}
                rooms={this.state.rooms}
            />
            <Table columns={columns} dataSource={this.state.sessions} rowKey={r => r.id}>
            </Table>
        </div>
    }

}

const AuthConsumer = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ProgramSessions {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>

);
export default AuthConsumer;

const CollectionEditForm = ({title, visible, data, onAction, onCancel, rooms}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title={title}
            // okText="Create"
            footer={[
                <Button form="myForm" key="submit" type="primary" htmlType="submit">
                    Submit
                </Button>
            ]}
            cancelText="Cancel"
            onCancel={onCancel}
        >
            <Form
                form={form}
                layout="vertical"
                name="form_in_modal"
                id="myForm"
                initialValues={{
                    modifier: 'public',
                    ...data
                }}
                onFinish={() => {
                    form
                        .validateFields()
                        .then(values => {
                            form.resetFields();
                            onAction(values);
                        })
                        .catch(info => {
                            console.log('Validate Failed:', info);
                        });
                }}
            >
                <Form.Item name="objectId" noStyle>
                    <Input type="text" type="hidden" />
                </Form.Item>

                <Form.Item name="roomId" noStyle>
                    <Input type="text" type="hidden" />
                </Form.Item>

                <Form.Item
                    name="title"
                    label="Title"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the title of the session!',
                        },
                    ]}
                >
                    <Input placeholder="Name"/>
                </Form.Item>

                <Form.Item name="dates">
                    <Input.Group compact>
                        <Form.Item name="startTime" label="Start time" 
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required!',
                                    },
                                ]}
                        >
                            <DatePicker showTime/>
                        </Form.Item>
                        <Form.Item name="endTime" label="End time"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required!',
                                    },
                                ]}
                        >
                            <DatePicker showTime/>
                        </Form.Item>
                    </Input.Group>
                </Form.Item>

                <Form.Item name="room" label="Room"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input the room the session!',
                                },
                            ]}
                >
                    <Select placeholder="Chose the room" style={{ width: 400 }} >
                        {rooms.map(r => (
                            <Option key={r.id}>{r.get('name')}</Option>
                        ))}
                    </Select>
                </Form.Item>

            </Form>
        </Modal>
    );
};