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
                case ('shortName'):
                    inputNode = <Input/>;
                    break;
                case ('conferenceName'):
                    inputNode = <Input/>;
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

        //Set up editable table
        const EditableTable = () => {
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.instances);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = record => record.id === editingKey;

            const edit = record => {
                form.setFieldsValue({
                    key: record.get("shortName") ? record.get("shortName") : "",
                    value: record.get("conferenceName") ? record.get("conferenceName") : ""
                });
                setEditingKey(record.id)
            }

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                const newInstanceList = [...this.state.instances];
                // delete from database
                record.destroy().then(() => {
                    this.setState({
                        alert: "delete success",
                        instances: newInstanceList.filter(instance => instance.id !== record.id)
                    });
                    console.log("Instance deleted from db")
                }).catch(error => {
                    this.setState({alert: "delete error"});
                    console.log("[Admin/Clowdr]: item cannot be deleted from db");
                })
                ;
            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let instance = newData.find(i => i.id === id);

                    if (instance) {
                        instance.set("shortName", row.shortName);
                        instance.set("conferenceName", row.conferenceName);
                        setData(newData);
                        instance.save()
                            .then((response) => {
                                console.log('[Admin/Clowdr]: Updated config', response);
                                this.setState({alert: "save success"});
                            })
                            .catch(err => {
                                console.log('[Admin/Clowdr]: error when saving config: ' + err);
                                console.log("@" + instance.id);
                                this.setState({alert: "save error"});
                            });
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
                    title: 'Short Name',
                    dataIndex: 'key',
                    key: 'shortName',
                    editable: true,
                    width: '10%',
                    sorter: (a, b) => {
                        var nameA = a.get("shortName") ? a.get("shortName"): "";
                        var nameB = b.get("shortName") ? b.get("shortName") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (text, record) => <span>{record.get("shortName")}</span>,
                },
                {
                    title: 'Public Name',
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
                    title: 'Admin Name',
                    dataIndex: 'key',
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
                    dataIndex: 'key',
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
                                        title="Are you sure delete this variable?"
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

        const newConfig = () => {
            const Config = Parse.Object.extend("InstanceConfiguration");
            const config = new Config();
            config.set("key", "Please enter a name");
            config.set("value", "Please enter a value");

            let acl = new Parse.ACL();
            acl.setPublicWriteAccess(false);
            acl.setPublicReadAccess(false);
            acl.setRoleWriteAccess(this.props.auth.currentConference.id+"-admin", true);
            acl.setRoleReadAccess(this.props.auth.currentConference.id+"-admin", true);
            config.setACL(acl);
            config.set("instance", this.props.auth.currentConference);

            config.save().then(val => {
                config.key = val.id;
                this.setState({alert: "add success", config: [config, ...this.state.config]})
            }).catch(err => {
                this.setState({alert: "add error"});
                console.log('[Admin/Clowdr]: error: ' + err);
            }); 
        }

        if (this.props.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div><table style={{width:"100%"}}><tbody><tr>
            <td><Button
                type="primary"
                onClick={newConfig}
            >
                New config variable
            </Button>
            {/* <CollectionEditForm
                title="Add Track"
                visible={this.state.visible}
                onAction={this.onCreate.bind(this)}
                onCancel={() => {
                    this.setVisible(false);
                }}
            /> */}

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

