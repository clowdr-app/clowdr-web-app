import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs, Checkbox, Alert} from "antd";
import Parse from "parse";
import {
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';

class Configuration extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true, 
            initialized: false,
            config: []
        };

    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        // Has this conference been initialized?
        console.log('[Admin/Config]: active space ' + this.props.auth.activeSpace);
        if (this.props.auth.activeSpace && this.props.auth.activeSpace.get('chatChannel')) {
            this.setState({initialized: true});
        }
        else
            console.log('[Admin/Config]: conference has not been yet initialized');

        this.refreshList();
    }

    componentDidUpdate(prevProps) {
    }

    async refreshList() {
        let query = new Parse.Query("InstanceConfiguration");
        query.equalTo("instance", this.props.auth.currentConference);
        let res = await query.find();
        console.log('[Admin/Config]: Found ' + res.length + ' vars');
        res.map(v => v.key = v.get('key')); // Add a 'key' for the rows of the table
        this.setState({
            config: res,
            loading: false
        });
    }

    componentWillUnmount() {
    }

    initConference() {
        const data = {conference: this.props.auth.currentConference.id};
        Parse.Cloud.run("init-conference-2", data).then(response => {
            console.log('[Admin/Config]: successfully initialized conference ' + this.props.auth.currentConference.id);
            this.setState({initialized: true});
        }).catch(err => console.log('[Admin/Config]: error in initializing conference: ' + err));

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
                case ('key'):
                    inputNode = <Input/>;
                    break;
                case ('value'):
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
            const [data, setData] = useState(this.state.config);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = record => record.id === editingKey;

            const edit = record => {
                form.setFieldsValue({
                    key: record.get("key") ? record.get("key") : "",
                    value: record.get("value") ? record.get("value") : ""
                });
                setEditingKey(record.id)
            }

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                const newConfigList = [...this.state.config];
                // delete from database
                record.destroy().then(() => {
                    this.setState({
                        alert: "delete success",
                        config: newConfigList.filter(config => config.id !== record.id)
                    });
                    console.log("Config deleted from db")
                }).catch(error => {
                    this.setState({alert: "delete error"});
                    console.log("[Admin/Config]: item cannot be deleted from db");
                })
                ;
            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let config = newData.find(config => config.id === id);

                    if (config) {
                        config.set("key", row.key);
                        config.set("value", row.value);
                        setData(newData);
                        config.save()
                            .then((response) => {
                                console.log('[Admin/Config]: Updated config', response);
                                this.setState({alert: "save success"});
                            })
                            .catch(err => {
                                console.log('[Admin/Config]: error when saving config: ' + err);
                                console.log("@" + config.id);
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
                    console.log('[Admin/Config]: Validate Failed:', errInfo);
                }
            };

            const columns = [
                {
                    title: 'Key',
                    dataIndex: 'key',
                    key: 'key',
                    editable: true,
                    width: '50%',
                    sorter: (a, b) => {
                        var nameA = a.get("key") ? a.get("key"): "";
                        var nameB = b.get("key") ? b.get("key") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (text, record) => <span>{record.get("key")}</span>,
                },
                {
                    title: 'Value',
                    dataIndex: 'value',
                    editable: true,
                    width: '50%',
                    sorter: (a, b) => {
                        var valueA = a.get("value") ? a.get("value") : "";
                        var valueB = b.get("value") ? b.get("value") : "";
                        return valueA.localeCompare(valueB);
                    },
                    render: (text,record) => <span>{record.get("value")}</span>,
                    key: 'value',
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.config.length > 0) {
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.config}
                        columns={mergedColumns}
                        rowClassName="editable-row"
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
                console.log('[Admin/Config]: error: ' + err);
            }); 
        }

        if (this.props.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        let redButton = <td>&nbsp;</td>;
        if (!this.state.initialized) 
                redButton =  <td style={{textAlign: "right"}}><Button
                    style={{background: "red", borderColor: "yellow"}}
                    type="primary"
                    onClick={this.initConference.bind(this)}
                >
                Initialize Conference
            </Button></td>

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

            {redButton}
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
                                searchResult: this.state.config.filter(
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

export default Configuration;

