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
        super(props);
        console.log("Registrations starting " + this.props);
        this.state = {
            loading: true, 
            regs: []
        };
        this.headers = {
            'X-Parse-Application-Id': process.env.REACT_APP_PARSE_APP_ID,
            'X-Parse-REST-API-Key': process.env.REACT_APP_PARSE_REST_API_KEY,
            'Content-Type': 'application/json'
        }
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

    JSONfy(file) {
        console.log("JSONfy " + file);
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsDataText(file);
            reader.onload = () => {
                console.log("onload");
                return {content: reader.result}
            }
        });
    }

    setVisible() {
        this.setState({'visible': !this.state.visible});
    }

    componentDidMount() {
        this.refreshList();
        // this.sub = this.props.parseLive.subscribe(query);
        // this.sub.on('create', vid=>{
        //     console.log(vid);
        // })
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

//        console.log(this.headers);

        const props = {
//            action: "https://parseapi.back4app.com/functions/registrations",
            accept:".txt, .csv",
            beforeUpload(file, fileList) {
                const reader = new FileReader();
                reader.onload = () => {
                    const data = {content: reader.result};
                    Parse.Cloud.run("registrations", data)
                }
                reader.readAsText(file);
                return false;
            }        
        };

        if (this.state.loading)
            return (
                <Spin tip="Loading...">
                </Spin>)

        return <div>
                <Upload {...props} onChange={this.onChange.bind(this)}>
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

