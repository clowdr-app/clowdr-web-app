import React, { useState } from 'react';
import { Button, DatePicker, Form, Input, Popconfirm, Select, Space, Spin, Table } from "antd";
import Parse from "parse";
import { AuthUserContext } from "../../../Session";
import { DeleteOutlined, EditOutlined, SaveTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { ClowdrState, EditableCellProps } from "../../../../ClowdrTypes";
import { SelectValue } from "antd/es/select";
import { Store } from 'antd/lib/form/interface';
import assert from 'assert';
import {
    ProgramSession,
    ProgramRoom,
    ProgramItem
} from "../../../../classes/ParseObjects";
var moment = require('moment');
var timezone = require('moment-timezone');

// const {TabPane} = Tabs;
// const IconText = ({icon, text}) => (
//     <Space>
//         {React.createElement(icon)}
//         {text}
//     </Space>
// );

interface ProgramSessionsProps {
    auth: ClowdrState;
}

interface ProgramSessionsState {
    loading: boolean;
    toggle: boolean;
    searched: boolean;
    ProgramSessions: ProgramSession[];
    ProgramRooms: ProgramRoom[];
    ProgramItems: ProgramItem[];
    searchResult: ProgramSession[];
    alert: string;
    visible: boolean
}

class ProgramSessions extends React.Component<ProgramSessionsProps, ProgramSessionsState> {
    constructor(props: ProgramSessionsProps) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: true,
            toggle: false,
            searched: false,
            ProgramSessions: [],
            ProgramRooms: [],
            ProgramItems: [],
            searchResult: [],
            alert: "",
            visible: false
        };
    }

    setVisible() {
        this.setState({ 'visible': !this.state.visible });
    }

    async componentDidMount() {
        let [sessions, rooms, items] = await Promise.all([
            this.props.auth.programCache.getProgramSessions(this),
            this.props.auth.programCache.getProgramRooms(this),
            this.props.auth.programCache.getProgramItems(this),
        ]);
        this.setState({
            ProgramSessions: sessions,
            ProgramRooms: rooms,
            ProgramItems: items,
            loading: false
        });
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramSession", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramItem", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramRoom", this, undefined);
    }

    onCreate = () => {
        assert(this.props.auth.currentConference, "Current conference is null");

        let data: object = {
            clazz: "ProgramSession",
            conference: { clazz: "ClowdrInstance", id: this.props.auth.currentConference.id },
            title: "***NEWLY ADDED SESSION***",
            items: [],
            confKey: Math.floor(Math.random() * 10000000).toString()
        }

        Parse.Cloud.run("create-obj", data)
            .then(() => {
                console.log("[Admin/Sessions]: sent new object to cloud");
                this.setVisible();
            })
            .catch((err: Error) => {
                this.setState({ alert: "add error" })
                console.log("[Admin/Sessions]: Unable to create: " + err)
            })
    }

    render() {
        if (this.state.loading)
            return <Spin />

        const { Option } = Select;
        function onChange(value: SelectValue) {
            console.log(`selected ${value}`);
        }

        function onBlur() {
            console.log('blur');
        }

        function onFocus() {
            console.log('focus');
        }

        function onSearch(val: string) {
            console.log('search:', val);
        }

        // Set up editable table cell
        const EditableCell: React.FC<EditableCellProps<ProgramSession>> =
            ({ editing, dataIndex, title, inputType,
                record, index, children,
                ...restProps }): JSX.Element => {
                let inputNode: JSX.Element | null;
                switch (dataIndex) {
                    case ('title'):
                        inputNode = <Input />;
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
                                    <Option key={r.id} value={r.name}>{r.name}</Option>
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
                                filterOption={(input: string, option: any): boolean =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {this.state.ProgramItems.map((it): JSX.Element => (
                                    <Option key={it.id} value={it.id}>{it.title}</Option>
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
                                    [{ required: true, message: `Please Input ${title}!` }] : []}
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

            const isEditing = (record: ProgramSession): boolean => record.id === editingKey;

            const edit = (record: ProgramSession): void => {
                let currentItems: string[] = [];
                if (record.items) {
                    record.items.forEach((a) => {
                        currentItems.push(a.id);
                    })
                }
                form.setFieldsValue({
                    title: record.title ? record.title : "",
                    start: record.startTime ? moment(record.startTime) : "",
                    end: record.endTime ? moment(record.endTime) : "",
                    room: record.room ? record.room.name : "",
                    items: currentItems
                });
                setEditingKey(record.id);
            };

            const cancel = (): void => {
                setEditingKey('');
            };

            const onDelete = (record: ProgramSession): void => {
                console.log("deleting session: " + record.title);
                // delete from database
                let data: object = {
                    clazz: "ProgramSession",
                    conference: { clazz: "ClowdrInstance", id: record.conference.id },
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                    .then(() => this.setState({
                        alert: "delete success",
                        searchResult: this.state.searched ? this.state.searchResult.filter(r => r.id !== record.id) : []
                    }))
                    .catch((err: Error) => {
                        this.setState({ alert: "delete error" })
                        console.log("[Admin/Sessions]: Unable to delete: " + err)
                    })
            };

            const save = async (id: string) => {
                console.log("Entering save func");
                try {
                    const row: Store = await form.validateFields();
                    const newData = [...data];
                    let session = newData.find(s => s.id === id);

                    if (session) {
                        let newRoom: Parse.Object | undefined = this.state.ProgramRooms.find(t => t.name === row.room);
                        let newItems: Parse.Object[] = [];
                        for (let item of row.items) {
                            let newItem: Parse.Object | undefined = this.state.ProgramItems.find(t => t.id === item);
                            if (newItem) {
                                newItems.push(newItem);
                            } else {
                                console.log("Item " + item + " not found");
                            }
                        }

                        let data = {
                            clazz: "ProgramSession",
                            conference: { clazz: "ClowdrInstance", id: session.conference.id },
                            id: session.id,
                            title: row.title,
                            startTime: row.start.toDate(),
                            endTime: row.end.toDate(),
                            room: row.room,
                            items: row.items  // item CANNOT be null
                        }
                        if (newRoom) {
                            console.log("Room found. Updating");
                            data.room = { clazz: "ProgramRoom", id: newRoom.id }
                        }
                        if (newItems.length > 0)
                            data.items = newItems.map((i: Parse.Object) => { return { clazz: "ProgramItem", id: i.id } })
                        Parse.Cloud.run("update-obj", data)
                            .then(() => {
                                this.setState({ alert: "save success" });
                            })
                            .catch((err: Error) => {
                                this.setState({ alert: "save error" });
                                console.log("[Admin/Sessions]: Unable to save: " + err);
                            })
                        setData(newData);
                        setEditingKey('');
                    }
                    else {
                        // TODO: This is completely unsafe - this will result in errors,
                        // the logic around adding items needs fixing here. We should create
                        // but not commit the new configuration, rather than storing the form
                        // data directly
                        // @ts-ignore
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
                    // defaultSortOrder: 'ascend',
                    sorter: (a: ProgramSession, b: ProgramSession) => {
                        let titleA: string = a.title ? a.title : "";
                        let titleB: string = b.title ? b.title : "";
                        return titleA.localeCompare(titleB);
                    },
                    render: (_: string, record: ProgramSession): JSX.Element => <span>{record.title}</span>,
                },
                {
                    title: 'Start Time',
                    dataIndex: 'start',
                    width: '15%',
                    editable: true,
                    sorter: (a: ProgramSession, b: ProgramSession) => {
                        let timeA = a.startTime ? a.startTime : 0;
                        let timeB = b.startTime ? b.startTime : 0;
                        return timeA < timeB ? -1 : timeA === timeB ? 0 : 1;
                    },
                    render: (_: string, record: ProgramSession): JSX.Element => <span>{record.startTime ? timezone(record.startTime).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z") : ""}</span>,
                    key: 'start',
                },
                {
                    title: 'End Time',
                    dataIndex: 'end',
                    width: '15%',
                    editable: true,
                    sorter: (a: ProgramSession, b: ProgramSession) => {
                        let timeA = a.endTime ? a.endTime : 0;
                        let timeB = b.endTime ? b.endTime : 0;
                        return timeA < timeB ? -1 : timeA === timeB ? 0 : 1;
                    },
                    render: (_: string, record: ProgramSession): JSX.Element => <span>{record.endTime ? timezone(record.endTime).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z") : ""}</span>,
                    key: 'end',
                },
                {
                    title: 'Room',
                    dataIndex: 'room',
                    width: '15%',
                    editable: true,
                    sorter: (a: ProgramSession, b: ProgramSession) => {
                        const roomA = a.room && a.room.name ? a.room.name : " ";
                        const roomB = b.room && b.room.name ? b.room.name : " ";
                        return roomA.localeCompare(roomB);
                    },
                    render: (_: string, record: ProgramSession): JSX.Element => <span>{record.room ? record.room.name : ""}</span>,
                    key: 'room',
                },
                {
                    title: 'Items',
                    dataIndex: 'items',
                    width: '25%',
                    editable: true,
                    render: (_: string, record: ProgramSession): JSX.Element => {
                        if (record.items) {
                            return <ul>{
                                record.items.map((item) => (
                                    <li key={item.id}>
                                        {item.title}
                                    </li>
                                ))
                            }</ul>
                        }
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
                    render: (_: string, record: ProgramSession): JSX.Element | null => {
                        const editable: boolean = isEditing(record);
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
                                        <a title="Edit" onClick={() => { if (editingKey === '') edit(record) }}>
                                            {/*<a title="Edit" disabled={editingKey !== ''} onClick={() => edit(record)}>*/}
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
                    onCell: (record: ProgramSession) => ({
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
                <table style={{ width: "100%" }}>
                    <tbody>
                        <tr>
                            <td width='100%'>
                                <Input.Search
                                    allowClear
                                    onSearch={(key: string) => {
                                        if (key === "") {
                                            this.setState({ searched: false });
                                        } else {
                                            this.setState({ searched: true });
                                            this.setState({
                                                searchResult: this.state.ProgramSessions.filter(
                                                    session => (session.title && session.title.toLowerCase().includes(key.toLowerCase()))
                                                        || (session.startTime && session.startTime.toString().toLowerCase().includes(key.toLowerCase()))
                                                        || (session.endTime && session.endTime.toString().toLowerCase().includes(key.toLowerCase()))
                                                        || (session.items && session.items.some((element) => element.title && element.title.toLowerCase().includes(key)))
                                                        || (session.room && session.room.name && session.room.name.toLowerCase().includes(key.toLowerCase())))
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
                <EditableTable />
            </div>
        );
    }
}

const AuthConsumer = (props: ProgramSessionsProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :  // @ts-ignore  TS: Can value really be null here?
            <ProgramSessions {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
