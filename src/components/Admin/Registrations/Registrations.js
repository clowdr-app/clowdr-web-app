import React, {Fragment} from 'react';
import {Button, DatePicker, Form, Input, message, Modal, Select, Space, Spin, Table, Tabs, Upload} from "antd";
import { UploadOutlined } from '@ant-design/icons';
import Parse from "parse";
import {AuthUserContext} from "../../Session";

const { Option } = Select;

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

class Registrations extends React.Component {
    constructor(props) {
        super(props); // has props.auth
        console.log("Registrations starting " + this.props);
        this.state = {
            loading: true, 
            regs: []
        };
        this.currentConference = props.auth.currentConference;
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
            Parse.Cloud.run("registrations", data).then(() => this.refreshList());
        }
        reader.readAsText(file);
        return false;
    }        

    refreshList(){
        let query = new Parse.Query("Registrations");
        query.find().then(res=>{
            this.setState({
                regs: res,
                loading: false
            });
        })
    }

    componentWillUnmount() {
        // this.sub.unsubscribe();
    }

    render() {
        const columns = [
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                render: (text, record) => <span>{record.get("name")}</span>,
            },
            {
                title: 'Email',
                dataIndex: 'email',
                render: (text,record) => <span>{record.get("email")}</span>,
                key: 'email',
            },
            {
                title: 'Affiliation',
                dataIndex: 'affiliation',
                render: (text,record) => <span>{record.get("affiliation")}</span>,
                key: 'affiliation',
            },
            {
                title: 'Country',
                dataIndex: 'country',
                render: (text,record) => <span>{record.get("country")}</span>,
                key: 'country',
            }
        ];


        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div>
                <Upload accept=".txt, .csv" onChange={this.onChange.bind(this)} beforeUpload={this.beforeUpload.bind(this)}>
                    <Button>
                        <UploadOutlined /> Click to upload registration data
                    </Button>
                </Upload>
            <Table columns={columns} dataSource={this.state.regs} rowKey={(r)=>(r.id)}/>
        </div>
    }

}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Registrations {...props} />
        )}
    </AuthUserContext.Consumer>
)
export default AuthConsumer;

