import React from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import ParseLiveContext from "../../parse/context";

const { Option } = Select;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

const LiveVideoSources = ['YouTube', 'Twitch', 'Facebook'];

class LiveVideos extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: false, 
            videos: [],
            src1: undefined,
            src2: undefined
        };
    }

    onCreate(values) {
        var _this = this;
        var Video = Parse.Object.extend("LiveVideo");
        var video = new Video();
        video.set("title", values.title);
        video.set("src1", values.src1);
        video.set("id1", values.id1);
        video.set("src2", values.src2);
        video.set("id2", values.id2);
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
                title: 'Main Video Source',
                dataIndex: 'src1',
                render: (text,record) => <span>{record.get("src1")}</span>,
                key: 'videosrc1',
            },
            {
                title: 'Video ID',
                dataIndex: 'id1',
                render: (text,record) => <span>{record.get("id1")}</span>,
                key: 'videoid1',
            },
            {
                title: 'Alt Video Source',
                dataIndex: 'src2',
                render: (text,record) => <span>{record.get("src2")}</span>,
                key: 'videosrc2',
            },
            {
                title: 'Alt Video ID',
                dataIndex: 'id2',
                render: (text,record) => <span>{record.get("id2")}</span>,
                key: 'videoid2',
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
                onSelectPullDown1={(value) => {
                    this.setState({src1: value});
                }}
                onSelectPullDown2={(value) => {
                    this.setState({src2: value});
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
const CollectionCreateForm = ({visible, onCreate, onCancel, onSelectPullDown1, onSelectPullDown2}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title="Add a live video link"
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
                            message: 'Please input the title of the live video!',
                        },
                    ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item name="src1" label="Main live video source" rules={[
                    {
                        required: true,
                        message: 'Please input the source of this live video'
                    },
                ]}>
                    <Select onChange={onSelectPullDown1}>
                        {LiveVideoSources.map(src => (
                            <Option key={src}>{src}</Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="id1" label="Video ID in main source">
                    <Input type="textarea"/>
                </Form.Item>
                <Form.Item name="src2" label="Alternate source">
                    <Select onChange={onSelectPullDown2}>
                        {LiveVideoSources.map(src => (
                            <Option key={src}>{src}</Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="id2" label="Video ID in alternate source" rules={[
                    {
                        required: false
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