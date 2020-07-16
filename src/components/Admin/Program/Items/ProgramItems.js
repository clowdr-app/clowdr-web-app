import React, {useState} from 'react';
import {Button, Form, Input, Popconfirm, Select, Space, Spin, Table, Alert} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import {DeleteOutlined, EditOutlined} from '@ant-design/icons';

const { Option } = Select;

class ProgramItems extends React.Component {
    constructor(props) {
        super(props);
        console.log("[Admin/Items]: program downloaded?" + this.props.downloaded);
        this.state = {
            loading: true,
            alert: undefined,
            items: [],
            tracks: [],
            people: [],
            gotItems: false,
            gotTracks: false,
            gotPeople: false,
            searched: false,
            searchResult: ""
        };

        // Call to download program
        if (!this.props.downloaded)
            this.props.onDown(this.props);
        else {
            this.state.items = this.props.items;
            this.state.tracks = this.props.tracks;
            this.state.people = this.props.people;
        }
    }

    componentDidUpdate(prevProps) {
        console.log("[Admin/Items]: Something changed");

        if (this.state.loading) {
            if (this.state.gotTracks && this.state.gotItems && this.state.gotPeople) {
                // console.log('[Admin/Items]: Program download complete');
                this.setState({
                    items: this.props.items,
                    tracks: this.props.tracks,
                    people: this.props.people,
                    loading: false
                });
            }
            else {
                // console.log('[Admin/Items]: Program still downloading...');
                if (prevProps.tracks.length != this.props.tracks.length) {
                    this.setState({gotTracks: true});
                    // console.log('[Admin/Items]: got tracks');
                }
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true})
                    // console.log('[Admin/Items]: got items');
                }
                if (prevProps.people.length != this.props.people.length) {
                    this.setState({gotPeople: true})
                    // console.log('[Admin/Items]: got people');
                }
            }
        }
        else
            console.log('[Admin/Items]: Program cached');
    }


    refreshList(){
        let query = new Parse.Query("ProgramItem");
        console.log('Current conference: ' + this.props.auth.currentConference.get('name'));
        query.equalTo("conference", this.props.auth.currentConference);
        query.limit(5000);
        query.find().then(res=>{
            console.log('Found items ' + res.length);
            this.setState({
                items: res,
                loading: false
            });
        })
    }

    componentWillUnmount() {
        // this.sub.unsubscribe();
    }

    render() {
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
            const inputNode = (dataIndex) => {
                if (dataIndex === "title" || dataIndex === "abstract") {
                    return <Input.TextArea autoSize={{ minRows: 2, maxRows: 10 }}/>;
                }
                else if (dataIndex === "authors") {
                    return <Select
                        placeholder="Choose authors"
                        style={{ width: 400 }}
                        mode="multiple"
                    >
                        {this.state.people.map(p => (
                            <Option key={p.id} value={p.id}>{p.get('name')}</Option>
                        ))}
                    </Select>
                }
                else {
                    return <Select
                        placeholder="Choose a track"
                    >
                        {this.state.tracks.map(track => (
                            <Option
                                key={track.id}
                                value={track.id}
                            >
                                {track.get('name')}
                            </Option>
                        ))}
                    </Select>
                }
            };
            return (
                <td {...restProps}>
                    {editing ? (
                        <Form.Item
                            name={dataIndex}
                            style={{
                                margin: 0,
                            }}
                            rules={dataIndex === "authors" || dataIndex ==="abstract" ? []: [
                                {
                                    required: true,
                                    message: `Please Input ${title}!`,
                                },
                            ]}
                        >
                            {inputNode(dataIndex)}
                        </Form.Item>
                    ) : (
                        children
                    )}
                </td>
            );
        };

        const EditableTable = () => {
            const [form] = Form.useForm();
            const [data, setData] = useState(this.state.items);
            const [editingKey, setEditingKey] = useState('');

            const isEditing = record => record.id === editingKey;

            const onEdit = record => {
                let currentAuthors = [];
                if (record.get("authors")) {
                    record.get("authors").map(a => {
                        currentAuthors.push(a.id);
                    })
                }
                form.setFieldsValue({
                    title: record.get("title") ? record.get("title") : "",
                    authors: currentAuthors,
                    abstract: record.get("abstract"),
                    track: record.get("track") ? record.get("track").get("name") : ""
                });
                setEditingKey(record.id);
            };

            const onDelete = record => {
                const newItemList = [...this.state.items];

                // delete from database
                record.destroy()
                    .then(() => {
                        this.setState({
                            alert: "delete success",
                            items: newItemList.filter(item => item.id !== record.id),
                            searchResult: this.state.searched ?  this.state.searchResult.filter(r => r.id !== record.id): ""
                        });
                        console.log("item deleted from db");})
                    .catch(error => {
                        this.setState({alert: "delete error"});
                        console.log("item cannot be deleted from db");
                    });
            }

            // cancel all edited fields
            const onCancel = () => {
                setEditingKey('');
            };

            // save current editing session
            const onSave = async id => {
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let item = newData.find(item => item.id === id);

                    if (item) {
                        let newTrack = this.state.tracks.find(t => t.id === row.track);
                        if (newTrack) {
                            item.set("track", newTrack)
                        } else {
                            console.log("track not found");
                        }
                        let newAuthors = [];
                        row.authors.map(a => {
                            const newAuthor = this.state.people.find(p => p.id === a);
                            newAuthors.push(newAuthor);
                        })
                        item.set("title", row.title);
                        item.set("authors", newAuthors);
                        item.set("abstract", row.abstract);
                        setData(newData);
                        item.save()
                            .then((response) => {
                                console.log('Updated ProgramItem', response);
                                this.setState({alert: "save success"});})
                            .catch(err => {
                                console.log(err);
                                console.log("@" + item.id);
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
                    console.log('Validate Failed:', errInfo);
                }
            };

            const columns = [
                {
                    title: 'Title',
                    dataIndex: 'title',
                    width: '30%',
                    editable: true,
                    sorter: (a, b) => {
                        const titleA = a.get("title") ? a.get("title") : "";
                        const titleB = b.get("title") ? b.get("title") : "";
                        return titleA.localeCompare(titleB);
                    },
                    render: (text, record) => <span>{record.get("title")}</span>
                },
                {
                    title: 'Abstract',
                    dataIndex: 'abstract',
                    width: '30%',
                    editable: true,
                    sorter: (a, b) => {
                        const abstractA = a.get("abstract") ? a.get("abstract") : "";
                        const abstractB = b.get("abstract") ? b.get("abstract") : "";
                        return abstractA.localeCompare(abstractB);
                    },
                    render: (text, record) =>
                        <span>
                            {record.get("abstract").length > 150 ? record.get("abstract").substring(0, 150) + "..." : record.get("abstract")}
                        </span>
                },
                {
                    title: 'Authors',
                    dataIndex: 'authors',
                    width: '20%',
                    editable: true,
                    render: (text, record) => record.get("authors") ? <ul>{record.get("authors").map(author => (
                        <li key={author.id} value={author.get("name")}>{author.get("name")}</li>
                    ))}</ul> : <span> </span>
                },
                {
                    title: 'Track',
                    dataIndex: 'track',
                    width: '10%',
                    editable: true,
                    sorter: (a, b) => {
                        const trackA = a.get("track") ? a.get("track").get("name") : "";
                        const trackB = b.get("track") ? b.get("track").get("name") : "";
                        return trackA.localeCompare(trackB);
                    },
                    render: (text,record) => <span>{record.get("track") ? record.get("track").get("name") : ""}</span>
                },
                {
                    title: 'Action',
                    dataIndex: 'action',
                    render: (_, record) => {
                        const editable = isEditing(record);
                        if (this.state.items.length > 0) {
                            return editable ? (
                                <span>
                                <a
                                    onClick={() => onSave(record.id)}
                                    style={{
                                        marginRight: 8,
                                    }}
                                >
                                    Save
                                </a>
                                <Popconfirm title="Sure to cancel?" onConfirm={onCancel}>
                                    <a>Cancel</a>
                                </Popconfirm>
                            </span>
                            ) : (
                                <Space size='small'>
                                    <a title="Edit" disabled={editingKey !== ''} onClick={() => onEdit(record)}>
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
                        dataSource={this.state.searched ? this.state.searchResult : this.state.items}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        pagination={{
                            onChange: onCancel,
                        }}
                    />
                </Form>
            );
        };

        // handle when a new item is added
        const handleAdd = () => {
            const ProgramItem = Parse.Object.extend('ProgramItem');
            const myNewObject = new ProgramItem();

            myNewObject.set('title', 'please input the title');
            myNewObject.set('abstract', 'please input the abstract');
            myNewObject.set('conference', this.props.auth.currentConference);

            myNewObject.save().then(
                (result) => {
                    console.log('ProgramItem created', result);
                    this.setState({
                        alert: "add success",
                        items: [myNewObject, ...this.state.items]
                    })
                },
                (error) => {
                    this.setState({alert: "add error"});
                    console.error('Error while creating ProgramItem: ', error);
                }
            );
        };

        if (!this.props.downloaded) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
        return (
            <div>
                <div>
                    <Button
                        onClick={handleAdd}
                        type="primary"
                        style={{
                            margin: 16,
                            display: "inline-block"
                        }}
                    >
                        Add an item
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
                </div>

                <Input.Search
                    allowClear
                    placeholder="search anything"
                    onSearch={key => {
                        if (key === "") {
                            this.setState({searched: false});
                        }
                        else {
                            this.setState({searched: true});
                            this.setState({
                                searchResult: this.state.items.filter(
                                    item =>
                                        (item.get('title') && item.get('title').toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('track') && item.get('track').get("name").toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('abstract') && item.get('abstract').toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('authors') && item.get('authors').some(a => a.get("name").toLowerCase().includes(key.toLowerCase())))
                                )
                            })
                        }
                    }
                    }
                />
                <EditableTable />
            </div>
        )
    }
}

const
    AuthConsumer = (props) => (
        <ProgramContext.Consumer>
            {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
                <AuthUserContext.Consumer>
                    {value => (
                        <ProgramItems {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} people={people} onDown={onDownload} downloaded={downloaded}/>
                    )}
                </AuthUserContext.Consumer>
            )}
        </ProgramContext.Consumer>

    );

export default AuthConsumer;