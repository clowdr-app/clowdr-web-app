import React, {Fragment} from 'react';
import {Button, DatePicker, Form, Input, message, Modal, Select, Space, Spin, Table, Tabs, Tooltip, Upload} from "antd";
import {MailOutlined, UploadOutlined } from '@ant-design/icons';
import Parse from "parse";
import {AuthUserContext} from "../../Session";
import moment from "moment";

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
            Parse.Cloud.run("registrations-upload", data).then(() => this.refreshList());
        }
        reader.readAsText(file);
        return false;
    } 

    refreshList(value) {
        let query = new Parse.Query("Registration");
        query.equalTo("conference", this.props.auth.currentConference.id);
        // if (value) { // THIS DOESN"T WANT TO WORK
        //     query.greaterThan('createdAt', Date.parse(value.startTime));
        // }
        query.limit(10000);
        query.find().then(res => {
            let regs = res;
            if (value)
            {
                regs = res.filter(r => r.get("createdAt") >= value.startTime)
                console.log('Filtering ' + regs.length);
            }
            this.setState({
                regs: regs,
                loading: false
            });
        }).catch(err => console.log('[Registration]: error: ' + err));
    }

    componentWillUnmount() {
        // this.sub.unsubscribe();
    }

    async sendInvitation(record){
        try {
            await Parse.Cloud.run("registrations-inviteUser", {
                conference: this.currentConference.id,
                registrations: [record.id]
            });
            this.refreshList();
        }catch(err){
            console.log(err);
        }
    }

    async sendInvitations(){
        try {
            await Parse.Cloud.run("registrations-inviteUser", {
                conference: this.currentConference.id,
                registrations: this.state.regs.map(r => r.id)
            });
            this.refreshList();
        }catch(err){
            console.log(err);
        }
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
            },
            {
                title: 'Invitation',
                dataIndex: 'invitationSent',
                render: (text,record) => {
                    if(record.get("invitationSentDate"))
                    {
                        return <span>{moment(record.get("invitationSentDate")).calendar()} <Button onClick={this.sendInvitation.bind(this, record)}>Re-send</Button></span>
                    }
                    return <span><Button onClick={this.sendInvitation.bind(this, record)}>Send</Button></span>},
                key: 'invitationSent',
            }
        ];


        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div>
                <table style={{width:"100%"}}>
                    <tbody>
                        <tr>
                            <td><Upload accept=".txt, .csv" onChange={this.onChange.bind(this)} beforeUpload={this.beforeUpload.bind(this)}>
                                <Button>
                                    <UploadOutlined /> Upload registration data
                                </Button>
                            </Upload></td>

                            <td><Form layout="inline" name="form_in_reg" id="RetrieveByDate" onFinish={this.refreshList.bind(this)}>
                                <Form.Item name="startTime" >
                                            <DatePicker placeholder="Uploaded since..." showTime/>
                                </Form.Item>
                                <Form.Item >
                                    <Button type="primary" htmlType="submit">
                                    Submit
                                    </Button>
                                </Form.Item>

                                </Form>
                            </td>

                            <td style={{"textAlign":"right"}}> <Tooltip title="Send Invitation to ALL selected"> 
                                    <Button danger icon={<MailOutlined />} onClick={this.sendInvitations.bind(this)}>Send All</Button>
                                </Tooltip></td>
                        </tr>
                        <tr>
                            <td>&nbsp;</td><td>&nbsp;</td>
                            <td style={{"textAlign":"right"}}>Current filter: {this.state.regs.length}</td>
                        </tr>
                    </tbody>
                </table>
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


