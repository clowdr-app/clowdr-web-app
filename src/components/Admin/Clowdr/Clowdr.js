import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs, Checkbox, Alert} from "antd";
import Parse from "parse";
import {
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';

class Clowdr extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true, 
            initialized: false,
            instances: []
        };

    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        this.refreshList();
    }

    componentDidUpdate(prevProps) {
    }

    async refreshList() {
        let query = new Parse.Query("ClowdrInstance");
        let res = await query.find();
        console.log('[Admin/Clowdr]: Found ' + res.length + ' instances');
        res.map(v => v.key = v.get('key')); // Add a 'key' for the rows of the table
        this.setState({
            instances: res,
            loading: false
        });
    }

    componentWillUnmount() {
    }

    initConference() {
        const data = {shortName: this.state.shortName, conferenceName: this.state.conferenceName};
        Parse.Cloud.run("init-conference-1", data).then(response => {
            console.log('[Admin/Clowdr]: successfully created conference ' + response.id);
            this.setState({initialized: true});
        }).catch(err => console.log('[Admin/Clowdr]: error in initializing conference: ' + err));

    }

    onChangeFeatures(record) {
        record.set("isIncludeAllFeatures", !record.get("isIncludeAllFeatures"));
    }


    render() {
        // Set up editable table cell
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
                            valuePropName={dataIndex == 'isIncludeAllFeatures' ? "checked" : "value"}
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
            const isEditing = record => record.id === editingKey;

            const edit = record => {
                form.setFieldsValue({
                    conferenceName: record.get("conferenceName") ? record.get("conferenceName") : "",
                    adminName: record.get("adminName") ? record.get("adminName") : "",
                    adminEmail: record.get("adminEmail") ? record.get("adminEmail") : ""
                });
                setEditingKey(record.id)
            }

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                const newInstanceList = [...this.state.instances];
                // delete from database
                let data = {
                    id: record.id
                }
                Parse.Cloud.run("delete-clowdr-instance", data)
                .then(t => {
                    this.setState({
                        alert: "delete success", 
                        instances: newInstanceList.filter(instance => instance.id !== record.id)});
                    console.log("[Admin/Clowdr]: sent delete request to cloud");
                })
                .catch(err => {
                    this.setState({alert: "delete error"})
                    console.log("[Admin/Clowdr]: Unable to delete: " + err)
                });
            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let instance = newData.find(i => i.id === id);

                    instance.set("conferenceName", row.conferenceName);
                    instance.set("isIncludeAllFeatures", row.isIncludeAllFeatures);
                    instance.set("adminName", row.adminName);
                    instance.set("adminEmail", row.adminEmail);

                    if (instance) {

                        let data = {
                            id: instance.id,
                            conferenceName: instance.get('conferenceName'),
                            shortName: instance.get('conferenceName').replace(" ", ""),
                            isIncludeAllFeatures: instance.get('isIncludeAllFeatures'),
                            adminName: instance.get('adminName'),
                            adminEmail: instance.get('adminEmail')
                        }
                        Parse.Cloud.run("update-clowdr-instance", data)
                        .then(t => {
                            this.setState({alert: "save success"});
                            console.log("[Admin/Clowdr]: sent updated object to cloud");
                        })
                        .catch(err => {
                            this.setState({alert: "add error"})
                            console.log("[Admin/Clowdr]: Unable to update: " + err)
                        })

                        setEditingKey('');
                    }
                    else {
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
                    sorter: (a, b) => {
                        var valueA = a.get("conferenceName") ? a.get("conferenceName") : "";
                        var valueB = b.get("conferenceName") ? b.get("conferenceName") : "";
                        return valueA.localeCompare(valueB);
                    },
                    render: (text,record) => <span>{record.get("conferenceName")}</span>,
                    key: 'conferenceName',
                },
                {
                    title: 'All features',
                    dataIndex: 'isIncludeAllFeatures',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><Checkbox checked={record.get("isIncludeAllFeatures") ? true : false} disabled></Checkbox>,
                    key: 'isIncludeAllFeatures',
                },
                {
                    title: 'Admin Name',
                    dataIndex: 'adminName',
                    key: 'adminName',
                    editable: true,
                    width: '30%',
                    sorter: (a, b) => {
                        var nameA = a.get("adminName") ? a.get("adminName"): "";
                        var nameB = b.get("adminName") ? b.get("adminName") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (text, record) => <span>{record.get("adminName")}</span>,
                },
                {
                    title: 'Admin Email',
                    dataIndex: 'adminEmail',
                    key: 'adminEmail',
                    editable: true,
                    width: '20%',
                    sorter: (a, b) => {
                        var nameA = a.get("adminEmail") ? a.get("adminEmail"): "";
                        var nameB = b.get("adminEmail") ? b.get("adminEmail") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (text, record) => <span>{record.get("adminEmail")}</span>,
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_, record) => {
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
                                        title="Are you sure delete this CLOWDR instance?"
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
            const ClowdrInstance = Parse.Object.extend('ClowdrInstance');
            const myNewObject = new ClowdrInstance();
            myNewObject.set("conferenceName", "NEW CONFERENCE " + Math.floor(Math.random() * 10000).toString());
            myNewObject.set("shortName", myNewObject.get("conferenceName").replace(" ", ""));
            myNewObject.set("isIncludeAllFeatures", true);
            myNewObject.set("adminName", "ADMIN PERSON");
            myNewObject.set("adminEmail", "someone@somewhere");

            console.log("[Admin/Clowdr]: Creating new instance " + myNewObject.id);
            let data = {
                conferenceName: myNewObject.get("conferenceName"),
                shortName: myNewObject.get("shortName"),
                isIncludeAllFeatures: true,
                adminName: "ADMIN PERSON",
                adminEmail: "someone@somewhere",
                isInitialized: false
            }
            Parse.Cloud.run("create-clowdr-instance", data)
            .then(t => {
                this.setState({instances: [myNewObject, ...this.state.instances]})
                console.log("[Admin/Clowdr]: sent new object to cloud");
            })
            .catch(err => {
                this.setState({alert: "add error"})
                console.log("[Admin/Clowdr]: Unable to create: " + err)
            })
        }

        if (this.props.loading)
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

