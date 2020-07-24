import React from 'react';
import {Button, message, Select, Space, Spin, Table, Tabs, Upload} from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";

import {UploadOutlined} from '@ant-design/icons';

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
        };
        // this.currentConference = "XYZ";
        this.currentConference = this.props.auth.currentConference;
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

    async componentDidMount() {

        let program = await this.props.auth.programCache.getEntireProgram(this);
        program.loading = false;
        this.setState(program);
    }
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramItem", this);
        this.props.auth.programCache.cancelSubscription("ProgramRoom", this);
        this.props.auth.programCache.cancelSubscription("ProgramTrack", this);
        this.props.auth.programCache.cancelSubscription("ProgramPerson", this);
        this.props.auth.programCache.cancelSubscription("ProgramSession", this);

    }

    beforeUpload(file, fileList) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = {content: reader.result, conference: this.currentConference.id};
            Parse.Cloud.run("program-upload", data)
                .then((res) => {
                    console.log("Upload successfully!!!" + JSON.stringify(res));
                })
                .catch(err => console.log('Upload failed: ' + err));
        }
        reader.readAsText(file);
        return false;
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
                <Table 
                    columns={columns} 
                    dataSource={counts}
                    rowKey={(r)=>(r.key)}
                    pagination={{ defaultPageSize: 500,
                        pageSizeOptions: [10, 20, 50, 100, 500], 
                        position: ['topRight', 'bottomRight']}}/>
            </div>
        )
    }
}

const AuthConsumer = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ProgramSummary {...props} auth={value} />
                )}
            </AuthUserContext.Consumer>

);

export default AuthConsumer;
