import React from 'react';
import {Button, DatePicker, Form, Input, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import ParseLiveContext from "../../parse/context";

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

class LiveVideos extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {loading: false, videos: []};
        // this.videoRef = this.props.firebase.db.ref("liveVideos/");

    }

    onCreate(values) {
        var _this = this;
        var Video = Parse.Object.extend("LiveVideo");
        var video = new Video();
        video.set("title",values.title);
        video.set("key",values.ytid);
        video.save().then((val) => {
            _this.setState({visible: false})
            _this.refreshList();
        }).catch(err => {
            console.log(err);
        });
    }

    onDelete(value) {
        console.log(value);
        value.destroy().then(()=>{
            this.refreshList();
        });
        // this.videoRef.child(key).remove();
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        this.refreshList();
        // this.sub = this.props.parseLive.subscribe(query);
        // this.sub.on('create', vid=>{
        //     console.log(vid);
        // })
    }

    refreshList(){
        let query = new Parse.Query("LiveVideo");
        query.find().then(res=>{
            this.setState({
                videos: res,
                loading: false
            })
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
                render: (text, record) => <a onClick={() => {
                    this.props.history.push("/admin/users/edit/" + record.key)
                }}>{record.get("title")}</a>,
            },
            {
                title: 'YouTube Video ID',
                dataIndex: 'key',
                render: (text,record) => <span>{record.get("key")}</span>,
                key: 'videoid',
            },
            // {
            //     title: 'Address',
            //     dataIndex: 'address',
            //     key: 'address',
            // },
            {
                title: 'Action',
                key: 'action',
                render: (text, record) => (
                    <Space size="middle">
                        {/*<a>Invite {record.name}</a>*/}
                        <Popconfirm
                            title="Are you sure delete this video?"
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
        return <div>

            <Button
                type="primary"
                onClick={() => {
                    this.setVisible(true);
                }}
            >
                New Video
            </Button>
            <CollectionCreateForm
                visible={this.state.visible}
                onCreate={this.onCreate.bind(this)}
                onCancel={() => {
                    this.setVisible(false);
                }}
            />
            <Table columns={columns} dataSource={this.state.videos} rowKey={(v)=>(v.id)}>
            </Table>
        </div>
    }

}

const ParseLiveConsuemr = (props) => (
    <ParseLiveContext.Consumer>
        {value => (
            <LiveVideos {...props} parseLive={value}/>
        )}
    </ParseLiveContext.Consumer>
)
export default ParseLiveConsuemr;
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
                            message: 'Please input the title of the video!',
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item name="ytid" label="YouTube ID" rules={[
                    {
                        required: true,
                        message: 'Please input the YouTube ID for this video'
                    },
                ]}>
                    <Input type="textarea"/>
                </Form.Item>
                <Form.Item name="startTime" label="Publish at">
                    <DatePicker showTime/>
                </Form.Item>
                <Form.Item name="startTime" label="Remove from page at">
                    <DatePicker showTime/>
                </Form.Item>
            </Form>
        </Modal>
    );
};