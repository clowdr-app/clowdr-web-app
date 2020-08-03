import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import * as timezone from 'moment-timezone';
import {DeleteOutlined, EditOutlined, SaveTwoTone, CloseCircleTwoTone} from '@ant-design/icons';
import moment from "moment";

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
            searched: false,
            searchResult: ""
        };
    }




    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    async componentDidMount() {
        let [sessions, rooms, items]= await Promise.all([
            this.props.auth.programCache.getProgramSessions(this),
            this.props.auth.programCache.getProgramRooms(this),
            this.props.auth.programCache.getProgramItems(this),
        ]);
        this.setState({
            ProgramSessions: sessions,
            ProgramRooms: rooms,
            ProgramItems: items,
            loading: false});
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramSession", this);
        this.props.auth.programCache.cancelSubscription("ProgramItem", this);
        this.props.auth.programCache.cancelSubscription("ProgramRoom", this);
    }

    onCreate = () => {

        let data = {
            clazz: "ProgramSession",
            conference: {clazz: "ClowdrInstance", id: this.props.auth.currentConference.id},
            title: "***NEWLY ADDED SESSION***",
            items: [],
            confKey: Math.floor(Math.random() * 10000000).toString()
        }

        Parse.Cloud.run("create-obj", data)
            .then(t => {
                console.log("[Admin/Sessions]: sent new object to cloud");
                this.setVisible();
            })
            .catch(err => {
                this.setState({alert: "add error"})
                console.log("[Admin/Sessions]: Unable to create: " + err)
            })
    }

    render() {
        if(this.state.loading)
            return <Spin />

        const {Option} = Select;
        function onChange(value) {
            console.log(`selected ${value}`);
        }

        function onBlur() {
            console.log('blur');
        }

        function onFocus() {
            console.log('focus');
        }

        function onSearch(val) {
            console.log('search:', val);
        }

        // Set up editable table cell
        const EditableCell = ({editing, dataIndex, title, inputType, record, index, children, ...restProps}) => {
            let inputNode = null;
            switch (dataIndex) {
                case ('title'):
                    inputNode = <Input/>;
                    break;
                case ('start'):
                    inputNode = <DatePicker showTime={{ format: 'HH:mm' }} />;
                    break;
                case ('end'):
                    inputNode = <DatePicker showTime={{ format: 'HH:mm' }} />;
                    break;
                case ('room'):
                    inputNode = (
                        <Select placeholder="Choose the room" >
                            {this.state.ProgramRooms.map(r => (
                                <Option key={r.id} value={r.get('name')}>{r.get('name')}</Option>
                            ))}
                        </Select>
                    );
                    break;
                case ('items'):
                    inputNode = (
                        <Select
                            showSearch
                            mode="multiple"
                            placeholder="Select an item"
                            optionFilterProp="children"
                            onChange={onChange}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onSearch={onSearch}
                            filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            {this.state.ProgramItems.map(it => (
                                <Option key={it.id} value={it.id}>{it.get('title')}</Option>
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
                            style={{
                                margin: 0,
                            }}
                            rules={dataIndex === 'title' ?
                                [{required: true, message: `Please Input ${title}!`}] : []}
                        >
                            {inputNode}
                        </Form.Item>
                    ) : (
                        children
                    )}
                </td>
            );
        };

        // set up editable table
        const EditableTable = () => {
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.ProgramSessions);
            const [editingKey, setEditingKey] = useState('');

            const isEditing = record => record.id === editingKey;

            const edit = record => {
                let currentItems = [];
                if (record.get("items")) {
                    record.get("items").map(a => {
                        currentItems.push(a.id);
                    })
                }
                form.setFieldsValue({
                    title: record.get("title") ? record.get("title") : "",
                    start: record.get("startTime") ? moment(record.get("startTime")) : "",
                    end: record.get("endTime") ? moment(record.get("endTime")) : "",
                    room: record.get("room") ? record.get("room").get("name") : "",
                    items:  currentItems
                });
                setEditingKey(record.id);
            };

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                console.log("deleting session: " + record.get("title"));
                // delete from database
                let data = {
                    clazz: "ProgramSession",
                    conference: {clazz: "ClowdrInstance", id: record.get("conference").id},
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                .then(c => this.setState({
                    alert: "delete success",
                    searchResult: this.state.searched ?  this.state.searchResult.filter(r => r.id !== record.id): ""
                }))
                .catch(err => {
                    this.setState({alert: "delete error"})
                    console.log("[Admin/Sessions]: Unable to delete: " + err)
                })
            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let session = newData.find(s => s.id === id);

                    if (session) {
                        let newRoom = this.state.ProgramRooms.find(t => t.get('name') === row.room);
                        let newItems = [];
                        for (let item of row.items) {
                            let newItem = this.state.ProgramItems.find(t => t.id === item);
                            if (newItem) {
                                newItems.push(newItem);
                            } else {
                                console.log("Item "  + item + " not found");
                            }
                        }

                        let data = {
                            clazz: "ProgramSession",
                            conference: {clazz: "ClowdrInstance", id: session.get("conference").id},
                            id: session.id,
                            title: row.title,
                            startTime: row.start.toDate(),
                            endTime: row.end.toDate()
                        }
                        if (newRoom) {
                            console.log("Room found. Updating");
                            data.room = {clazz: "ProgramRoom", id: newRoom.id}
                        } 
                        if (newItems.length > 0)
                            data.items = newItems.map(i => {return {clazz: "ProgramItem", id: i.id}})

                        Parse.Cloud.run("update-obj", data)
                        .then(c => {
                            this.setState({alert: "save success"});
                        })
                        .catch(err => {
                            this.setState({alert: "save error"});
                            console.log("[Admin/Sessions]: Unable to save: " + err);
                        })

                        setData(newData);
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
            };

            const columns = [
                {
                    title: 'Title',
                    dataIndex: 'title',
                    key: 'title',
                    width: '30%',
                    editable: true,
                    defaultSortOrder: 'ascend',
                    sorter: (a, b) => {
                        var titleA = a.get("title") ? a.get("title") : "";
                        var titleB = b.get("title") ? b.get("title") : "";
                        return titleA.localeCompare(titleB);
                    },
                    render: (text, record) => <span>{record.get("title")}</span>,
                },
                {
                    title: 'Start Time',
                    dataIndex: 'start',
                    width: '15%',
                    editable: true,
                    sorter: (a, b) => {
                        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
                        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
                        return timeA > timeB;
                    },
                    render: (text,record) => <span>{record.get("startTime") ? timezone(record.get("startTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z") : ""}</span>,
                    key: 'start',
                },
                {
                    title: 'End Time',
                    dataIndex: 'end',
                    width: '15%',
                    editable: true,
                    sorter: (a, b) => {
                        var timeA = a.get("endTime") ? a.get("endTime") : new Date();
                        var timeB = b.get("endTime") ? b.get("endTime") : new Date();
                        return timeA > timeB;
                    },
                    render: (text,record) => <span>{record.get("endTime") ? timezone(record.get("endTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z") : ""}</span>,
                    key: 'end',
                },
                {
                    title: 'Room',
                    dataIndex: 'room',
                    width: '15%',
                    editable: true,
                    sorter: (a, b) => {
                        const roomA = a.get("room") && a.get("room").get("name") ? a.get("room").get("name") : " ";
                        const roomB = b.get("room") && b.get("room").get("name") ? b.get("room").get("name") : " ";
                        return roomA.localeCompare(roomB);
                    },
                    render: (text,record) => <span>{record.get("room") ? record.get("room").get('name') : ""}</span>,
                    key: 'room',
                },
                {
                    title: 'Items',
                    dataIndex: 'items',
                    width: '25%',
                    editable: true,
                    render: (text,record) => {
                        if (record.get("items")) {
                            return <ul>{
                                record.get("items").map(item => (
                                    <li key={item.id}>
                                        {item.get('title')}
                                    </li>
                                ))
                            }</ul>}
                        else {
                            return <p>NO SUCH THING</p>
                        }
                    },
                    key: 'items',
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    // width: '10%',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.ProgramSessions.length > 0) {
                            return editable ? (
                                <span>
                                <a
                                    onClick={() => save(record.id)}
                                    style={{
                                        marginRight: 8,
                                    }}
                                >
                                    {<SaveTwoTone />}
                                </a>
                                <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
                                    <a>{<CloseCircleTwoTone />}</a>
                                </Popconfirm>
                            </span>
                            ) : (
                                <Space size='small'>
                                    <a title="Edit" disabled={editingKey !== ''} onClick={() => edit(record)}>
                                        {<EditOutlined />}
                                    </a>
                                    <Popconfirm
                                        title="Are you sure delete this session?"
                                        onConfirm={() => onDelete(record)}
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

                    },
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.ProgramSessions}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        rowKey='id'
                        pagination={{
                            onChange: cancel,
                        }}
                    />
                </Form>
            );
        };



        return (
            <div>
                <table style={{width: "100%"}}>
                    <tbody>
                    <tr>
                        <td width='100%'>
                            <Input.Search
                                allowClear
                                onSearch={key => {
                                    if (key == "") {
                                        this.setState({searched: false});
                                    } else {
                                        this.setState({searched: true});
                                        this.setState({
                                            searchResult: this.state.ProgramSessions.filter(
                                                session => (session.get('title') && session.get('title').toLowerCase().includes(key.toLowerCase()))
                                                    || (session.get('startTime') && session.get('startTime').toString().toLowerCase().includes(key.toLowerCase()))
                                                    || (session.get('endTime') && session.get('endTime').toString().toLowerCase().includes(key.toLowerCase()))
                                                    || (session.get('items') && session.get('items').some((element) => element.get('title') && element.get('title').toLowerCase().includes(key)))
                                                    || (session.get('room') && session.get('room').get('name') && session.get('room').get('name').toLowerCase().includes(key.toLowerCase())))
                                        })
                                    }
                                }}
                            />
                        </td>
                        <td>
                            <Button
                                type="primary"
                                onClick={() => this.onCreate()}
                            >
                                New session
                            </Button>
                        </td>
                    </tr>
                    </tbody>
                </table>
                <EditableTable/>
            </div>
        );
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramSessions {...props} auth={value}  />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
