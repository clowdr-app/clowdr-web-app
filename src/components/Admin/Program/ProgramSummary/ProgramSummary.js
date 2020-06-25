import React, {Fragment} from 'react';
import { Button, DatePicker, Form, Input, Select, Modal, Popconfirm, Space, Spin, Table, Tabs, message, Upload } from "antd";
import Parse from "parse";
import {AuthUserContext} from "../../../Session";

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


let cols = {'key': '1'};
cols['sessions'] = 0;
cols['items'] = 0;
cols['tracks'] = 0;
cols['rooms'] = 0;


class ProgramSummary extends React.Component {
    constructor(props) {
        super(props); // has props.auth
        console.log("Registrations starting " + this.props);
        this.state = {
            loading: true,
            regs: []
        };
        // this.currentConference = "XYZ";
        this.currentConference = this.props.auth.currentConference;
        console.log("Current conference is " + this.currentConference);
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
        this.refreshList();
    }

    beforeUpload(file, fileList) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = {content: reader.result, conference: this.currentConference.id};
            Parse.Cloud.run("program-upload", data)
                .then((res) => {
                    console.log("Upload successfully!!!" + JSON.stringify(res));
                    this.getResult(res);
                    this.refreshList();
                })
                .catch(err => console.log('Upload failed: ' + err));
        }
        reader.readAsText(file);
        return false;
    }

    getResult(res) {
        this.columns = res;
    }
    refreshList(){
        console.log(JSON.stringify(this.columns))
        let ans = [];
        if (this.columns) {
            cols = this.columns
            ans.push(cols);
        } else {
            ans.push(cols);
        }
        this.setState({
            loading: false,
            regs: ans
        });
    }

    render() {
        const columns = [
            {
                title: 'Sessions',
                dataIndex: 'sessions',
                key: 'sessions',
            },
            {
                title: 'Items',
                dataIndex: 'items',
                key: 'items',
            },
            {
                title: 'Tracks',
                dataIndex: 'tracks',
                key: 'tracks',
            },
            {
                title: 'Rooms',
                dataIndex: 'rooms',
                key: 'rooms',
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
                <Table columns={columns} dataSource={this.state.regs} rowKey={(r)=>(r.id)}/>
            </div>
        )
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramSummary {...props} />
        )}
    </AuthUserContext.Consumer>
)
export default AuthConsumer;
