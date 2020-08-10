import React, {useState} from 'react';
import {Button, Form, Input, Popconfirm, Space, Spin, Table, Checkbox, Alert} from "antd";
import Parse from "parse";
import {
    CheckCircleTwoTone,
    DeleteOutlined,
    EditOutlined,
    WarningTwoTone,
    SaveTwoTone,
    CloseCircleTwoTone
} from '@ant-design/icons';
import {ClowdrState, EditableCellProps} from "../../../ClowdrTypes";
import { Store } from 'antd/lib/form/interface';

// TS: Since the "Props" and "State" interfaces are not exported, I
// think iClowdStateter to simply name them Props and
// State (everywhere)

interface AdminClowdrProps {
    auth: ClowdrState;
}

interface AdminClowdrState {
    loading: boolean;
    initialized: boolean;
    instances: Parse.Object[];
    searched: boolean;
    searchResult: Parse.Object[];
    alert: string|undefined;
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

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        this.refreshList();
    }

    async refreshList() {
        let query = new Parse.Query("ClowdrInstance");
        let res = await query.find();
        console.log('[Admin/Clowdr]: Found ' + res.length + ' instances');
        // res.map(v => v.key = v.get('key')); // Add a 'key' for the rows of the table
        this.setState({
            instances: res,
            loading: false
        });
    }

    componentWillUnmount() {
    }

    onChangeFeatures(record: Parse.Object) {
        record.set("isIncludeAllFeatures", !record.get("isIncludeAllFeatures"));
    }

    render() {
        // Set up editable table cell
        const EditableCell: React.FC<EditableCellProps> = ({
            editing,
            dataIndex,
            title,
            inputType,
            record,
            index,
            children,
            ...restProps
        }): JSX.Element => {
            let inputNode: JSX.Element|null;
            switch (dataIndex) {
                case ('conferenceName'):
                    inputNode = <Input/>;
                    break;
                case ('adminName'):
                    inputNode = <Input/>;
                    break;
                case ('adminEmail'):
                    inputNode = <Input/>;
                    break;
                case ('isIncludeAllFeatures'):
                    inputNode = (
                        <span title="All goodies?"><Checkbox
                            defaultChecked={record.get("isIncludeAllFeatures")}
                            onChange= {this.onChangeFeatures.bind(this, record)}
                        >
                        </Checkbox></span>
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
                            valuePropName={dataIndex === 'isIncludeAllFeatures' ? "checked" : "value"}
                            style={{
                                margin: 0,
                            }}
                            rules={dataIndex === "isIncludeAllFeatures" ? []: [
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
            const isEditing = (record: Parse.Object): boolean => record.id === editingKey;

            const edit = (record: Parse.Object): void => {
                form.setFieldsValue({
                    conferenceName: record.get("conferenceName") ? record.get("conferenceName") : "",
                    adminName: record.get("adminName") ? record.get("adminName") : "",
                    adminEmail: record.get("adminEmail") ? record.get("adminEmail") : ""
                });
                setEditingKey(record.id)
            }

            const cancel = (): void => {
                setEditingKey('');
            };

            const onActivate = (record: Parse.Object): void => {
                let data = {
                    id: record.id
                }
                Parse.Cloud.run("activate-clowdr-instance", data)
                .then(async (t: object) => {
                    console.log("[Admin/Clowdr]: activated " + JSON.stringify(t));
                    this.setState({alert: "activate success"});
                    await this.refreshList()
                })
                .catch((err: Error) => {
                    this.setState({alert: "activate error"})
                    console.log("[Admin/Clowdr]: Unable to activate: " + err)
                });
            };

            const onDelete = (record: Parse.Object): void => {
                const newInstanceList = [...this.state.instances];
                // delete from database
                let data = {
                    id: record.id
                }
                Parse.Cloud.run("delete-clowdr-instance", data)
                .then(() => {
                    this.setState({
                        alert: "delete success", 
                        instances: newInstanceList.filter(instance => instance.id !== record.id)});
                    console.log("[Admin/Clowdr]: sent delete request to cloud");
                })
                .catch((err: Error) => {
                    this.setState({alert: "delete error"})
                    console.log("[Admin/Clowdr]: Unable to delete: " + err)
                });
            };

            const save = async (id: string) => {
                console.log("Entering save func");
                try {
                    const row: Store = await form.validateFields();
                    const newData: Parse.Object[] = [...data];
                    let instance: Parse.Object|undefined = newData.find(i => i.id === id);
                    if (instance) {
                        instance.set("conferenceName", row.conferenceName);
                        instance.set("isIncludeAllFeatures", row.isIncludeAllFeatures);
                        instance.set("adminName", row.adminName);
                        instance.set("adminEmail", row.adminEmail);
                        let data = {
                            id: instance.id,
                            conferenceName: instance.get('conferenceName'),
                            shortName: instance.get('conferenceName').replace(" ", ""),
                            isIncludeAllFeatures: instance.get('isIncludeAllFeatures'),
                            adminName: instance.get('adminName'),
                            adminEmail: instance.get('adminEmail')
                        }
                        Parse.Cloud.run("update-clowdr-instance", data)
                        .then(() => {
                            this.setState({alert: "save success"});
                            console.log("[Admin/Clowdr]: sent updated object to cloud");
                            this.refreshList();
                        })
                        .catch((err: Error) => {
                            this.setState({alert: "add error"})
                            console.log("[Admin/Clowdr]: Unable to update: " + err)
                        })

                        setEditingKey('');
                    }
                    else {
                        newData.push(row as Parse.Object);
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
                    sorter: (a: Parse.Object, b: Parse.Object) => {
                        let valueA: string = a.get("conferenceName") ? a.get("conferenceName") : "";
                        let valueB: string = b.get("conferenceName") ? b.get("conferenceName") : "";
                        return valueA.localeCompare(valueB);
                    },
                    render: (_: string, record: Parse.Object): JSX.Element => <span>{record.get("conferenceName")}</span>,
                    key: 'conferenceName',
                },
                {
                    title: 'All features',
                    dataIndex: 'isIncludeAllFeatures',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: Parse.Object): JSX.Element =><Checkbox checked={!!record.get("isIncludeAllFeatures")} disabled/>,
                    key: 'isIncludeAllFeatures',
                },
                {
                    title: 'Admin Name',
                    dataIndex: 'adminName',
                    key: 'adminName',
                    editable: true,
                    width: '30%',
                    sorter: (a: Parse.Object, b: Parse.Object) => {
                        let nameA: string = a.get("adminName") ? a.get("adminName"): "";
                        let nameB: string = b.get("adminName") ? b.get("adminName") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: Parse.Object): JSX.Element => <span>{record.get("adminName")}</span>,
                },
                {
                    title: 'Admin Email',
                    dataIndex: 'adminEmail',
                    key: 'adminEmail',
                    editable: true,
                    width: '20%',
                    sorter: (a: Parse.Object, b: Parse.Object) => {
                        let nameA: string = a.get("adminEmail") ? a.get("adminEmail"): "";
                        let nameB: string = b.get("adminEmail") ? b.get("adminEmail") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: Parse.Object): JSX.Element => <span>{record.get("adminEmail")}</span>,
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_: string, record: Parse.Object): JSX.Element|null => {
                        let active = record.get("isInitialized") ? 
                                        <CheckCircleTwoTone twoToneColor='#52c41a' title="This instance is activated"/> :
                                        <Popconfirm
                                            title="Activate this CLOWDR instance?"
                                            onConfirm={() => onActivate(record)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <a title="This instance is not yet activated. Click to activate.">{<WarningTwoTone twoToneColor="#ff3333"/>}</a>
                                        </Popconfirm>
                            let del = record.get("isInitialized") ? <></> :
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
                                    <a title="Edit" onClick={() => {if (editingKey === '') edit(record)}}>
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
                    onCell: (record: Parse.Object) => ({
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
            console.log("[Admin/Clowdr]: Creating new instance " );
            let data = {
                conferenceName: "NEW CONFERENCE " + Math.floor(Math.random() * 10000).toString(),
                shortName: "NEWCONFERENCE",
                isIncludeAllFeatures: true,
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
                this.setState({alert: "add error"})
                console.log("[Admin/Clowdr]: Unable to create: " + err)
            })
        }

        if (this.state.loading)
        // if (this.props.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div><table style={{width:"100%"}}><tbody><tr>
            <td><Button
                type="primary"
                onClick={newInstance}
            >
                New Instance
            </Button>

            {this.state.alert ? <Alert
                    onClose={() => this.setState({alert: undefined})}
                    style={{
                        margin: 16,
                        display: "inline-block",
                    }}
                    message={this.state.alert}
                    type={this.state.alert.includes("success") ? "success": "error"}
                    showIcon
                    closable
            /> : <span> </span>}</td>

            </tr></tbody></table>

            <Input.Search
                allowClear
                onSearch={key => {
                        if (key == "") {
                            this.setState({searched: false});
                        }
                        else {
                            this.setState({searched: true});
                            this.setState({
                                searchResult: this.state.instances.filter(
                                    config => 
                                        (config.get('key') && config.get('key').toLowerCase().includes(key.toLowerCase())) 
                                        || (config.get('value') && config.get('value').toLowerCase().includes(key.toLowerCase())))
                            })
                        }
                    }
                }
            />      
            <EditableTable/>
        </div>
    }
}

export default Clowdr;

