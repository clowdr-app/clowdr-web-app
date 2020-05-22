import React from 'react';
import {Button, DatePicker, Form, Input, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

export default class LiveVideos extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loading: true, videos: []};
        this.videoRef = this.props.firebase.db.ref("liveVideos/");

    }

    onCreate(values) {
        var _this = this;
        var newRef = this.videoRef.child(values.ytid);
        newRef.set({
            title: values.title
            // uid: this.props.user.uid
        }).then((val) => {
            _this.setState({visible: false})
        }).catch(err => {
            console.log(err);
        });
    }

    onDelete(key) {
        this.videoRef.child(key).remove();
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        this.videoRef.on('value', val => {
            const res = val.val();
            if (res) {
                const videos = [];
                val.forEach((vid) => {
                    let video = vid.val();
                    video.key = vid.key;
                    videos.push(video);
                });
                this.setState({videos: videos, loading: false});
            }
        });
    }

    componentWillUnmount() {
        this.videoRef.off("value");
    }

    render() {
        const columns = [
            {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
                render: (text, record) => <a onClick={() => {
                    this.props.history.push("/admin/users/edit/" + record.key)
                }}>{text}</a>,
            },
            {
                title: 'YouTube Video ID',
                dataIndex: 'key',
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
                            onConfirm={()=>this.onDelete(record.key)}
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
            <Table columns={columns} dataSource={this.state.videos}>
            </Table>
        </div>
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