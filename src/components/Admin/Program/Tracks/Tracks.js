import React, {Fragment, useState} from 'react';
import {Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs, Checkbox, Alert, Switch} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import {
    DeleteOutlined,
    EditOutlined
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
            tracks: [],
            socialSpaces: [],
            socialSpacesLoading: true,
            gotTracks: false,
            editing: false,
            edt_track: undefined,
            searched: false,
            searchResult: "",
            test:false
        };

        console.log('[Admin/Tracks]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.tracks = this.props.tracks;
        }

    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    async componentDidMount() {
        let socialSpaceQ = new Parse.Query("SocialSpace");
        socialSpaceQ.equalTo("conference", this.props.auth.currentConference);
        let spaces = await socialSpaceQ.find();
        this.setState({socialSpaces: spaces, spacesLoading: false});
    }

    componentDidUpdate(prevProps) {
        console.log("[Admin/Tracks]: Something changed");

        if (this.state.loading) {
            if (this.state.gotTracks) {
                console.log('[Admin/Tracks]: Program download complete');
                this.setState({
                    tracks: this.props.tracks,
                    loading: false
                });
            }
            else {
                console.log('[Admin/Tracks]: Program still downloading...');
                if (prevProps.tracks.length != this.props.tracks.length) {
                    this.setState({gotTracks: true});
                    console.log('[Admin/Tracks]: got tracks');
                }
            }
        }
        else {
            if (prevProps.tracks.length != this.props.tracks.length) {
                this.setState({tracks: this.props.tracks});
                console.log('[Admin/Tracks]: changes in tracks');
            }
        }

    }


    refreshList(){
        let query = new Parse.Query("ProgramTrack");
        query.equalTo("conference", this.props.auth.currentConference);
        query.find().then(res=>{
            console.log('Found tracks ' + res.length);
            this.setState({
                tracks: res,
                loading: false
            });
        })
    }

    componentWillUnmount() {
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
                    inputNode = <Input/>;
                    break;
                case ('displayName'):
                    inputNode = <Input/>;
                    break;
                case ('perProgramItemChat'):
                    //console.log(record.get("perProgramItemChat"));
                    inputNode = (
                        <Checkbox 
                            defaultChecked={record.get("perProgramItemChat")}
                            onChange={this.onChangeChat.bind(this, record)}
                        >
                        </Checkbox>
                    );
                    break;
                case ('perProgramItemVideo'):
                    inputNode = (
                        <Checkbox
                            defaultChecked={record.get("perProgramItemVideo")}
                            onChange= {this.onChangeVideo.bind(this, record)}
                        >
                        </Checkbox>
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
            const [data, setData] = useState(this.state.tracks);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = record => record.id === editingKey;

            const edit = record => {
                form.setFieldsValue({
                    name: record.get("name") ? record.get("name") : "",
                    displayName: record.get("displayName") ? record.get("displayName") : "",
                    perProgramItemChat: record.get("perProgramItemChat"),
                    perProgramItemVideo: record.get("perProgramItemVideo")
                });
                setEditingKey(record.id)
            }

            const cancel = () => {
                setEditingKey('');
            };

            const onDelete = record => {
                const newTrackList = [...this.state.tracks];
                // delete from database
                let data = {
                    clazz: "ProgramTrack",
                    conference: record.get("conference").id,
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                .then(c => this.setState({alert: "delete success"}))
                .catch(err => {
                    this.setState({alert: "delete error"})
                    this.refreshList();
                    console.log("[Admin/Tracks]: Unable to delete track: " + err)
                })

                // record.destroy().then(() => {
                //     this.setState({
                //         alert: "delete success",
                //         tracks: newTrackList.filter(track => track.id !== record.id)
                //     });
                //     console.log("Track deleted from db")
                // }).catch(error => {
                //     this.setState({alert: "delete error"});
                //     console.log("item cannot be deleted from db");
                // })
                // ;
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
                            conference: track.get("conference").id,
                            id: track.id,
                            name: track.get("name"),
                            displayName: track.get("displayName"),
                            perProgramItemChat: track.get("perProgramItemChat"),
                            perProgramItemVideo: track.get("perProgramItemVideo")
                        }
                        Parse.Cloud.run("update-obj", data)
                        .then(c => this.setState({alert: "save success"}))
                        .catch(err => {
                            this.setState({alert: "save error"})
                            console.log("[Admin/Tracks]: Unable to save track: " + err)
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
                    title: 'Text Chats',
                    dataIndex: 'perProgramItemChat',
                    editable: true,
                    width: '5%',
                    sorter: (a, b) => {
                        var A = a.get("perProgramItemChat") ? a.get("perProgramItemChat") : "";
                        var B = b.get("perProgramItemChat") ? b.get("perProgramItemChat") : "";
                        return A.localeCompare(B);
                    },
                    //render: (text,record) => <span>{record.get("perProgramItemChat") ? (record.get("perProgramItemChat") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><Checkbox checked={record.get("perProgramItemChat") ? true : false} disabled></Checkbox>,
                    key: 'perProgramItemChat',
                },
                {
                    title: 'Video Chats',
                    dataIndex: 'perProgramItemVideo',
                    editable: true,
                    width: '5%',
                    sorter: (a, b) => {
                        var A = a.get("perProgramItemChat") ? a.get("perProgramItemChat") : "";
                        var B = b.get("perProgramItemChat") ? b.get("perProgramItemChat") : "";
                        return A.localeCompare(B);
                    },
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (text,record) =><Checkbox checked={record.get("perProgramItemVideo") ? true : false} disabled></Checkbox>,
                    key: 'perProgramItemVideo',
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.tracks.length > 0) {
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.tracks}
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
                conference: this.props.auth.currentConference.id,
                name: "One-word-name",
                displayName: "Publicly visible name",
                perProgramItemChat: false,
                perProgramItemVideo: false
            }
            Parse.Cloud.run("create-obj", data)
            .then(t => console.log("[Admin/Tracks]: sent new track to cloud"))
            .catch(err => {
                this.setState({alert: "add error"})
                console.log("[Landing]: Unable to create track: " + err)
            })
        
        }

        if (!this.props.downloaded)
            return (
                <Spin tip="Loading...">
                </Spin>)

        console.log("--> # Tracks: " + this.state.tracks.length);
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
                                searchResult: this.state.tracks.filter(
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
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <Tracks {...props} auth={value} tracks={tracks} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>

);
export default AuthConsumer;

// const CollectionEditForm = ({title, visible, data, onAction, onCancel }) => {
//     const [form] = Form.useForm();
//     return (
//         <Modal
//             visible={visible}
//             title={title}
//             // okText="Create"
//             footer={[
//                 <Button form="myForm" key="submit" type="primary" htmlType="submit">
//                     Submit
//                 </Button>
//             ]}
//             cancelText="Cancel"
//             onCancel={onCancel}
//         >
//             <Form
//                 form={form}
//                 layout="vertical"
//                 name="form_in_modal"
//                 id="myForm"
//                 initialValues={{
//                     modifier: 'public',
//                     ...data
//                 }}
//                 onFinish={() => {
//                     form
//                         .validateFields()
//                         .then(values => {
//                             form.resetFields();
//                             onAction(values);
//                         })
//                         .catch(info => {
//                             console.log('Validate Failed:', info);
//                         });
//                 }}
//             >
//                 <Form.Item name="objectId" noStyle>
//                     <Input type="text" type="hidden" />
//                 </Form.Item>
//                 <Form.Item
//                     name="name"
//                     rules={[
//                         {
//                             required: true,
//                             message: 'Please input the name of the track!',
//                         },
//                     ]}
//                 >
//                     <Input placeholder="Name"/>
//                 </Form.Item>
//                 <Form.Item name="displayName">
//                     <Input style={{ width: '100%' }} type="textarea" placeholder="Display Name"/>
//                 </Form.Item>
//                 <Form.Item name="perProgramItemChat" valuePropName="checked">
//                     <Checkbox>
//                         Create a chat channel for each program item
//                     </Checkbox>
//                 </Form.Item>
//                 <Form.Item name="perProgramItemVideo" valuePropName="checked">
//                     <Checkbox>
//                         Create a video room for each program item
//                     </Checkbox>
//                 </Form.Item>
//             </Form>
//         </Modal>
//     );
// };