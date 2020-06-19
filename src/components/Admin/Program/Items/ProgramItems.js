import React, {Fragment} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";

const { Option } = Select;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

let Liveitemsources = [];

class ProgramItems extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: false, 
            items: [],
            editing: false,
            edt_item: undefined
        };
    }

    onCreate(values) {
        var _this = this;
        // Create the item record
        var item = Parse.Object.extend("ProgramItem");
        var item = new item();
        item.set("name", values.name);
        item.set("src1", values.location);
        item.set("id1", values.id1);
        item.set("pwd1", values.pwd1);
        item.set("src2", values.src2);
        item.set("id2", values.id2);
        item.set("pwd2", values.pwd2);
        item.set("qa", values.qa);
        item.save().then((val) => {
            _this.setState({visible: false})
            _this.refreshList();
            _this.createWatchers(item);
        }).catch(err => {
            console.log(err);
        });
    }

    onDelete(value) {
        console.log("Deleting " + value + " " + value.get("name"));
        // Delete the watchers first
        
        value.destroy().then(()=>{
            this.refreshList();
        });
    }

    onEdit(item) {
        console.log("Editing " + item.get("name") + " " + item.id);
        this.setState({
            visible: true, 
            editing: true, 
            edt_item: {
                objectId: item.id,
                name: item.get("name"),
                src1: item.get("src1"),
                pwd1: item.get("pwd1"),
                id1: item.get("id1"),
                src2: item.get("src2"),
                id2: item.get("id2"),
                pwd2: item.get("pwd2"),
                qa: item.get("qa"),
            }
        });
    }

    onUpdate(values) {
        var _this = this;
        console.log("Updating " + values.id1 + "; " + values.objectId);
        let item = this.state.items.find(r => r.id == values.objectId);

        if (item) {
            item.set("name", values.name);
            item.set("src1", values.src1);
            item.set("id1", values.id1);
            item.set("pwd1", values.pwd1);
            item.set("src2", values.src2);
            item.set("id2", values.id2);
            item.set("pwd2", values.pwd2);
            item.set("qa", values.qa);
            item.save().then((val) => {
                _this.setState({visible: false, editing: false});
                _this.refreshList();
            }).catch(err => {
                console.log(err + ": " + values.objectId);
            })
        }
        else {
            console.log("item not found: " + values.id1);
        }
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
        let query = new Parse.Query("ProgramItem");
        console.log('Current conference: ' + this.props.auth.currentConference.get('name'));
        query.equalTo("conference", this.props.auth.currentConference);
        query.find().then(res=>{
            console.log('Found items ' + res.length);
            this.setState({
                items: res,
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
                title: 'Authors',
                dataIndex: 'authors',
                render: (text,record) => <span>{record.get("authors")}</span>,
                key: 'authors',
            },
            {
                title: 'Track',
                dataIndex: 'track',
                render: (text,record) => <span>{record.get("track").get('name')}</span>,
                key: 'track',
            },
            {
                title: 'Action',
                key: 'action',
                render: (text, record) => (
                    <Space size="small">
                        <a href="#" item={record} onClick={() => this.onEdit(record)}>Edit</a>
                        <Popconfirm
                            title="Are you sure delete this item?"
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
                        title="Edit Item"
                        visible={this.state.visible}
                        data={this.state.edt_item}
                        onAction={this.onUpdate.bind(this)}
                        onCancel={() => {
                            this.setVisible(false);
                            this.setState({editing: false});
                        }}
                        onSelectPullDown1={(value) => {
                            this.setState({src1: value});
                        }}
                    />
                <Table columns={columns} dataSource={this.state.items} rowKey={(i)=>(i.id)}>
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
                New item
            </Button>
            <CollectionEditForm
                title="Add Item"
                visible={this.state.visible}
                onAction={this.onCreate.bind(this)}
                onCancel={() => {
                    this.setVisible(false);
                }}
                onSelectPullDown1={(value) => {
                    this.setState({src1: value});
                }}
            />
            <Table columns={columns} dataSource={this.state.items} rowKey={(i)=>(i.id)}>
            </Table>
        </div>
    }

}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramItems {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
)
export default AuthConsumer;

const CollectionEditForm = ({title, visible, data, onAction, onCancel, onSelectPullDown1}) => {
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
                    rules={[
                        {
                            required: true,
                            message: 'Please input the title of the item!',
                        },
                    ]}
                >
                    <Input placeholder="Name"/>
                </Form.Item>
                <Form.Item name="stream1">
                    <Input.Group compact>
                        <Form.Item name="src1">
                            <Select placeholder="Main Source" style={{ width: 120 }} onChange={onSelectPullDown1}>
                                {Liveitemsources.map(src => (
                                    <Option key={src}>{src}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="id1">
                            <Input style={{ width: '100%' }} type="textarea" placeholder="ID"/>
                        </Form.Item>
                        <Form.Item name="pwd1">
                            <Input style={{ width: '100%' }} type="textarea" placeholder="Encrypted Password (Optional)"/>
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                <Form.Item name="stream2">
                    <Input.Group compact>
                        <Form.Item name="src2" >
                            <Select placeholder="Alt. Source" style={{ width: 120 }} onChange={onSelectPullDown1}>
                                {Liveitemsources.map(src => (
                                    <Option key={src}>{src}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="id2" rules={[
                            {
                                required: false
                            },
                        ]}>
                            <Input style={{ width: '100%' }} type="textarea" placeholder="ID"/>
                        </Form.Item>
                        <Form.Item name="pwd2">
                            <Input style={{ width: '100%' }} type="textarea" placeholder="Encrypted Password (Optional)"/>
                        </Form.Item>
                    </Input.Group>
                </Form.Item>
                <Form.Item name="qa">
                    <Input placeholder="Q&A tool link"/>
                </Form.Item>
            </Form>
        </Modal>
    );
};