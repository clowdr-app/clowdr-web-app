import React, { useState } from 'react';
import { Button, Form, Input, Popconfirm, Space, Spin, Table, Alert } from "antd";
import Parse from "parse";
import {
    CheckCircleTwoTone,
    DeleteOutlined,
    EditOutlined,
    WarningTwoTone,
    SaveTwoTone,
    CloseCircleTwoTone
} from '@ant-design/icons';
import { ClowdrState, EditableCellProps } from "../../../ClowdrTypes";
import { Store } from 'antd/lib/form/interface';
import ClowdrInstance from '../../../classes/ParseObjects/ClowdrInstance';
import InstanceConfiguration from '../../../classes/ParseObjects/InstanceConfiguration';

// TS: Since the "Props" and "State" interfaces are not exported, I
// think iClowdStateter to simply name them Props and
// State (everywhere)

interface AdminClowdrProps {
    auth: ClowdrState;
}

interface AdminClowdrState {
    loading: boolean;
    initialized: boolean;
    instances: ClowdrInstance[];
    searched: boolean;
    searchResult: ClowdrInstance[];
    alert: string | undefined;
    visible: boolean
}

class Clowdr extends React.Component<AdminClowdrProps, AdminClowdrState> {
    constructor(props: AdminClowdrProps) {
        super(props);
        this.state = {
            loading: true,
            initialized: false,
            instances: [],
            searched: false,
            searchResult: [],
            visible: false,
            alert: ""
        };

    }

    componentDidMount() {
        this.refreshList();
    }

    async refreshList() {
        let query = new Parse.Query<ClowdrInstance>("ClowdrInstance");
        let res = await query.find();
        console.log('[Admin/Clowdr]: Found ' + res.length + ' instances');
        // res.map(v => v.key = v.key); // Add a 'key' for the rows of the table
        this.setState({
            instances: res,
            loading: false
        });
    }

    componentWillUnmount() {
    }

    render() {
        // Set up editable table cell
        const EditableCell: React.FC<EditableCellProps<ClowdrInstance>> = ({
            editing,
            dataIndex,
            title,
            inputType,
            record,
            index,
            children,
            ...restProps
        }): JSX.Element => {
            let inputNode: JSX.Element | null;
            switch (dataIndex) {
                case ('conferenceName'):
                    inputNode = <Input />;
                    break;
                case ('adminName'):
                    inputNode = <Input />;
                    break;
                case ('adminEmail'):
                    inputNode = <Input />;
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
                            valuePropName={"value"}
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

        //Set up editable table
        const EditableTable = () => {
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.instances);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = (record: ClowdrInstance): boolean => record.id === editingKey;

            const edit = (record: ClowdrInstance): void => {
                form.setFieldsValue({
                    conferenceName: record.conferenceName ? record.conferenceName : "",
                    adminName: record.adminName ? record.adminName : "",
                    adminEmail: record.adminEmail ? record.adminEmail : ""
                });
                setEditingKey(record.id)
            }

            const cancel = (): void => {
                setEditingKey('');
            };

            const onActivate = (record: ClowdrInstance): void => {
                let data = {
                    id: record.id
                }
                Parse.Cloud.run("activate-clowdr-instance", data)
                    .then(async (t: object) => {
                        console.log("[Admin/Clowdr]: activated " + JSON.stringify(t));
                        this.setState({ alert: "activate success" });
                        await this.refreshList()
                    })
                    .catch((err: Error) => {
                        this.setState({ alert: "activate error" })
                        console.log("[Admin/Clowdr]: Unable to activate: " + err)
                    });
            };

            const onDelete = (record: ClowdrInstance): void => {
                const newInstanceList = [...this.state.instances];
                // delete from database
                let data = {
                    id: record.id
                }
                Parse.Cloud.run("delete-clowdr-instance", data)
                    .then(() => {
                        this.setState({
                            alert: "delete success",
                            instances: newInstanceList.filter(instance => instance.id !== record.id)
                        });
                        console.log("[Admin/Clowdr]: sent delete request to cloud");
                    })
                    .catch((err: Error) => {
                        this.setState({ alert: "delete error" })
                        console.log("[Admin/Clowdr]: Unable to delete: " + err)
                    });
            };

            const save = async (id: string) => {
                console.log("Entering save func");
                try {
                    const row: Store = await form.validateFields();
                    const newData = [...data];
                    let instance = newData.find(i => i.id === id);
                    if (instance) {
                        instance.set("conferenceName", row.conferenceName);
                        instance.set("adminName", row.adminName);
                        instance.set("adminEmail", row.adminEmail);
                        let data = {
                            id: instance.id,
                            conferenceName: instance.conferenceName,
                            shortName: instance.conferenceName.replace(" ", ""),
                            adminName: instance.adminName,
                            adminEmail: instance.adminEmail
                        }
                        Parse.Cloud.run("update-clowdr-instance", data)
                            .then(() => {
                                this.setState({ alert: "save success" });
                                console.log("[Admin/Clowdr]: sent updated object to cloud");
                                this.refreshList();
                            })
                            .catch((err: Error) => {
                                this.setState({ alert: "add error" })
                                console.log("[Admin/Clowdr]: Unable to update: " + err)
                            })

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
                    console.log('[Admin/Clowdr]: Validate Failed:', errInfo);
                }
            };

            const columns = [
                {
                    title: 'Name',
                    dataIndex: 'conferenceName',
                    editable: true,
                    width: '40%',
                    sorter: (a: ClowdrInstance, b: ClowdrInstance) => {
                        let valueA: string = a.conferenceName ? a.conferenceName : "";
                        let valueB: string = b.conferenceName ? b.conferenceName : "";
                        return valueA.localeCompare(valueB);
                    },
                    render: (_: string, record: ClowdrInstance): JSX.Element => <span>{record.conferenceName}</span>,
                    key: 'conferenceName',
                },
                {
                    title: 'Admin Name',
                    dataIndex: 'adminName',
                    key: 'adminName',
                    editable: true,
                    width: '30%',
                    sorter: (a: ClowdrInstance, b: ClowdrInstance) => {
                        let nameA: string = a.adminName ? a.adminName : "";
                        let nameB: string = b.adminName ? b.adminName : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: ClowdrInstance): JSX.Element => <span>{record.adminName}</span>,
                },
                {
                    title: 'Admin Email',
                    dataIndex: 'adminEmail',
                    key: 'adminEmail',
                    editable: true,
                    width: '20%',
                    sorter: (a: ClowdrInstance, b: ClowdrInstance) => {
                        let nameA: string = a.adminEmail ? a.adminEmail : "";
                        let nameB: string = b.adminEmail ? b.adminEmail : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: ClowdrInstance): JSX.Element => <span>{record.adminEmail}</span>,
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_: string, record: ClowdrInstance): JSX.Element | null => {
                        let active = record.isInitialized ?
                            <CheckCircleTwoTone twoToneColor='#52c41a' title="This instance is activated" /> :
                            <Popconfirm
                                title="Activate this CLOWDR instance?"
                                onConfirm={() => onActivate(record)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <a title="This instance is not yet activated. Click to activate.">{<WarningTwoTone twoToneColor="#ff3333" />}</a>
                            </Popconfirm>
                        let del = record.isInitialized ? <></> :
                            <Popconfirm
                                title="Delete this CLOWDR instance?"
                                onConfirm={() => onDelete(record)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <a title="Delete">{<DeleteOutlined />}</a>
                            </Popconfirm>

                        const editable = isEditing(record);
                        if (this.state.instances.length > 0) {
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
                                        {del}
                                        {active}
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
                    onCell: (record: ClowdrInstance) => ({
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.instances}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        rowKey='id'
                        pagination={false}
                    />
                </Form>
            );
        };

        const newInstance = () => {
            console.log("[Admin/Clowdr]: Creating new instance ");
            let data = {
                conferenceName: "NEW CONFERENCE " + Math.floor(Math.random() * 10000).toString(),
                shortName: "NEWCONFERENCE",
                adminName: "ADMIN PERSON",
                adminEmail: "someone@somewhere",
                isInitialized: false
            }
            Parse.Cloud.run("create-clowdr-instance", data)
                .then((t: object) => {
                    console.log("[Admin/Clowdr]: new instance " + JSON.stringify(t));
                    this.refreshList();
                })
                .catch(err => {
                    this.setState({ alert: "add error" })
                    console.log("[Admin/Clowdr]: Unable to create: " + err)
                })
        }

        if (this.state.loading)
            // if (this.props.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div><table style={{ width: "100%" }}><tbody><tr>
            <td><Button
                type="primary"
                onClick={newInstance}
            >
                New Instance
            </Button>

                {this.state.alert ? <Alert
                    onClose={() => this.setState({ alert: undefined })}
                    style={{
                        margin: 16,
                        display: "inline-block",
                    }}
                    message={this.state.alert}
                    type={this.state.alert.includes("success") ? "success" : "error"}
                    showIcon
                    closable
                /> : <span> </span>}</td>

        </tr></tbody></table>

            {/* TODO: Ed: This code is completely broken according to the type information
                      It seems to be trying to access InstanceConfiguration stuff, but
                      on ClowdrInstance objects?!
             <Input.Search
                allowClear
                onSearch={key => {
                    if (key === "") {
                        this.setState({ searched: false });
                    }
                    else {
                        this.setState({ searched: true });
                        this.setState({
                            searchResult: this.state.instances.filter(
                                config =>
                                    (config.key && config.key.toLowerCase().includes(key.toLowerCase()))
                                    || (config.value && config.value.toLowerCase().includes(key.toLowerCase())))
                        })
                    }
                }
                }
            /> */}
            <EditableTable />
        </div>
    }
}

export default Clowdr;

