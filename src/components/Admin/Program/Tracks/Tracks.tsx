import React, { useState } from 'react';
import { Button, Form, Input, Popconfirm, Radio, Space, Spin, Table, Checkbox, Alert } from "antd";
import Parse from "parse";
import { AuthUserContext } from "../../../Session";
import {
    DeleteOutlined,
    EditOutlined,
    SaveTwoTone,
    CloseCircleTwoTone
} from '@ant-design/icons';
import { ClowdrState, EditableCellProps } from "../../../../ClowdrTypes";
import { RadioChangeEvent } from "antd/lib/radio";
import { Store } from 'antd/lib/form/interface';
import assert from 'assert';

interface ProgramTracksProps {
    auth: ClowdrState;
}

interface ProgramTracksState {
    loading: boolean;
    alert: string | undefined;
    ProgramTracks: Parse.Object[];
    socialSpaces: Parse.Object[];
    editing: boolean;
    searched: boolean;
    searchResult: Parse.Object[];
    visible: boolean
}

class Tracks extends React.Component<ProgramTracksProps, ProgramTracksState> {
    constructor(props: ProgramTracksProps) {
        super(props);
        console.log(this.props);
        this.state = {
            loading: true,
            alert: undefined,
            ProgramTracks: [],
            socialSpaces: [],
            editing: false,
            searched: false,
            searchResult: [],
            visible: false    // is init val false? never used
        };
    }

    setVisible() {
        this.setState({ visible: !this.state.visible });
    }

    async componentDidMount() {
        let socialSpaceQ = new Parse.Query("SocialSpace");
        socialSpaceQ.equalTo("conference", this.props.auth.currentConference);
        let [spaces, tracks] = await Promise.all([socialSpaceQ.find(),
        this.props.auth.programCache.getProgramTracks(this)]);
        this.setState({ socialSpaces: spaces, loading: false, ProgramTracks: tracks });
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this, undefined);
    }

    onChangeExhibit(record: Parse.Object, e: RadioChangeEvent) {
        console.log("--> radio changed " + e.target.value);
        record.set("exhibit", e.target.value);
    }

    onChangeChat(record: Parse.Object) {
        record.set("perProgramItemChat", !record.get("perProgramItemChat"));
    }

    onChangeVideo(record: Parse.Object) {
        record.set("perProgramItemVideo", !record.get("perProgramItemVideo"));
    }

    onToggle(record: Parse.Object, key: string) { //why did nobody write this like this?? :(
        record.set(key, !record.get(key));
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
            let inputNode: JSX.Element | null;
            switch (dataIndex) {
                case ('name'):
                    inputNode = <Input title="Short name used internally, e.g. papers" />;
                    break;
                case ('displayName'):
                    inputNode = <Input title="Name that participants see, e.g. Research Papers" />;
                    break;
                case ('perProgramItemChat'):
                    inputNode = (
                        <span title="Do the track's items get their own text channels?"><Checkbox
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
                            onChange={this.onChangeVideo.bind(this, record)}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('showAsEvents'):
                    inputNode = (
                        <span title="Do the track's items show as individual events in the program (default is grouped as sessions)?"><Checkbox
                            defaultChecked={record.get("showAsEvents")}
                            onChange={this.onToggle.bind(this, record, "showAsEvents")}
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
                case ('badgeText'):
                    inputNode = <Input title="Short tag to appear next to events in this track" />;
                    break;
                case ('badgeColor'):
                    inputNode = <Input title="Color of the tag to appear next to events in this track" />;
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
                            valuePropName={dataIndex === 'perProgramItemChat' || dataIndex === 'perProgramItemVideo' ? "checked" : "value"}
                            style={{
                                margin: 0,
                            }}
                            rules={[
                                {
                                    required: dataIndex === 'name',
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [data, setData] = useState(this.state.ProgramTracks);
            const [editingKey, setEditingKey] = useState('');
            const isEditing = (record: Parse.Object): boolean => record.id === editingKey;

            const edit = (record: Parse.Object): void => {
                form.setFieldsValue({
                    name: record.get("name") ? record.get("name") : "",
                    displayName: record.get("displayName") ? record.get("displayName") : "",
                    exhibit: record.get("exhibit") ? record.get("exhibit") : "",
                    perProgramItemChat: record.get("perProgramItemChat"),
                    perProgramItemVideo: record.get("perProgramItemVideo"),
                    badgeText: record.get("badgeText"),
                    badgeColor: record.get("badgeColor"),
                    showAsEvents: record.get("showAsEvents")
                });
                setEditingKey(record.id)
            }

            const cancel = (): void => {
                setEditingKey('');
            };

            const onDelete = (record: Parse.Object): void => {
                // delete from database
                let data = {
                    clazz: "ProgramTrack",
                    conference: { clazz: "ClowdrInstance", id: record.get("conference").id },
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                    .then(c => this.setState({ alert: "delete success" }))
                    .catch(err => {
                        this.setState({ alert: "delete error" })
                        // this.refreshList();
                        console.log("[Admin/Tracks]: Unable to delete: " + err)
                    })
            };

            const save = async (id: string) => {
                console.log("Entering save func");
                try {
                    const row: Store = await form.validateFields();
                    const newData: Parse.Object[] = [...data];
                    let track: Parse.Object | undefined = newData.find(track => track.id === id);

                    if (track) {
                        track.set("name", row.name);
                        track.set("displayName", row.displayName);
                        track.set("badgeText", row.badgeText);
                        track.set("badgeColor", row.badgeColor);
                        await track.save();
                        setEditingKey('');
                    }
                    else {
                        newData.push(row as Parse.Object);
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
                    width: '20%',
                    sorter: (a: Parse.Object, b: Parse.Object) => {
                        let nameA: string = a.get("name") ? a.get("name") : "";
                        let nameB: string = b.get("name") ? b.get("name") : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: Parse.Object): JSX.Element | null => <span>{record.get("name")}</span>,
                },
                {
                    title: 'Display Name',
                    dataIndex: 'displayName',
                    editable: true,
                    width: '20%',
                    sorter: (a: Parse.Object, b: Parse.Object) => {
                        let displayNameA: string = a.get("displayName") ? a.get("displayName") : "";
                        let displayNameB: string = b.get("displayName") ? b.get("displayName") : "";
                        return displayNameA.localeCompare(displayNameB);
                    },
                    render: (_: string, record: Parse.Object): JSX.Element | null => <span>{record.get("displayName")}</span>,
                    key: 'displayName',
                },
                {
                    title: 'Exhibit',
                    dataIndex: 'exhibit',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemChat") ? (record.get("perProgramItemChat") ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <span>{record.get("exhibit")}</span>,
                    key: 'exhibit',
                },
                {
                    title: 'Text Channels',
                    dataIndex: 'perProgramItemChat',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemChat") ? (record.get("perProgramItemChat") ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <Checkbox checked={!!record.get("perProgramItemChat")} disabled></Checkbox>,
                    key: 'perProgramItemChat',
                },
                {
                    title: 'Video Chats',
                    dataIndex: 'perProgramItemVideo',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <Checkbox checked={!!record.get("perProgramItemVideo")} disabled></Checkbox>,
                    key: 'perProgramItemVideo',
                },
                {
                    title: 'Show as Events',
                    dataIndex: 'showAsEvents',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.get("perProgramItemVideo") ? (record.get("perProgramItemVideo") ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <Checkbox checked={!!record.get("showAsEvents")} disabled></Checkbox>,
                    key: 'showAsEvents',
                },
                {
                    title: 'Tag Text',
                    dataIndex: 'badgeText',
                    editable: true,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <span>{record.get("badgeText")}</span>,
                    key: 'badgeText',
                },
                {
                    title: 'Tag Color',
                    dataIndex: 'badgeColor',
                    editable: true,
                    render: (_: string, record: Parse.Object): JSX.Element | null => <span>{record.get("badgeColor")}</span>,
                    key: 'badgeColor',
                },

                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_: string, record: Parse.Object): JSX.Element | null => {
                        const editable: boolean = isEditing(record);
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
                                        <a title="Edit" onClick={() => { if (editingKey === '') edit(record) }}>
                                            {/*<a title="Edit" disabled={editingKey !== ''} onClick={() => edit(record)}>*/}
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
                        pagination={{
                            defaultPageSize: 500,
                            pageSizeOptions: ['10', '20', '50', '100', '500'],
                            position: ['topRight', 'bottomRight']
                        }}
                    />
                </Form>
            );
        };

        const newTrack = (): void => {
            assert(this.props.auth.currentConference, "Current conference is null");

            let data = {
                clazz: "ProgramTrack",
                conference: { clazz: "ClowdrInstance", id: this.props.auth.currentConference.id },
                name: "One-word-name",
                displayName: "Publicly visible name",
                exhibit: "None",
                perProgramItemChat: false,
                perProgramItemVideo: false
            }
            Parse.Cloud.run("create-obj", data)
                .then(t => console.log("[Admin/Tracks]: sent new object to cloud"))
                .catch(err => {
                    this.setState({ alert: "add error" })
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
                onClose={() => this.setState({ alert: undefined })}
                style={{
                    margin: 16,
                    display: "inline-block",
                }}
                message={this.state.alert}
                type={this.state.alert.includes("success") ? "success" : "error"}
                showIcon
                closable
            /> : <span> </span>}
            <Input.Search
                allowClear
                onSearch={key => {
                    if (key === "") {
                        this.setState({ searched: false });
                    }
                    else {
                        this.setState({ searched: true });
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
            <EditableTable />
        </div>
    }
}

const AuthConsumer = (props: ProgramTracksProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :  // @ts-ignore  TS: Can value really be null here?
            <Tracks {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;

