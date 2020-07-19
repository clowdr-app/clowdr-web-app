import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tabs} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import moment from 'moment';
import * as timezone from 'moment-timezone';
import {DeleteOutlined, EditOutlined} from '@ant-design/icons';

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
            items: [],
            gotSessions: false,
            gotRooms: false,
            gotItems: false,
            editing: false,
            edt_session: undefined,
            searched: false,
            searchResult: ""
        };

        console.log('[Admin/Sessions]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded)
            this.props.onDown(this.props);
        else {
            this.state.rooms = this.props.rooms;
            this.state.sessions = this.props.sessions;
            this.state.items = this.props.items;
        }
    }


    async onCreate(values) {
        console.log("OnCreate! " + values.title);
        var _this = this;
        let room = this.state.rooms.find(r => r.get('name') == values.room);
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
        session.set("items", values.items);
        session.set("confKey", Math.floor(Math.random() * 10000000).toString());

        let acl = new Parse.ACL();
        acl.setPublicWriteAccess(true);
        acl.setPublicReadAccess(true);
        acl.setRoleWriteAccess(this.props.auth.currentConference.id+"-manager", true);
        acl.setRoleWriteAccess(this.props.auth.currentConference.id+"-admin", true);
        session.setACL(acl);
        session.save()
            .then(session => this.setState({visible: false /*, sessions: sortedSessions*/}))
            .catch(err => {
                console.log(err);
                console.log("@" + session.id);
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



    onUpdate(values) {
        var _this = this;
        console.log("Updating session " + values.title);
        let session = this.state.sessions.find(s => s.id == values.objectId);

        if (session) {
            console.log(session);

            session.set("title", values.title);
            session.set("startTime", values.startTime.toDate());
            session.set("endTime", values.endTime.toDate());
            session.set("items", values.items);
            let room = this.state.rooms.find(r => r.id == values.room);
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
            if (this.state.gotRooms && this.state.gotSessions && this.state.gotItems) {
                console.log('[Admin/Sessions]: Program download complete');
                this.setState({
                    rooms: this.props.rooms,
                    sessions: this.props.sessions,
                    items: this.props.items,
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
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true});
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
            if (prevProps.items.length != this.props.items.length) {
                this.setState({items: this.props.items});
                console.log('[Admin/Sessions]: changes in items')
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

    render() {
        console.log("Loading Editable Cell");
        const myItemTitles = [];
        this.state.items.map(item => {
            console.log(item)
        });

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
                    inputNode = <DatePicker showTime />;
                    break;
                case ('end'):
                    inputNode = <DatePicker showTime/>;
                    break;
                case ('room'):
                    inputNode = (
                        <Select placeholder="Choose the room" style={{ width: 400 }} >
                            {this.state.rooms.map(r => (
                                <Option key={r.id} value={r.id}>{r.get('name')}</Option>
                            ))}
                        </Select>
                    );
                    break;
                case ('items'):
                    console.log('ITEMS CELL!!!');
                    console.log(myItemTitles);

                    inputNode = (
                        <Select
                            showSearch
                            mode="multiple"
                            style={{ width: 200 }}
                            placeholder="Select a person"
                            optionFilterProp="children"
                            onChange={onChange}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onSearch={onSearch}
                            filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            {this.state.items.map(it => (
                                <Option key={it.id} value={it.id}>{it.get('title')}</Option>
                            ))}
                        </Select>
                    // <Select placeholder="Choose the item" style={{ width: 400 }} >
                    //     {this.state.items.map(r => (
                    //         <Option key={r.id} value={r.get('title')}>{r.get('title')}</Option>
                    //     ))}
                    // </Select>
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
                            rules={[
                                {
                                    required: true,
                                    message: `Please Input ${title}!`,
                                },
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

        // set up editable table
        const EditableTable = () => {
            console.log("Loading Editable table");
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.sessions);
            const [editingKey, setEditingKey] = useState('');

            const isEditing = record => record.id === editingKey;

            const edit = record => {
                console.log("record being edited is " + record.get("title"));
                console.log(JSON.stringify(record));
                console.log("Start time is =============> " + record.get("startTime"));
                form.setFieldsValue({
                    title: record.get("title") ? record.get("title") : "",
                    // start: record.get("startTime") ? record.get("startTime") : "",
                    start:  "",
                    end: "",
                    // end: record.get("endTime") ? record.get("endTime") : "",
                    room: record.get("room") ? record.get("room").get("name") : "",
                    items:  record.get("items") && record.get("items").length > 0 ? record.get("items")[0].get("title") : ""
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
                        console.log("row is : " + row.title);
                        let newRoom = this.state.rooms.find(t => t.id === row.room);
                        if (newRoom) {
                            console.log("Room found. Updating");
                            item.set("room", newRoom)
                        } else {
                            console.log("Room not found");
                        }
                        let newItems = [];
                        for (let item of row.items) {
                            let newItem = this.state.items.find(t => t.id === item);
                            if (newItem) {
                                newItems.push(newItem);
                            } else {
                                console.log("Item "  + item + " not found");
                            }

                        }
                        console.log("newITEMS are ####++++++++ " + newItems);

                        item.set("title", row.title);
                        item.set("startTime", row.start.toDate());
                        item.set("endTime", row.end.toDate());
                        item.set("items", newItems);
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
            };

            const columns = [
                {
                    title: 'Title',
                    dataIndex: 'title',
                    key: 'title',
                    width: '20%',
                    editable: true,
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
                    width: '12%',
                    editable: true,
                    sorter: (a, b) => {
                        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
                        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
                        return timeA > timeB;
                    },
                    render: (text,record) => <span>{timezone(record.get("startTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z")}</span>,
                    key: 'start',
                },
                {
                    title: 'End Time',
                    dataIndex: 'end',
                    width: '12%',
                    editable: true,
                    sorter: (a, b) => {
                        var timeA = a.get("endTime") ? a.get("endTime") : new Date();
                        var timeB = b.get("endTime") ? b.get("endTime") : new Date();
                        return timeA > timeB;
                    },
                    render: (text,record) => <span>{timezone(record.get("endTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z")}</span>,
                    key: 'end',
                },
                {
                    title: 'Room',
                    dataIndex: 'room',
                    width: '12%',
                    editable: true,
                    sorter: (a, b) => {
                        var roomA = a.get("room") ? a.get("room").get("name") : "";
                        var roomB = b.get("room") ? b.get("room").get("name") : "";
                        return roomA.localeCompare(roomB);
                    },
                    render: (text,record) => <span>{record.get("room") ? record.get("room").get('name') : "NO SUCH DATA"}</span>,
                    key: 'room',
                },
                {
                    title: 'Items',
                    dataIndex: 'items',
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
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.sessions.length > 0) {
                            return editable ? (
                                <span>
                                <a
                                    onClick={() => save(record.id)}
                                    style={{
                                        marginRight: 8,
                                    }}
                                >
                                    Save
                                </a>
                                <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
                                    <a>Cancel</a>
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.sessions}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        pagination={{
                            onChange: cancel,
                        }}
                    />
                </Form>
            );
        };

        if (!this.props.downloaded)
            return (
                <Spin tip="Loading...">
                </Spin>);

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
                        items={this.state.items}
                        myItems={this.state.edt_session.items ? this.state.edt_session.items : []}
                    />
                    <Input.Search/>

                </Fragment>
            );
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
                items={this.state.items}
                myItems={[]}
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
                            searchResult: this.state.sessions.filter(
                                session => (session.get('title') && session.get('title').toLowerCase().includes(key.toLowerCase()))
                                    || (session.get('startTime') && timezone(session.get("startTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z").toLowerCase().includes(key.toLowerCase()))
                                    || (session.get('endTime') && timezone(session.get("endTime")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z").toLowerCase().includes(key.toLowerCase()))
                                    || (session.get('items') && session.get('items').some((element) => element.get('title').toLowerCase().includes(key)))
                                    || (session.get('room') && session.get('room').get('name').toLowerCase().includes(key.toLowerCase())))
                        })
                    }
                }
                }
            />
            <EditableTable/>
        </div>
    }

}

const AuthConsumer = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ProgramSessions {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>

);
export default AuthConsumer;

const CollectionEditForm = ({title, visible, data, onAction, onCancel, rooms, items, myItems}) => {
    const [form] = Form.useForm();
    const myItemTitles = [];
    myItems.map(item => {
        myItemTitles.push(item.get('title'));
    })
    console.log("total number of items is: " + items.length);
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

                <Form.Item
                    label="Current items"
                >
                    <Space>
                        <Select
                            placeholder="Choose a current item"
                            style={{ width: 400 }}
                            defaultValue={myItemTitles.length > 0 ? myItemTitles[0]: []}
                        >
                            {myItems.map(item => (
                                <Option
                                    key={item.id}
                                    value={item.get('title')}
                                >
                                    {item.get('title')}
                                </Option>
                            ))}
                        </Select>
                        <a href="#" title="Edit" >{<EditOutlined />}</a>

                        <Popconfirm
                            title="Are you sure to delete this item?"
                            okText="Yes"
                            cancelText="No"
                        >
                            <a href="#" title="Delete">{<DeleteOutlined />}</a>
                        </Popconfirm>
                    </Space>

                </Form.Item>

                <Form.Item
                    label="Add new items"
                >
                    <Select
                        placeholder="Choose new items"
                        style={{ width: 400 }}
                        defaultValue={[]}
                        mode="multiple"
                        optionLabelProp="label"
                    >
                        {items.map(item => {
                            if (!myItemTitles.includes(item.get('title'))) {
                                return <Option
                                    key={item.id}
                                    value={item.get('title')}
                                    label = {item.get('title').length > 5 ? item.get('title').substring(0, 5)+"..." : item.get('title')}>
                                    {item.get('title')}
                                </Option>
                            }
                        })}
                    </Select>
                </Form.Item>

                <Form.Item name="room" label="Room"
                           rules={[
                               {
                                   required: true,
                                   message: 'Please input the room the session!',
                               },
                           ]}
                >
                    <Select placeholder="Choose the room" style={{ width: 400 }} >
                        {rooms.map(r => (
                            <Option key={r.id}>{r.get('name')}</Option>
                        ))}
                    </Select>
                </Form.Item>

            </Form>
        </Modal>
    );
};