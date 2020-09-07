import React, { useState } from 'react';
import {
    Alert,
    Button,
    Checkbox,
    DatePicker,
    Form,
    Input,
    message,
    Popconfirm,
    Select,
    Space,
    Spin,
    Table,
    Upload
} from "antd";
import { CloseCircleTwoTone, DeleteOutlined, EditOutlined, SaveTwoTone, UploadOutlined } from '@ant-design/icons';
import Parse from "parse";
import { AuthUserContext } from "../../../Session";
import { ClowdrState, EditableCellProps } from "../../../../ClowdrTypes";
import { RcFile, UploadChangeParam } from "antd/lib/upload/interface";
import { Store } from 'antd/lib/form/interface';
import assert from 'assert';
import { ProgramRoom, ZoomRoom, ZoomHostAccount } from "../../../../classes/ParseObjects";
var moment = require('moment');
var timezone = require('moment-timezone');

interface ProgramRoomsProps {
    auth: ClowdrState;
}

interface ProgramRoomsState {
    loading: boolean;
    editing: boolean;
    edt_room: Object | undefined;
    searched: boolean;
    ProgramRooms: ProgramRoom[];
    searchResult: ProgramRoom[];
    alert: string;
    visible: boolean;
    ZoomHostAccounts: ZoomHostAccount[];
    ZoomRooms: ZoomRoom[];
}

const liveRoomSources: string[] = ['YouTube', 'Twitch', 'Facebook', 'iQIYI', 'ZoomUS', 'ZoomCN'];

class Rooms extends React.Component<ProgramRoomsProps, ProgramRoomsState> {
    constructor(props: ProgramRoomsProps) {
        super(props);
        this.state = {
            loading: true,
            editing: false,
            edt_room: undefined,
            searched: false,
            searchResult: [],
            alert: "",
            ProgramRooms: [],
            visible: false,
            ZoomHostAccounts: [],
            ZoomRooms: []
        };
    }

    onDelete(value: any) {  // no usage?
        console.log("Deleting " + value + " " + value.name);
        // Delete the watchers first
        value.destroy();
    }

    setVisible() {  // no usage
        this.setState({ 'visible': !this.state.visible });
    }

    async componentDidMount() {
        let [rooms] = await Promise.all([this.props.auth.programCache.getProgramRooms(this),
        ]);
        this.setState({ ProgramRooms: rooms, loading: false });
    }

    onChange(info: UploadChangeParam) {
        console.log("onChange " + info.file.status);
        if (info.file.status !== 'uploading') {
            console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            console.log("Upload failed");
            message.error(`${info.file.name} file upload failed.`);
        }
    }

    beforeUpload(file: RcFile, _: any) {
        let uploadLoading = message.loading({content: "Uploading rooms"})
        const reader: FileReader = new FileReader();
        reader.onload = () => {
            assert(this.props.auth.currentConference, "Current conference is null.");

            const data = { content: reader.result, conference: this.props.auth.currentConference.id };
            Parse.Cloud.run("rooms-upload", data).then(
                // () => this.refreshList()
                ()=>{
                    uploadLoading();
                    message.success({content: "Uploaded data. Please refresh this page to view new data."})
                }
            );
        }
        reader.readAsText(file);
        return false;
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramRoom", this, undefined);
    }

    render() {
        const { Option } = Select;

        // set up editable cell
        const EditableCell: React.FC<EditableCellProps<ProgramRoom>>
            = ({ editing, dataIndex, title,
                inputType, record, index, children,
                ...restProps }): JSX.Element => {
                let inputNode: JSX.Element | null;
                switch (dataIndex) {
                    case ('name'):
                        inputNode = <Input placeholder="Name" />;
                        break;
                    case ('src1'):
                        inputNode = (
                            <Select
                                showSearch
                                placeholder="Select a Main Channel"
                                optionFilterProp="children"
                                dropdownMatchSelectWidth={false}
                                filterOption={(input: string, option: any) =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                <Option key="managed" value="">--CLOWDR Managed Zoom Accounts--</Option>
                                {this.state.ZoomHostAccounts.sort((a, b) => a.name
                                    .localeCompare(b.name)).map((account): JSX.Element => (<Option key={account.id} value={"managed-" + account.id}>Zoom {account.name}</Option>))

                                }
                                <Option key="other" value="">--Other sources--</Option>
                                {liveRoomSources.map((src: string) => {
                                    return (
                                        <Option value={src} key={src}>{src}</Option>
                                    );
                                })}

                            </Select>
                        );
                        break;
                    case ('id1'):
                        inputNode = <Input style={{ width: '100%' }} type="textarea" placeholder="ID" />
                        break;
                    case ('pwd1'):
                        inputNode =
                            <Input style={{ width: '100%' }} type="text" placeholder="Password (Optional)" />
                        break;
                    case ('src2'):
                        inputNode = (
                            <Select
                                showSearch
                                placeholder="Select an Alt Channel"
                                optionFilterProp="children"
                                filterOption={(input: string, option: any): boolean =>
                                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                }
                            >
                                {liveRoomSources.map((src: string) => {
                                    return (
                                        <Option value={src} key={src}>{src}</Option>
                                    );
                                })}

                            </Select>
                        );
                        break;
                    case ('id2'):
                        inputNode = <Input style={{ width: '100%' }} type="textarea" placeholder="ID" />
                        break;
                    case ('pwd2'):
                        inputNode =
                            <Input style={{ width: '100%' }} type="text" placeholder="Password (Optional)" />
                        break;
                    case ('qa'):
                        inputNode = <Input placeholder="Q&A tool link" />
                        break;
                    default:
                        inputNode = <span>{dataIndex}</span>;
                        break;
                }
                return (
                    <td {...restProps}>
                        {editing ? (
                            <Form.Item
                                valuePropName={dataIndex === 'requireRegistration' ? "checked" : "value"}
                                name={dataIndex}
                                style={{ margin: 0, }}
                                rules={dataIndex !== "name" ? [] : [
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
        const EditableTableForUncontrolledRooms = () => {
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.ProgramRooms);
            const [editingKey, setEditingKey] = useState('');

            const isEditing = (record: ProgramRoom): boolean => record.id === editingKey;

            const edit = (record: ProgramRoom) => {
                form.setFieldsValue({
                    name: record.name ? record.name : "",
                    src1: record.src1 ? record.src1 : "",
                    id1: record.id1 ? record.id1 : "",
                    pwd1: record.pwd1 ? record.pwd1 : "",
                    src2: record.src2 ? record.src2 : "",
                    id2: record.id2 ? record.id2 : "",
                    pwd2: record.pwd2 ? record.pwd2 : "",
                    qa: record.qa ? record.qa : ""
                });
                console.log("setting editing key state", record.id);
                setEditingKey(record.id);
                console.log("editing key state done");
            };

            const cancel = (): void => {
                setEditingKey('');
            };

            const onDelete = (record: ProgramRoom) => {
                console.log("deleting item: " + record.name);
                const newRooms: ProgramRoom[] = [...this.state.ProgramRooms];
                this.setState({
                    ProgramRooms: newRooms.filter((item: ProgramRoom): boolean => item.id !== record.id)
                });
                // delete from database
                let data = {
                    clazz: "ProgramRoom",
                    conference: { clazz: "ClowdrInstance", id: record.conference.id },
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                    .then(() => this.setState({ alert: "delete success" }))
                    .catch((err: Error) => {
                        this.setState({ alert: "delete error" })
                        // this.refreshList();
                        console.log("[Admin/Rooms]: Unable to delete: " + err)
                    })
            };

            const save = async (id: string) => {
                try {
                    const row: Store = await form.validateFields();
                    const newData: ProgramRoom[] = [...data];
                    let room: ProgramRoom | undefined = newData.find(item => item.id === id);

                    if (room) {
                        room.set("src1", row.src1);
                        room.set("id1", row.id1);
                        room.set("pwd1", row.pwd1);
                        room.set("src2", row.src2);
                        room.set("id2", row.id2);
                        room.set("pwd2", row.pwd2);
                        room.set("name", row.name);

                        room.set("qa", row.qa);
                        room.save().then(() => {
                            message.success("Saved room");
                        }).catch((err: Error) => {
                            console.log(err + ": " + row.objectId);
                            message.error("Unable to save room");
                        })
                        setEditingKey('');
                    } else {
                        newData.push(row as ProgramRoom);
                        setData(newData);
                        setEditingKey('');
                    }
                } catch (errInfo) {
                    console.log('Validate Failed:', errInfo);
                }
            };

            const columns = [
                {
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                    width: '10%',
                    editable: true,
                    // defaultSortOrder: 'ascend',
                    sorter: (a: ProgramRoom, b: ProgramRoom) => {
                        let nameA: string = a.name ? a.name : "";
                        let nameB: string = b.name ? b.name : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.name}</span>,
                },
                {
                    title: 'Main Media Source',
                    dataIndex: 'src1',
                    width: '15%',
                    editable: true,
                    sorter: (a: ProgramRoom, b: ProgramRoom) => {
                        let srcA: string = a.src1 ? a.src1 : "";
                        let srcB: string = b.src1 ? b.src1 : "";
                        return srcA.localeCompare(srcB);
                    },
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.src1}</span>,
                    key: 'roomsrc1',
                },
                {
                    title: 'Media ID',
                    dataIndex: 'id1',
                    width: '10%',
                    editable: true,
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.id1}</span>,
                    key: 'roomid1',
                },
                {
                    title: 'Password',
                    dataIndex: 'pwd1',
                    width: '10%',
                    editable: true,
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.pwd1}</span>,
                    key: 'pwd1',
                },
                {
                    title: 'Alt Media Source',
                    dataIndex: 'src2',
                    width: '15%',
                    editable: true,
                    sorter: (a: ProgramRoom, b: ProgramRoom) => {
                        let srcA: string = a.src2 ? a.src2 : "";
                        let srcB: string = b.src2 ? b.src2 : "";
                        return srcA.localeCompare(srcB);
                    },
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.src2}</span>,
                    key: 'roomsrc2',
                },
                {
                    title: 'Alt Media ID',
                    dataIndex: 'id2',
                    width: '10%',
                    editable: true,
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.id2}</span>,
                    key: 'roomid2',
                },
                {
                    title: 'Password',
                    dataIndex: 'pwd2',
                    width: '10%',
                    editable: true,
                    render: (_: string, record: ProgramRoom): JSX.Element => <span>{record.pwd2}</span>,
                    key: 'pwd2',
                },
                // {
                //     title: 'Q&A',
                //     dataIndex: 'qa',
                //     width: '20%',
                //     editable: true,
                //     render: (text, record) => <span>{record.qa}</span>,
                //     key: 'qa',
                // },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_: string, record: ProgramRoom): JSX.Element | null => {
                        const editable: boolean = isEditing(record);
                        if (this.state.ProgramRooms.length > 0) {
                            return editable ?
                                (
                                    <span>
                                        <a onClick={() => save(record.id)}
                                            style={{ marginRight: 8 }}>
                                            {<SaveTwoTone />}
                                        </a>
                                        <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
                                            <a>{<CloseCircleTwoTone />}</a>
                                        </Popconfirm>
                                    </span>
                                )
                                : (
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
                                )
                        } else {
                            return null;
                        }

                    }
                }
            ];

            const mergedColumns = columns.map(col => {
                if (!col.editable) {
                    return col;
                }
                return {
                    ...col,
                    onCell: (record: ProgramRoom) => ({
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.ProgramRooms}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        rowKey='id'
                        pagination={false} //Please talk to Jon before considering re-enabling pagination here.
                    />
                </Form>
            );
        }

        // handle when a new item is added
        const handleAdd = () => {
            assert(this.props.auth.currentConference, "Current conference is null.");

            let data = {
                clazz: "ProgramRoom",
                conference: { clazz: "ClowdrInstance", id: this.props.auth.currentConference.id },
                name: "Please enter the name of the room",
            }

            Parse.Cloud.run("create-obj", data)
                .then(() => console.log("[Admin/Rooms]: sent new object to cloud"))
                .catch((err: Error) => {
                    this.setState({ alert: "add error" })
                    console.log("[Admin/Rooms]: Unable to create: " + err)
                })
        };

        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>
            );

        else return (
            <div>
                {this.state.alert.length > 0 ? (
                    <Alert
                        onClose={() => this.setState({ alert: "" })}
                        message={this.state.alert}
                        type={this.state.alert.includes("success") ? "success" : "error"}
                        showIcon
                        closable
                    />
                ) : null}
                <table style={{ width: "100%" }}>
                    <tbody>
                        <tr>
                            <td>
                                <Upload accept=".txt, .csv" onChange={this.onChange.bind(this)}
                                    beforeUpload={this.beforeUpload.bind(this)}>
                                    <Button>
                                        <UploadOutlined /> Upload file
                                </Button>
                                </Upload>
                            </td>

                            <td width='100%'>
                                <Input.Search
                                    allowClear
                                    placeholder="Search by name"
                                    onSearch={key => {
                                        if (key === "") {
                                            this.setState({ searched: false });
                                        } else {
                                            this.setState({ searched: true });
                                            this.setState({
                                                searchResult: this.state.ProgramRooms.filter(
                                                    room => (room.name && room.name.toLowerCase().includes(key.toLowerCase()))
                                                )
                                            });
                                        }
                                    }}
                                />
                            </td>

                            <td>
                                <Button
                                    type="primary"
                                    onClick={handleAdd}
                                >
                                    New Room
                            </Button>

                            </td>
                        </tr>

                    </tbody>
                </table>

                <EditableTableForUncontrolledRooms />
            </div>
        );
    }

}

const AuthConsumer = (props: ProgramRoomsProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :  // @ts-ignore  TS: Can value really be null here?
            <Rooms {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>

);

export default AuthConsumer;
