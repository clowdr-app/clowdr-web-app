import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Radio, Space, Spin, Table, Tabs, Checkbox, Alert, Switch} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {
    DeleteOutlined,
    EditOutlined,
    SaveTwoTone,
    CloseCircleTwoTone
} from '@ant-design/icons';

const { Option } = Select;

// const {TabPane} = Tabs;
// const IconText = ({icon, text}) => (
//     <Space>
//         {React.createElement(icon)}
//         {text}
//     </Space>
// );

class Tracks extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: true, 
            alert: undefined,
            ProgramTracks: [],
            socialSpaces: [],
            socialSpacesLoading: true,
            gotTracks: false,
            editing: false,
            edt_track: undefined,
            searched: false,
            searchResult: "",
            test:false
        };
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    async componentDidMount() {
        let socialSpaceQ = new Parse.Query("SocialSpace");
        socialSpaceQ.equalTo("conference", this.props.auth.currentConference);
        let [spaces, tracks] = await Promise.all([socialSpaceQ.find(),
        this.props.auth.programCache.getProgramTracks(this)]);
        this.setState({socialSpaces: spaces, loading: false, ProgramTracks: tracks});
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this);
    }

    onChangeExhibit(record, e) {
        console.log("--> radio changed " + e.target.value);
        record.set("exhibit", e.target.value);
    }

    onChangeChat(record) {
        record.set("perProgramItemChat", !record.get("perProgramItemChat"));
    }

    onChangeVideo(record) {
        record.set("perProgramItemVideo", !record.get("perProgramItemVideo"));
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
                case ('name'):
                    inputNode = <Input title="Short name used internally, e.g. papers"/>;
                    break;
                case ('displayName'):
                    inputNode = <Input title="Name that participants see, e.g. Research Papers"/>;
                    break;
                case ('perProgramItemChat'):
                    //console.log(record.get("perProgramItemChat"));
                    inputNode = (
                        <span title="Do the track's items get their own text chat channels?"><Checkbox 
                            defaultChecked={record.get("perProgramItemChat")}
                            onChange={this.onChangeChat.bind(this, record)}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('perProgramItemVideo'):
                    inputNode = (
                        <span title="Do the track's items get their own video channels?"><Checkbox
                            defaultChecked={record.get("perProgramItemVideo")}
                            onChange= {this.onChangeVideo.bind(this, record)}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('exhibit'):
                    inputNode = (
                        <Radio.Group onChange={this.onChangeExhibit.bind(this, record)} 
                                        value={record.get("exhibit")}>
                            <Radio value="None"><span title="Don't show in Exhibit Hall">None</span></Radio>
                            <Radio value="List"><span title="Show in Exhibit Hall as a simple list of all items">List</span></Radio>
                            <Radio value="Grid"><span title="Show in Exhibit Hall as a grid of images, one per item">Grid</span></Radio>
                        </Radio.Group>
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
                            valuePropName={dataIndex == 'perProgramItemChat' || dataIndex == 'perProgramItemVideo' ? "checked" : "value"}
                            style={{
                                margin: 0,
                            }}
                            rules={[
                                {
                                    required: dataIndex == 'name' ? true : false,
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
            const [data, setData] = useState(this.state.ProgramTracks);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = record => record.id === editingKey;

            const edit = record => {
                form.setFieldsValue({
                    name: record.get("name") ? record.get("name") : "",
                    displayName: record.get("displayName") ? record.get("displayName") : "",
                    exhibit: record.get("exhibit") ? record.get("exhibit") : "",
                    perProgramItemChat: record.get("perProgramItemChat"),
                    perProgramItemVideo: record.get("perProgramItemVideo")
                });
                setEditingKey(record.id)
            }

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                const newTrackList = [...this.state.ProgramTracks];
                // delete from database
                let data = {
                    clazz: "ProgramTrack",
                    conference: {clazz: "ClowdrInstance", id: record.get("conference").id},
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                .then(c => this.setState({alert: "delete success"}))
                .catch(err => {
                    this.setState({alert: "delete error"})
                    this.refreshList();
                    console.log("[Admin/Tracks]: Unable to delete: " + err)
                })

            };

            const save = async id => {
                console.log("Entering save func");
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let track = newData.find(track => track.id === id);

                    if (track) {
                        track.set("name", row.name);
                        track.set("displayName", row.displayName);
                        setData(newData);

                        let data = {
                            clazz: "ProgramTrack",
                            conference: {clazz: "ClowdrInstance", id: track.get("conference").id},
                            id: track.id,
                            name: track.get("name"),
                            displayName: track.get("displayName"),
                            exhibit: track.get("exhibit"),
                            perProgramItemChat: track.get("perProgramItemChat"),
                            perProgramItemVideo: track.get("perProgramItemVideo")
                        }
                        console.log(data)
                        Parse.Cloud.run("update-obj", data)
                        .then(c => this.setState({alert: "save success"}))
                        .catch(err => {
                            this.setState({alert: "save error"})
                            console.log("[Admin/Tracks]: Unable to save: " + err)
                        })
                    
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
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                    editable: true,
                    width: '50%',
                    sorter: (a, b) => {
                        var nameA = a.get("name") ? a.get("name"): "";
                        var nameB = b.get("name") ? b.get("name") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (text, record) => <span>{record.get("name")}</span>,
                },
                {
                    title: 'Display Name',
                    dataIndex: 'displayName',
                    editable: true,
                    width: '50%',
                    sorter: (a, b) => {
                        var displayNameA = a.get("displayName") ? a.get("displayName") : "";
                        var displayNameB = b.get("displayName") ? b.get("displayName") : "";
                        return displayNameA.localeCompare(displayNameB);
                    },
                    render: (text,record) => <span>{record.get("displayName")}</span>,
                    key: 'displayName',
                },
                {
                    title: 'Exhibit',
                    dataIndex: 'exhibit',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemChat") ? (record.get("perProgramItemChat") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><span>{record.get("exhibit")}</span>,
                    key: 'exhibit',
                },
                {
                    title: 'Text Chats',
                    dataIndex: 'perProgramItemChat',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemChat") ? (record.get("perProgramItemChat") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><Checkbox checked={record.get("perProgramItemChat") ? true : false} disabled></Checkbox>,
                    key: 'perProgramItemChat',
                },
                {
                    title: 'Video Chats',
                    dataIndex: 'perProgramItemVideo',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><Checkbox checked={record.get("perProgramItemVideo") ? true : false} disabled></Checkbox>,
                    key: 'perProgramItemVideo',
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.ProgramTracks.length > 0) {
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
                                        title="Are you sure delete this track?"
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
                <Form form={form} component={false} >
                    <Table
                        components={{
                            body: {
                                cell: EditableCell,
                            },
                        }}
                        bordered
                        dataSource={this.state.searched ? this.state.searchResult : this.state.ProgramTracks}
                        rowKey='id'
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        pagination={{ defaultPageSize: 500,
                            pageSizeOptions: [10, 20, 50, 100, 500], 
                            position: ['topRight', 'bottomRight']}}
                    />
                </Form>
            );
        };

        const newTrack = () => {

            let data = {
                clazz: "ProgramTrack",
                conference: {clazz: "ClowdrInstance", id: this.props.auth.currentConference.id},
                name: "One-word-name",
                displayName: "Publicly visible name",
                exhibit: "None",
                perProgramItemChat: false,
                perProgramItemVideo: false
            }
            Parse.Cloud.run("create-obj", data)
            .then(t => console.log("[Admin/Tracks]: sent new object to cloud"))
            .catch(err => {
                this.setState({alert: "add error"})
                console.log("[Admin/Track]: Unable to create: " + err)
            })
        
        }

        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div>
            <Button
                type="primary"
                onClick={newTrack}
            >
                New track
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
            /> : <span> </span>}
            <Input.Search
                allowClear
                onSearch={key => {
                        if (key == "") {
                            this.setState({searched: false});
                        }
                        else {
                            this.setState({searched: true});
                            this.setState({
                                searchResult: this.state.ProgramTracks.filter(
                                    track => 
                                        (track.get('name') && track.get('name').toLowerCase().includes(key.toLowerCase())) 
                                        || (track.get('displayName') && track.get('displayName').toLowerCase().includes(key.toLowerCase())))
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
            <AuthUserContext.Consumer>
                {value => (
                    <Tracks {...props} auth={value} />
                )}
            </AuthUserContext.Consumer>
);
export default AuthConsumer;

