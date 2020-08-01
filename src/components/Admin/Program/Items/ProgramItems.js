import React, {useState} from 'react';
import {Button, Form, Input, Popconfirm, Select, Space, Spin, Table, Alert} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";
import {DeleteOutlined, EditOutlined, SaveTwoTone, CloseCircleTwoTone} from '@ant-design/icons';

const { Option } = Select;

class ProgramItems extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            alert: undefined,
            ProgramItems: [],
            ProgramTracks: [],
            ProgramPersons: [],
            searched: false,
            searchResult: ""
        };
    }

    async componentDidMount() {
       let [items, tracks, people] = await Promise.all([
           this.props.auth.programCache.getProgramItems(this),
           this.props.auth.programCache.getProgramTracks(this),
           this.props.auth.programCache.getProgramPersons(this),
       ]);
       this.setState({
           ProgramItems: items,
           ProgramPersons: people,
           ProgramTracks: tracks,
           downloaded: true
       })
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramItem", this);
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this);
        this.props.auth.programCache.cancelSubscription("ProgramPerson", this);
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
                        optionFilterProp="label"
                        options={this.state.ProgramPersons.sort((a,b)=>(
                            a.get('name').localeCompare(b.get('name'))
                        )).map(p=>({value: p.id, label:p.get('name')}))}
                        mode="tags"
                        />
                }
                else {
                    return <Select
                        placeholder="Choose a track"
                    >
                        {this.state.ProgramTracks.map(track => (
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
            const [data, setData] = useState(this.state.ProgramItems);
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
                // delete from database
                let data = {
                    clazz: "ProgramItem",
                    conference: {clazz: "ClowdrInstance", id: record.get("conference").id},
                    id: record.id
                }
                Parse.Cloud.run("delete-obj", data)
                .then(c => this.setState({
                    alert: "delete success",
                    searchResult: this.state.searched ?  this.state.searchResult.filter(r => r.id !== record.id): ""
                }))
                .catch(err => {
                    this.setState({alert: "delete error"})
                    this.refreshList();
                    console.log("[Admin/Items]: Unable to delete: " + err)
                })

            }

            // cancel all edited fields
            const onCancel = () => {
                setEditingKey('');
            };

            // save current editing item
            const onSave = async id => {
                try {
                    const row = await form.validateFields();
                    const newData = [...data];
                    let item = newData.find(item => item.id === id);

                    if (item) {
                        let newTrack = this.state.ProgramTracks.find(t => t.id === row.track);
                        if (newTrack) {
                            item.set("track", newTrack)
                        }
                        let newAuthors = [];
                        for(let a of row.authors) {
                            let newAuthor = this.state.ProgramPersons.find(p => p.id === a);
                            if(!newAuthor){
                                //Create a new program person
                                let data = {
                                    clazz: "ProgramPerson",
                                    conference: {clazz: "ClowdrInstance", id: this.props.auth.currentConference.id},
                                    confKey: "authors/author-"+new Date().getTime(),
                                    name: a
                                }
                                let res = await Parse.Cloud.run("create-obj", data)
                                    .catch(err => {
                                        this.setState({alert: "add error"})
                                        console.log("[Admin/Persons]: Unable to create: " + err)
                                    })
                                let programperson = Parse.Object.extend("ProgramPerson");
                                newAuthor = new programperson();
                                newAuthor.id = res.id;
                                newAuthor.set("name", a);
                            }
                            newAuthors.push(newAuthor);
                        }

                        console.log(newAuthors)
                        item.set("title", row.title);
                        item.set("authors", newAuthors);
                        item.set("abstract", row.abstract);
                        setData(newData);

                        let data = {
                            clazz: "ProgramItem",
                            id: item.id,
                            conference: {clazz: "ClowdrInstance", id: item.get("conference").id},
                            title: item.get("title"),
                            authors: item.get("authors").map(a => {return {clazz: "ProgramPerson", id: a.id}}),
                            abstract: item.get("abstract"),
                            track: {clazz: "ProgramTrack", id: item.get("track").id}
                        }
                        Parse.Cloud.run("update-obj", data)
                        .then(c => this.setState({alert: "save success"}))
                        .catch(err => {
                            this.setState({alert: "save error"})
                            console.log("[Admin/Items]: Unable to save track: " + err)
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
                    width: '20%',
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
                        if (this.state.ProgramItems.length > 0) {
                            return editable ? (
                                <span>
                                <a
                                    onClick={() => onSave(record.id)}
                                    style={{
                                        marginRight: 8,
                                    }}
                                >
                                    {<SaveTwoTone />}
                                </a>
                                <Popconfirm title="Sure to cancel?" onConfirm={onCancel}>
                                    <a>{<CloseCircleTwoTone />}</a>
                                </Popconfirm>
                            </span>
                            ) : (
                                <Space size='small'>
                                    <a title="Edit" disabled={editingKey !== ''} onClick={() => onEdit(record)}>
                                        {<EditOutlined />}
                                    </a>
                                    <Popconfirm
                                        title="Are you sure delete this item?"
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
                        rowKey="id"
                        components={{
                            body: {
                                cell: EditableCell,
                            },
                        }}
                        bordered
                        dataSource={this.state.searched ? this.state.searchResult : this.state.ProgramItems}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        rowKey='id'
                        pagination={{
                            onChange: onCancel,
                            defaultPageSize: 500,
                            pageSizeOptions: [10, 20, 50, 100, 500],
                            position: ['topRight', 'bottomRight']
                        }}
                    />
                </Form>
            );
        };

        // handle when a new item is added
        const handleAdd = () => {
            let data = {
                clazz: "ProgramItem",
                conference: {clazz: "ClowdrInstance", id: this.props.auth.currentConference.id},
                title: "Please input the title",
                confKey: "items/item-"+new Date().getTime(),
                abstract: "Please input the abstract",
                authors: []
            }
            Parse.Cloud.run("create-obj", data)
            .then(t => console.log("[Admin/Items]: sent new object to cloud"))
            .catch(err => {
                this.setState({alert: "add error"})
                console.log("[Admin/Items]: Unable to create: " + err)
            })

        };

        if (!this.state.downloaded) {
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
                                searchResult: this.state.ProgramItems.filter(
                                    item =>
                                        (item.get('title') && item.get('title').toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('track') && item.get('track').get('name') && item.get('track').get("name").toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('abstract') && item.get('abstract').toLowerCase().includes(key.toLowerCase()))
                                        || (item.get('authors') && item.get('authors').some(a => a.get("name") && a.get("name").toLowerCase().includes(key.toLowerCase())))
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
                <AuthUserContext.Consumer>
                    {value => (
                        <ProgramItems {...props} auth={value}  />
                    )}
                </AuthUserContext.Consumer>

    );

export default AuthConsumer;