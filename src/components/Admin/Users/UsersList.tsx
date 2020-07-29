// TS: @Crista / @Jon: Is AuthContext the right name for this type?  Seems like it is carrying a lot more than authorization information!
// (the basic structure is there, but there are a lot kore details to be filled in...)

import React from 'react';
import { Avatar, Button, Card, Form, Input, List, Modal, Radio, Space, Spin, Tabs, Row, Col, Table, Tag } from "antd";
import { ColumnsType } from 'antd/lib/table';
import Firebase from '../../Firebase/firebase';

// BCP: This bit of code is repeated in several other places! -- should be moved to a library file (not needed here, tho!)
/*
const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);
*/

interface UsersListProps {
    firebase: Firebase;
    history: string[];  
}

interface UsersListState {
    loading: Boolean,
    users?: any[];     // TS: Can this be refined??
}

interface UserSchema {
    title: string,
    dataIndex?: string,
    key: string,
    render: (text: string, record: { key: string }) => React.ReactElement,
}

export default class UsersList extends React.Component<UsersListProps, UsersListState> {
    usersRef: firebase.database.Reference;
    constructor(props: UsersListProps) {
        super(props);
        this.state = { loading: true };
        this.usersRef = this.props.firebase.db.ref("users");
    }
    componentDidMount() {
        this.usersRef.on('value', (val: firebase.database.DataSnapshot) => {
            const res = val.val();
            if (res) {
                const users: any[] = [];    // TS: ??
                val.forEach((vid) => {
                    let user = vid.val();
                    user.key = vid.key;
                    users.push(user);
                });
                this.setState({ loading: false, users: users });
            }
        });
    }
    componentWillUnmount() {
        this.usersRef.off("value");
    }

    render() {
        if (this.state.loading)
            return <Spin>Loading...</Spin>
        const columns: ColumnsType<UserSchema> = [
            {
                title: 'Name',
                dataIndex: 'username',
                key: 'name',
                // @Jon/@Crista: The weird type annotation for record comes from the fact that here it must contain a 
                // key and below it must contain a name!  Is that right?
                render: (text: string, record: { key?: string, name?: string }) => <a onClick={() => { this.props.history.push("/admin/users/edit/" + record.key) }}>{text}</a>,
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
                render: (text: string, record: { key?: string, name?: string }) => (
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
                pagination={{
                    defaultPageSize: 500,
                    pageSizeOptions: ["10", "20", "50", "100", "500"],
                    position: ['topRight', 'bottomRight']
                }} />
        </div>
    }

}
