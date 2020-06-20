import React, {Fragment} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import moment from 'moment';

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
            loading: false, 
            sessions: [],
            rooms: [],
            editing: false,
            edt_session: undefined
        };
    }

    onCreate(values) {
        var _this = this;
        // Create the session record
        var session = Parse.Object.extend("ProgramSession");
        var session = new session();
        session.set("title", values.title);
        session.set("startTime", values.startTime);
        session.set("endTime", values.endTime);
        session.set("room", values.room);
        session.save().then((val) => {
            _this.setState({visible: false})
            _this.refreshList();
        }).catch(err => {
            console.log(err);
        });
    }

    onDelete(value) {
        console.log("Deleting " + value + " " + value.get("title"));
        // Delete the watchers first
        
        value.destroy().then(()=>{
            this.refreshList();
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
                room: session.get("room").get('name')
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
            let room = this.state.rooms.find(r => r.id == values.room);
            if (!room)
                console.log('Invalid room ' + values.room);
            session.set("room", room);
            session.save().then((val) => {
                _this.setState({visible: false, editing: false});
                _this.refreshList();
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
        // Get the rooms
        let query = new Parse.Query("ProgramRoom");
        query.equalTo("conference", this.props.auth.currentConference);
        query.find().then(res => {
            console.log('Found rooms ' + res.length);
            this.setState({
                rooms: res
            });
        })

        this.refreshList();
        // this.sub = this.props.parseLive.subscribe(query);
        // this.sub.on('create', vid=>{
        //     console.log(vid);
        // })
    }

    refreshList(){
        let query = new Parse.Query("ProgramSession");
//        console.log(this.props.auth);
//        let token = this.props.auth.user.getSessionToken();
//        console.log(token);
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
                render: (text,record) => <span>{record.get("startTime").toString()}</span>,
                key: 'start',
            },
            {
                title: 'End Time',
                dataIndex: 'end',
                render: (text,record) => <span>{record.get("endTime").toString()}</span>,
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
                        <a href="#" session={record} onClick={() => this.onEdit(record)}>Edit</a>
                        <Popconfirm
                            title="Are you sure delete this session?"
                            onConfirm={()=>this.onDelete(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                        <a href="#">Delete</a>
                        </Popconfirm>
                    </Space>
                ),
            },
        ];

        if (this.state.loading)
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
            <Table columns={columns} dataSource={this.state.sessions} rowKey={(r)=>(r.id)}>
            </Table>
        </div>
    }

}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramSessions {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
)
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
                        <Form.Item name="startTime" label="Start time">
                            <DatePicker showTime/>
                        </Form.Item>
                        <Form.Item name="endTime" label="End time">
                            <DatePicker showTime/>
                        </Form.Item>
                    </Input.Group>
                </Form.Item>

                <Form.Item name="room" label="Room">
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