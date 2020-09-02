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
import ProgramTrack from '../../../../classes/ParseObjects/ProgramTrack';
import SocialSpace from '../../../../classes/ParseObjects/SocialSpace';

interface ProgramTracksProps {
    auth: ClowdrState;
}

interface ProgramTracksState {
    loading: boolean;
    alert: string | undefined;
    ProgramTracks: ProgramTrack[];
    socialSpaces: SocialSpace[];
    editing: boolean;
    searched: boolean;
    searchResult: ProgramTrack[];
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
        let socialSpaceQ = new Parse.Query<SocialSpace>("SocialSpace");
        socialSpaceQ.equalTo("conference", this.props.auth.currentConference);
        let [spaces, tracks] = await Promise.all([socialSpaceQ.find(),
        this.props.auth.programCache.getProgramTracks(this)]);
        this.setState({ socialSpaces: spaces, loading: false, ProgramTracks: tracks });
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this, undefined);
    }

    onChangeExhibit(record: ProgramTrack, e: RadioChangeEvent) {
        console.log("--> radio changed " + e.target.value);
        record.set("exhibit", e.target.value);
    }

    onChangeChat(record: ProgramTrack) {
        record.set("perProgramItemChat", !record.perProgramItemChat);
    }

    onChangeVideo(record: ProgramTrack) {
        record.set("perProgramItemVideo", !record.perProgramItemVideo);
    }

    onToggle(record: ProgramTrack, key: string) { //why did nobody write this like this?? :(
        record.set(key, !record.get(key));
    }

    render() {
        // Set up editable table cell
        const EditableCell: React.FC<EditableCellProps<ProgramTrack>> = ({
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
                            defaultChecked={record.perProgramItemChat}
                            onChange={this.onChangeChat.bind(this, record)}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('perProgramItemVideo'):
                    inputNode = (
                        <span title="Do the track's items get their own video channels?"><Checkbox
                            defaultChecked={record.perProgramItemVideo}
                            onChange={this.onChangeVideo.bind(this, record)}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('showAsEvents'):
                    inputNode = (
                        <span title="Do the track's items show as individual events in the program (default is grouped as sessions)?"><Checkbox
                            defaultChecked={record.showAsEvents}
                            onChange={this.onToggle.bind(this, record, "showAsEvents")}
                        >
                        </Checkbox></span>
                    );
                    break;
                case ('exhibit'):
                    inputNode = (
                        <Radio.Group onChange={this.onChangeExhibit.bind(this, record)}
                            value={record.exhibit}>
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
            const isEditing = (record: ProgramTrack): boolean => record.id === editingKey;

            const edit = (record: ProgramTrack): void => {
                form.setFieldsValue({
                    name: record.name ? record.name : "",
                    displayName: record.displayName ? record.displayName : "",
                    exhibit: record.exhibit ? record.exhibit : "",
                    perProgramItemChat: record.perProgramItemChat,
                    perProgramItemVideo: record.perProgramItemVideo,
                    badgeText: record.badgeText,
                    badgeColor: record.badgeColor,
                    showAsEvents: record.showAsEvents
                });
                setEditingKey(record.id)
            }

            const cancel = (): void => {
                setEditingKey('');
            };

            const onDelete = (record: ProgramTrack): void => {
                // delete from database
                let data = {
                    clazz: "ProgramTrack",
                    conference: { clazz: "ClowdrInstance", id: record.conference.id },
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
                    const newData = [...data];
                    let track = newData.find(track => track.id === id);

                    if (track) {
                        track.set("name", row.name);
                        track.set("displayName", row.displayName);
                        track.set("badgeText", row.badgeText);
                        track.set("badgeColor", row.badgeColor);
                        await track.save();
                        setEditingKey('');
                    }
                    else {
                        // TODO: Totally broken - see comments in rest of admin interface
                        // @ts-ignore
                        newData.push(row as ProgramTrack);
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
                    sorter: (a: ProgramTrack, b: ProgramTrack) => {
                        let nameA: string = a.name ? a.name : "";
                        let nameB: string = b.name ? b.name : "";
                        return nameA.localeCompare(nameB);
                    },
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <span>{record.name}</span>,
                },
                {
                    title: 'Display Name',
                    dataIndex: 'displayName',
                    editable: true,
                    width: '20%',
                    sorter: (a: ProgramTrack, b: ProgramTrack) => {
                        let displayNameA: string = a.displayName ? a.displayName : "";
                        let displayNameB: string = b.displayName ? b.displayName : "";
                        return displayNameA.localeCompare(displayNameB);
                    },
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <span>{record.displayName}</span>,
                    key: 'displayName',
                },
                {
                    title: 'Exhibit',
                    dataIndex: 'exhibit',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.perProgramItemChat ? (record.perProgramItemChat ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <span>{record.exhibit}</span>,
                    key: 'exhibit',
                },
                {
                    title: 'Text Channels',
                    dataIndex: 'perProgramItemChat',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.perProgramItemChat ? (record.perProgramItemChat ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <Checkbox checked={!!record.perProgramItemChat} disabled></Checkbox>,
                    key: 'perProgramItemChat',
                },
                {
                    title: 'Video Chats',
                    dataIndex: 'perProgramItemVideo',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.perProgramItemVideo ? (record.perProgramItemVideo ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <Checkbox checked={!!record.perProgramItemVideo} disabled></Checkbox>,
                    key: 'perProgramItemVideo',
                },
                {
                    title: 'Show as Events',
                    dataIndex: 'showAsEvents',
                    editable: true,
                    width: '5%',
                    //render: (text,record) => <span>{record.perProgramItemVideo ? (record.perProgramItemVideo ? "True" : "False") : "False"}</span>,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <Checkbox checked={!!record.showAsEvents} disabled></Checkbox>,
                    key: 'showAsEvents',
                },
                {
                    title: 'Tag Text',
                    dataIndex: 'badgeText',
                    editable: true,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <span>{record.badgeText}</span>,
                    key: 'badgeText',
                },
                {
                    title: 'Tag Color',
                    dataIndex: 'badgeColor',
                    editable: true,
                    render: (_: string, record: ProgramTrack): JSX.Element | null => <span>{record.badgeColor}</span>,
                    key: 'badgeColor',
                },

                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_: string, record: ProgramTrack): JSX.Element | null => {
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
                    onCell: (record: ProgramTrack) => ({
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
                                    (track.name && track.name.toLowerCase().includes(key.toLowerCase()))
                                    || (track.displayName && track.displayName.toLowerCase().includes(key.toLowerCase())))
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

