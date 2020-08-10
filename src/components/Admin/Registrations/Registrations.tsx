import React from 'react';
import {Button, DatePicker, Form, Input, message, Modal, Spin, Table, Tooltip, Upload} from "antd";
import {MailOutlined, UploadOutlined } from '@ant-design/icons';
import Parse from "parse";
import {AuthUserContext} from "../../Session";
import { ClowdrState } from '../../../ClowdrTypes';
import { UploadChangeParam, RcFile } from 'antd/lib/upload';

var moment = require('moment');
var timezone = require('moment-timezone');

interface RegistrationProps {
    auth: ClowdrState,
}

interface RegistrationState {
    loading: boolean,
    searched: boolean,
    searchResult: Parse.Object[],
    regs: any[], //TS: should be Parse.Object[], but not sure
    filteredRegs: any[], //TS: should not be any
    visible: boolean,
    sending: boolean
}

//TS: I created a schema for the new registration form here, and it worked. See line 69. I'm not sure if we can use interfaces like that,
//or maybe we need to find out a way to make Parse.Object work for this.
interface RegistrationSchema {
    email: string,
    name: string,
    affiliation: string
    country: string
}

function validateEmail(email: string) { 
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

class Registrations extends React.Component<RegistrationProps, RegistrationState>{
    currentConference: any;
    constructor(props: RegistrationProps) {
        super(props); // has props.auth
        console.log("Registrations starting " );
        this.state = {
            loading: true, 
            regs: [],
            filteredRegs : [],
            searched: false,
            searchResult: [],
            visible: false,
            sending: false
        };
        this.currentConference = props.auth.currentConference;
        console.log("Current conference is " + this.currentConference.get("conferenceName"));
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

    onCreate(values: RegistrationSchema) {
        var _this = this;

        let exists = this.state.regs.find(r => r.get("email") == values.email)
        if (exists)
            console.log("[Admin/Registrations]: Email already exists");
            console.log("[Admin/Registrations]: Valid email? " + validateEmail(values.email));

        if (!exists && validateEmail(values.email)) {
            console.log("OnCreate! " + values.name)
            // Create the registration record
            var Registration = Parse.Object.extend("Registration");
            var reg = new Registration();
            reg.set('conference', this.props.auth.currentConference.id);
            reg.set("name", values.name);
            reg.set("email", values.email);
            reg.set("affiliation", values.affiliation);
            reg.set("country", values.country);
            let acl = new Parse.ACL();
            acl.setPublicWriteAccess(false);
            acl.setPublicReadAccess(false);
            acl.setRoleReadAccess(this.props.auth.currentConference.id+"-admin", true);
            acl.setRoleWriteAccess(this.props.auth.currentConference.id+"-admin", true);
            reg.setACL(acl);
            reg.save().then((_: any) => { //TS: We don't need '_' here
                // Make local changes
                let newRegs = [reg, ...this.state.regs];
                _this.setState({
                    visible: false,
                    regs: newRegs,
                    filteredRegs: newRegs
                });
            }).catch((err: Error)=> {
                console.log("[Admin/Registrations]: " + err );
            });
        }
    }

    setVisible(visible: boolean) {
        if (visible != null) {
            this.setState({'visible': visible});
        }
        else {
            this.setState({'visible': !this.state.visible});
        }
    }

    componentDidMount() {
        this.download();
    }

    beforeUpload(file: RcFile, _ : RcFile[]) {
        const reader = new FileReader();
        reader.onload = () => {
            const data = {content: reader.result, conference: this.currentConference.id};
            Parse.Cloud.run("registrations-upload", data).then(response => {
                this.refreshList(response);
            });
        }
        reader.readAsText(file);
        return false;
    } 

    download() {
        let query = new Parse.Query("Registration");
        query.equalTo("conference", this.props.auth.currentConference.id);
        query.addDescending("updatedAt")
        query.limit(10000);
        query.find().then(res => {
            this.setState({
                regs: res,
                filteredRegs: res,
                loading: false
            });
        }).catch(err => console.log('[Registration]: error: ' + err));
    }

    refreshList(value: any) { //TS: should be Store
        let regs = this.state.regs;
        if (value) {
            regs = value; // TS: Might be 'regs = value as Parse.Object[]'?
        }
        this.setState({
            filteredRegs: regs,
            regs: [regs, ...this.state.regs],
            loading: false
        });
    }

    componentWillUnmount() {
        // this.sub.unsubscribe();
    }

    async sendInvitation(record: any){ // TS: Should not be any
        try {
            this.setState({sending: true})
            await Parse.Cloud.run("registrations-inviteUser", {
                conference: this.currentConference.id,
                registrations: [record.id]
            });
            this.setState({sending: false})
        }catch(err){
            console.log(err);
        }
    }

    async sendInvitations(){
        try {
            this.setState({sending: true})
            await Parse.Cloud.run("registrations-inviteUser", {
                conference: this.currentConference.id,
                registrations: this.state.filteredRegs.map(r => r.id)
            });
            console.log('REAL SEND TO ' + this.state.filteredRegs.length)
            this.setState({sending: false})
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
                sorter: (a: Parse.Object, b: Parse.Object) => {
                    var varA = a.get("name");
                    var varB = b.get("name");
                    return varA.localeCompare(varB);
                },
                render: (_: string, record: Parse.Object) => <span>{record.get("name")}</span>,
            },
            {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                render: (_: string, record: Parse.Object) => <span>{record.get("email")}</span>,
                sorter: (a: Parse.Object, b: Parse.Object) => {
                    var varA = a.get("email");
                    var varB = b.get("email");
                    return varA.localeCompare(varB);
                },
            },
            {
                title: 'Affiliation',
                dataIndex: 'affiliation',
                key: 'affiliation',
                render: (_: string, record: Parse.Object) => <span>{record.get("affiliation")}</span>,
                sorter: (a: Parse.Object, b: Parse.Object) => {
                    var varA = a.get("affiliation");
                    var varB = b.get("affiliation");
                    return varA.localeCompare(varB);
                },
            },
            {
                title: 'Country',
                dataIndex: 'country',
                key: 'country',
                render: (_: string, record: Parse.Object) => <span>{record.get("country")}</span>,
                sorter: (a: Parse.Object, b: Parse.Object) => {
                    var varA = a.get("country");
                    var varB = b.get("country");
                    return varA.localeCompare(varB);
                },
            },
            {
                title: 'Created',
                dataIndex: 'created',
                sorter: (a: Parse.Object, b: Parse.Object) => {
                    return moment(a.get("createdAt")) - moment(b.get("createdAt"));
                },
                render: (_: string, record: Parse.Object) => <span>{timezone(record.get("createdAt")).tz(timezone.tz.guess()).format("YYYY-MM-DD HH:mm z")}</span>,
                key: 'created',
            },
            {
                title: 'Invitation',
                dataIndex: 'invitationSent',
                render: (_: string, record: Parse.Object) => {
                    if(record.get("invitationSentDate"))
                    {
                        return <span>{moment(record.get("invitationSentDate")).calendar()} <Button onClick={this.sendInvitation.bind(this, record)}>Re-send</Button></span>
                    }
                    return <span><Button loading={this.state.sending} onClick={this.sendInvitation.bind(this, record)}>Send</Button></span>},
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
                                <Tooltip title="Upload a CSV file with a header and mandatory fields: email,name and optional fields affiliation,country. Name can be either a single field 'name' or 'first' and 'last'"><Button>
                                    <UploadOutlined /> Upload file
                                </Button></Tooltip>
                            </Upload></td>

                            <td>
                                <Button type="primary" onClick={() => { this.setVisible(true); }}>New registration </Button>
                                    <RegistrationForm
                                        title="New Registration"
                                        visible={this.state.visible}
                                        onAction={this.onCreate.bind(this)}
                                        onCancel={() => {
                                            this.setVisible(false);
                                        }}
                                    />
                            </td>
                            <td><Form layout="inline" name="form_in_reg" id="RetrieveByDate" onFinish={this.refreshList.bind(this)}>
                                <Form.Item name="startTime" >
                                            <DatePicker placeholder="Latest since..." showTime/>
                                </Form.Item>
                                <Form.Item >
                                    <Button type="primary" htmlType="submit">
                                    Submit
                                    </Button>
                                </Form.Item>

                                </Form>
                            </td>
                            <td style={{"textAlign":"right"}}> <Tooltip mouseEnterDelay={0.5} title="Send Invitation to ALL selected">
                                    <Button danger icon={<MailOutlined />} loading={this.state.sending} onClick={this.sendInvitations.bind(this)}>Send All</Button>
                                </Tooltip></td>
                        </tr>
                        <tr>
                            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                                    <td style={{"textAlign":"right"}}>Current filter: {this.state.filteredRegs.length} / {this.state.regs.length}</td>
                        </tr>
                    </tbody>
                </table>
            <Input.Search
                allowClear
                onSearch = {key => {
                    if (key === "") {
                        this.setState({searched: false});
                    } else {
                        this.setState({
                            searched: true,
                            searchResult: this.state.regs.filter(
                                (reg: Parse.Object) => reg.get('name') && reg.get('name').toLowerCase().includes(key.toLowerCase()))
                        });
                    }
                }
                }
            />
            <Table
                columns={columns}
                dataSource={this.state.searched ? this.state.searchResult : this.state.filteredRegs}
                rowKey={(r) => (r.id)}
                pagination={{ defaultPageSize: 500,
                    pageSizeOptions: ['10', '20', '50', '100', '500'], 
                    position: ['topRight', 'bottomRight']}}>
            </Table>
        </div>
    }
}

const AuthConsumer = (props: RegistrationProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <Registrations {...props} />
        )}
    </AuthUserContext.Consumer>
)
export default AuthConsumer;

interface RegistrationFormState {
    title: string, 
    visible: boolean, 
    //data: string, 
    onAction: Function, // TS: Function?
    onCancel: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
}

const RegistrationForm: React.FC<RegistrationFormState> = ({
    title, 
    visible, 
    //data, 
    onAction, 
    onCancel}) => {
    const [form] = Form.useForm();
    return (
        <Modal
            visible={visible}
            title={title}
            // okText="Create"
            footer={[
                <Button form="newRegForm" key="submit" type="primary" htmlType="submit">
                    Submit
                </Button>
            ]}
            cancelText="Cancel"
            onCancel={onCancel}
        >
            <Form
                form={form}
                layout="vertical"
                name="form_in_modal"
                id="newRegForm"
                initialValues={{
                    modifier: 'public',
                    //...data //TS: can this be ignored?
                }}
                onFinish={() => {
                    form
                        .validateFields()
                        .then(values => {
                            form.resetFields();
                            onAction(values);
                        })
                        .catch(info => {
                            console.log('Validate Failed:', info);
                        });
                }}
            >
                <Form.Item
                    name="name"
                    label="Name"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the name!',
                        },
                    ]}
                >
                    <Input placeholder="Name"/>
                </Form.Item>
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the email!',
                        },
                    ]}
                >
                    <Input placeholder="someone@somewhere.edu"/>
                </Form.Item>
                <Form.Item
                    name="affiliation"
                    label="Affiliation"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the affiliation!',
                        },
                    ]}
                >
                    <Input placeholder="Affiliation"/>
                </Form.Item>
                <Form.Item
                    name="country"
                    label="Country"
                    rules={[
                        {
                            required: true,
                            message: 'Please input the country!',
                        },
                    ]}
                >
                    <Input placeholder="Country"/>
                </Form.Item>
            </Form>
        </Modal>
    );
};