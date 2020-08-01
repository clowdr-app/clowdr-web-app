import React from 'react';
import {Button, message, Popconfirm, Select, Space, Spin, Table, Tabs, Upload} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";

import {UploadOutlined} from '@ant-design/icons';
import { ClowdrAppState } from "../../../../ClowdrTypes";
import { UploadChangeParam, RcFile } from 'antd/lib/upload/interface';

interface ProgramSummaryProps {
    auth: ClowdrAppState,
}

interface ProgramSummaryState {
    loading: boolean,
    visible: boolean,
    deleteLoading: boolean,
    ProgramSessions: Parse.Object[],
    ProgramItems: Parse.Object[],
    ProgramTracks: Parse.Object[],
    ProgramRooms: Parse.Object[],
    ProgramPersons: Parse.Object[],
}

const { Option } = Select;

class ProgramSummary extends React.Component<ProgramSummaryProps, ProgramSummaryState> {
    currentConference: any;
    constructor(props: ProgramSummaryProps) {
        super(props); // has props.auth
        this.state = {
            loading: true,
            visible: true,
            deleteLoading: false,
            ProgramSessions: [],
            ProgramItems: [],
            ProgramTracks: [],
            ProgramRooms: [],
            ProgramPersons: [],
        };
        // this.currentConference = "XYZ";
        this.currentConference = this.props.auth.currentConference;
    }

    onChange(info: UploadChangeParam) { 
        console.log("onChange " + info.file.status);
        if (info.file.status !== 'uploading') {
            console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    async componentDidMount() {
        let program = await this.props.auth.programCache.getEntireProgram(this);
        this.setState({...program, loading: false});
    }
    
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramItem", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramRoom", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramPerson", this, undefined);
        this.props.auth.programCache.cancelSubscription("ProgramSession", this, undefined);
    }

    beforeUpload(file: RcFile) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = {content: reader.result, conference: this.currentConference.id};
            Parse.Cloud.run("program-upload", data)
                .then((res) => {
                    message.info("Success! Program has been uploaded")
                    console.log("Upload successfully!!!" + JSON.stringify(res));
                })
                .catch(err => {
                    console.log('Upload failed: ' + err)
                    console.log(err);
                    message.error("Error uploading program, please see console for debugging")
                });
        }
        reader.readAsText(file);
        return false;
    }
    
    async deleteProgram(){
        this.setState({deleteLoading: true});
        try {
            let itemsQ = new Parse.Query("ProgramItem");
            itemsQ.equalTo("conference", this.currentConference);
            itemsQ.limit(10000);
            let personsQ = new Parse.Query("ProgramPerson");
            personsQ.equalTo("conference", this.currentConference);
            personsQ.limit(10000);
            let trackQ = new Parse.Query("ProgramTrack");
            trackQ.equalTo("conference", this.currentConference);
            trackQ.limit(10000);
            let roomQ = new Parse.Query("ProgramRoom");
            roomQ.equalTo("conference", this.currentConference);
            roomQ.limit(10000);
            let sessionQ = new Parse.Query("ProgramSession");
            sessionQ.equalTo("conference", this.currentConference);
            sessionQ.limit(10000);
            let [items, persons, tracks, rooms, sessions] = await Promise.all([itemsQ.find(),
                personsQ.find(), trackQ.find(), roomQ.find(), sessionQ.find()]);
            await Parse.Object.destroyAll(items.concat(persons).concat(tracks).concat(rooms).concat(sessions));
            message.info("Deleted entire program");
        } catch(err) {
            message.error("Unable to delete program");
            console.log(err);
            console.log(err.errors);
            // message.error(err);
        }

        this.setState({deleteLoading: false});
    }

    render() {
        const columns = [
            {
                title: 'Sessions',
                dataIndex: 'sessions_c',
                key: 'sessions',
            },
            {
                title: 'Items',
                dataIndex: 'items_c',
                key: 'items',
            },
            {
                title: 'Tracks',
                dataIndex: 'tracks_c',
                key: 'tracks',
            },
            {
                title: 'Rooms',
                dataIndex: 'rooms_c',
                key: 'rooms',
            },
            {
                title: 'People',
                dataIndex: 'people_c',
                key: 'people',
            }
        ];

        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        let counts = [
            {
                key: 1,
                sessions_c: this.state.ProgramSessions.length,
                items_c: this.state.ProgramItems.length,
                tracks_c: this.state.ProgramTracks.length,
                rooms_c: this.state.ProgramRooms.length,
                people_c: this.state.ProgramPersons.length
            }
        ]
        
        return (
            <div>
                <Upload accept=".json, .csv" onChange={this.onChange.bind(this)} beforeUpload={this.beforeUpload.bind(this)}>
                    <Button>
                        <UploadOutlined /> Click to upload program data
                    </Button>
                </Upload>
                <Popconfirm title="Are you sure you want to delete the entire program? This can't be undone." onConfirm={this.deleteProgram.bind(this)}><Button type="primary" danger loading={this.state.deleteLoading}>Delete entire program</Button></Popconfirm>
                <Table
                    columns={columns} 
                    dataSource={counts}
                    rowKey={(r)=>(r.key)}
                    pagination={{ defaultPageSize: 500,
                        pageSizeOptions: ['10', '20', '50', '100', '500'], 
                        position: ['topRight', 'bottomRight']
                    }}/>
            </div>
        )
    }
}

const AuthConsumer = (props: ProgramSummaryProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :    // @ts-ignore    TS: Can it really be null??
            <ProgramSummary {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;
