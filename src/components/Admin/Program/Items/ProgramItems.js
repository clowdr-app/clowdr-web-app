import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import {
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';
import { BrandingWatermark } from '@material-ui/icons';

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
        console.log("[Admin/Items]: program downloaded?" + this.props.downloaded);
        this.state = {
            loading: true, 
            items: [],
            tracks: [],
            gotItems: false,
            gotTracks: false,
            editing: false,
            edt_item: undefined,
            seached: false,
            searchResult: ""
        };

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.items = this.props.items;
            this.state.tracks = this.props.tracks;
        }
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
        item.set("conference", this.props.auth.currentConference);
        item.save().then((val) => {
            _this.setState({visible: false, items: [item, ...this.state.items]})
//            _this.refreshList();
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
            item.set("conference", this.props.auth.currentConference);
            item.save().then((val) => {
                _this.setState({visible: false, editing: false});
//                _this.refreshList();
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
    }


    componentDidUpdate(prevProps) {
        console.log("[Admin/Items]: Something changed");

        if (this.state.loading) {
            if (this.state.gotTracks && this.state.gotItems) {
                // console.log('[Admin/Items]: Program download complete');
                this.setState({
                    items: this.props.items,
                    tracks: this.props.tracks,
                    loading: false,
                });
            }
            else {
                // console.log('[Admin/Items]: Program still downloading...');
                if (prevProps.tracks.length != this.props.tracks.length) {
                    this.setState({gotTracks: true});
                    // console.log('[Admin/Items]: got tracks');
                }
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true})
                    // console.log('[Admin/Items]: got items');
                }
            }
        }
        else 
            console.log('[Admin/Items]: Program cached');
    }


    refreshList(){
        let query = new Parse.Query("ProgramItem");
        console.log('Current conference: ' + this.props.auth.currentConference.get('name'));
        query.equalTo("conference", this.props.auth.currentConference);
        query.limit(5000);
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

    // getAuthorsNames(item) {
    //     let people = record.get("authors");
    //     let ProgramPerson = Parse.Object.extend('ProgramPerson');
    //     let qlist = [];
    //     people.map(p => {
    //         let qq = new Parse.Query(ProgramPerson);
    //         qq.equalTo('objectId', p.id);
    //         qlist.push(qq);
    //     });
    //     let q = Parse.Query.or(qlist);
    //     let authors = await q.find();
    //     return authors;
    // }

    render() {

        //Set up edtiable table cell
        const EditableCell = ({
            editing,
            dataIndex,
            title,
            inputType,
            record,
            index,
            children,
            ...restProps
        }) => {
            let inputNode = null;
            switch (dataIndex) {
                case('title'):
                    inputNode = <Input/>;
                    break;
                case('track'):
                    inputNode = (
                        <Select placeholder="Choose the track" style={{ width: 400 }} >
                            {this.state.tracks.map(t => (
                                <Option key={t.id} value={t.id}>{t.get('name')}</Option>
                            ))}
                        </Select>
                    );
                    break;
                default:
                    inputNode = null;
                    break;
            }

            return (
                <td {...restProps}>
                    {editing ? (
                        <Form.Item
                            name={dataIndex}
                            style={{margin:0}}
                            rules={[
                                {
                                    required:true,
                                    message:`Please Input ${title}!`
                                }
                            ]}
                        >
                            {inputNode}   
                        </Form.Item>
                    ) : (
                        children
                    )}
                </td>
            );
        };

        //set up editable table
        const EditableTable = () => {
            //React hook
            console.log("Loading Editable table");
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.items);
            const [editingKey, setEditingKey] = useState('');

            const isEditing = record => record.id === editingKey;

            const edit = record => {
                console.log("record being edited is " + record.get("title"));
                console.log(JSON.stringify(record));
                form.setFieldsValue({
                    title: record.get("title") ? record.get("title") : "",
                    track: record.get("track") ? record.get("track").get("name") : "",
                });
                console.log("setting editing key state");
                setEditingKey(record.id);
                console.log("editing key state done");
            };

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                console.log("deleting item: " + record.get("title"));
                const newItemList = [...this.state.items];
                this.setState({
                    items: newItemList.filter(item => item.id !== record.id)
                });
                // delete from database
                record.destroy().then(() => {
                    console.log("item deleted from db")
                });
            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let item = newData.find(item => item.id === id);

                    if (item) {
                        item.set("title", row.title);
                        let newTrack = this.state.tracks.find(t => t.id === row.track);
                        if (newTrack) {
                            console.log("Track found. Updating");
                            item.set("track", newTrack)
                        } else {
                            console.log("Track not found");
                        }

                    setData(newData);

                    item.save()
                            .then((response) => {
                                console.log('Updated ProgramItem', response);})
                            .catch(err => {
                                console.log(err);
                                console.log("@" + item.id);
                            });
                        setEditingKey('');
                    }
                    else {
                        newData.push(row);
                        setData(newData);
                        setEditingKey('');
                    }
                } catch (errInfo) {
                    console.log('Validate Failed:', errInfo);
                }
            }

            const columns = [
                {
                    title: 'Title',
                    dataIndex: 'title',
                    key: 'title',
                    width: '70%',
                    editable: true,
                    sorter: (a, b) => {
                        var titleA = a.get("title") ? a.get("title") : "";
                        var titleB = b.get("title") ? b.get("title") : "";
                        return titleA.localeCompare(titleB);
                    }, 
                    render: (text, record) => <span>{record.get("title")}</span>,
                },
                {
                    title: 'Track',
                    dataIndex: 'track',
                    width: '30%',
                    editable: true,
                    sorter: (a, b) => {
                        var trackA = a.get("track") ? a.get("track").get("name") : "";
                        var trackB = b.get("track") ? b.get("track").get("name") : "";
                        return trackA.localeCompare(trackB);
                    },   
                    render: (text,record) => <span>{record.get("track") ? record.get("track").get("name") : ""}</span>,
                    key: 'track',
                },
                {
                    title: 'Action',
                    //key: 'action',
                    dataIndex: 'action',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.items.length > 0) {
                            return editable ? (
                                <span>
                                    <a
                                        onClick={() => save(record.id)}
                                        style={{
                                            marginRight: 8
                                        }}
                                    >
                                        Save
                                    </a>
                                    <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
                                        <a>Cancel</a>
                                    </Popconfirm>
                                </span>
                            ) : (
                                <Space size="small">
                                    <a title="Edit" disabled={editingKey !== ''} onClick={() => edit(record)}>
                                        {<EditOutlined />}
                                    </a>
                                    <Popconfirm
                                        title="Are you sure delete this item?"
                                        onConfirm={()=>onDelete(record)}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                    <a title="Delete">{<DeleteOutlined />}</a>
                                    </Popconfirm>
                                </Space>
                            );
                        } else {
                            return null;
                        }
                    }
                },
            ];

            const mergedColumns = columns.map(col => {
                if (!col.editable) {
                    return col;
                }

                return {
                    ...col,
                    onCell: record => ({
                        record,
                        inputType: 'text',
                        dataIndex: col.dataIndex,
                        title: col.title,
                        editing: isEditing(record),
                    }),
                };
            });

            return (
                <Form form={form} component={false}>
                    <Table
                        components={{
                            body: {
                                cell: EditableCell,
                            },
                        }}
                        bordered
                        dataSource={this.state.searched ? this.state.searchResult : this.state.items}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        pagination={{ defaultPageSize: 500,
                            pageSizeOptions: [10, 20, 50, 100, 500], 
                            position: ['topRight', 'bottomRight']}}
                    />
                </Form>
            );
        };

        if (!this.props.downloaded)
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
                    <Input.Search/>
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
            <Input.Search
                allowClear
                onSearch={key => {
                        if (key == "") {
                            this.setState({searched: false});
                        }
                        else {
                            this.setState({searched: true});
                            this.setState({
                                searchResult: this.state.items.filter(
                                    item => 
                                        (item.get('title') && item.get('title').toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('track') && item.get('track').get("name").toLowerCase().includes(key.toLowerCase()))
                                    )
                            })
                        }
                    }
                }
            />
            <EditableTable/>
        </div>
    }

}

const
    AuthConsumer = (props) => (
        <ProgramContext.Consumer>
            {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
                <AuthUserContext.Consumer>
                    {value => (
                        <ProgramItems {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                    )}
                </AuthUserContext.Consumer>
            )}
        </ProgramContext.Consumer>

    );

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