import React, {Fragment} from 'react';
import { Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs, message, Upload } from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";
import {ProgramContext} from "../../../Program";

import {
    UploadOutlined
} from '@ant-design/icons';

const { Option } = Select;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);


class ProgramSummary extends React.Component {
    constructor(props) {
        super(props); // has props.auth
        this.state = {
            loading: true,
            gotTracks: false,
            gotRooms: false,
            gotItems: false,
            gotSessions: false,
            gotPeople: false,
            counts: [
                {key: 1, 
                sessions_c: this.props.sessions.length, 
                items_c: this.props.items.length, 
                tracks_c: this.props.tracks.length, 
                rooms_c: this.props.rooms.length, 
                people_c: this.props.people.length}
            ]
        };
        // this.currentConference = "XYZ";
        this.currentConference = this.props.auth.currentConference;

        console.log('[Admin/Program]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else
            this.state.loading = false;
    }

    onChange(info) {
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

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        console.log("[Admin/Program]: Something changed");

        if (this.state.loading) {
            if (this.state.gotRooms && this.state.gotSessions && this.state.gotTracks && this.state.gotItems && this.state.gotPeople) {
                console.log('[Admin/Program]: Program download complete');
                this.refreshList();
            }
            else {
                console.log('[Admin/Program]: Program still downloading...');
                if (prevProps.tracks.length != this.props.tracks.length) {
                    this.setState({gotTracks: true});
                    console.log('[Admin/Program]: got tracks');
                }
                if (prevProps.rooms.length != this.props.rooms.length) {
                    this.setState({gotRooms: true});
                    console.log('[Admin/Program]: got rooms');
                }
                if (prevProps.sessions.length != this.props.sessions.length) {
                    this.setState({gotSessions: true});
                    console.log('[Admin/Program]: got sessions');
                }
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true});
                    console.log('[Admin/Program]: got items');
                }
                if (prevProps.people.length != this.props.people.length) {
                    this.setState({gotPeople: true});
                    console.log('[Admin/Program]: got people');
                }
            }
        }
        else {
            console.log('[Admin/Program]: Program cached ' + this.state.loading);
            if ((prevProps.rooms.length != this.props.rooms.length) || (prevProps.sessions.length != this.props.sessions.length) ||
                (prevProps.tracks.length != this.props.tracks.length) || (prevProps.items.length != this.props.items.length) ||
                (prevProps.people.length != this.props.people.length))
            {
                console.log('[Admin/Program]: changes in something');
                this.refreshList();
            }
        }
    }


    beforeUpload(file, fileList) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = {content: reader.result, conference: this.currentConference.id};
            Parse.Cloud.run("program-upload", data)
                .then((res) => {
                    console.log("Upload successfully!!!" + JSON.stringify(res));
                    this.setState({
                        counts: [res.sessions.length, res.items.length, res.tracks.length, res.rooms.length, res.people.length]
                    });            
                })
                .catch(err => console.log('Upload failed: ' + err));
        }
        reader.readAsText(file);
        return false;
    }

    refreshList(counts){
        this.setState({
            loading: false,
            counts: [
                {key: 1, 
                sessions_c: this.props.sessions.length, 
                items_c: this.props.items.length, 
                tracks_c: this.props.tracks.length, 
                rooms_c: this.props.rooms.length, 
                people_c: this.props.people.length}
            ]
        });
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

        return   (
            <div>
                <Upload accept=".json, .csv" onChange={this.onChange.bind(this)} beforeUpload={this.beforeUpload.bind(this)}>
                    <Button>
                        <UploadOutlined /> Click to upload program data
                    </Button>
                </Upload>
                <Table columns={columns} dataSource={this.state.counts} rowKey={(r)=>(r.key)}/>
            </div>
        )
    }
}

const AuthConsumer = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ProgramSummary {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} people={people} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>

);

export default AuthConsumer;
