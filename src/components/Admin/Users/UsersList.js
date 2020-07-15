import React from 'react';
import {Avatar, Button, Card, Form, Input, List, Modal, Radio, Space, Spin, Tabs, Row, Col, Table, Tag} from "antd";

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

export default class UsersList extends React.Component {
    constructor(props) {
        super(props);
        this.state={loading:true};
        this.usersRef = this.props.firebase.db.ref("users");
    }
    componentDidMount() {
        this.usersRef.on('value',(val)=>{
            const res = val.val();
            if(res) {
                const users = [];
                val.forEach((vid) => {
                    let user = vid.val();
                    user.key = vid.key;
                    users.push(user);
                });
                this.setState({loading: false, users: users});
            }
        });
    }
    componentWillUnmount() {
        this.usersRef.off("value");
    }

    render() {
        if(this.state.loading)
            return <Spin>Loading...</Spin>
        const columns = [
            {
                title: 'Name',
                dataIndex: 'username',
                key: 'name',
                render: (text, record) => <a onClick={()=>{this.props.history.push("/admin/users/edit/"+record.key)}}>{text}</a>,
            },
            // {
            //     title: 'Age',
            //     dataIndex: 'age',
            //     key: 'age',
            // },
            // {
            //     title: 'Address',
            //     dataIndex: 'address',
            //     key: 'address',
            // },
            {
                title: 'Action',
                key: 'action',
                render: (text, record) => (
                    <Space size="middle">
                        <a>Invite {record.name}</a>
                        <a>Delete</a>
                    </Space>
                ),
            },
        ];
        return <div>
            <Table 
                columns={columns} 
                dataSource={this.state.users}
                pagination={{ defaultPageSize: 500,
                    pageSizeOptions: [10, 20, 50, 100, 500], 
                    position: ['topRight', 'bottomRight']}}/>
        </div>
    }

}
