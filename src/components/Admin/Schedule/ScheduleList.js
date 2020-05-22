import React from 'react';
import {Space, Table} from "antd";

const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

export default class ScheduleList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {sessions: [], items: {}}
        this.sessionsRef = this.props.firebase.db.ref("program/sessions/");
        this.itemsRef = this.props.firebase.db.ref("program/items/");
        this.categoriesRef = this.props.firebase.db.ref("program/categories/");
    }

    componentDidMount() {
        this.sessionsRef.on('value', (val) => {
            const res = val.val();
            const sessions = [];
            if (res) {
                val.forEach((session) => {
                    let d = session.val();
                    d.key = session.key;
                    sessions.push(d);
                });
            }
            this.setState({sessions: sessions, loading: false});
        });
        this.categoriesRef.on('value', (val) => {
            const res = val.val();
            const categories = [];
            if (res) {
                val.forEach((cat) => {
                    let d = cat.val();
                    d.key = cat.key;
                    categories.push(d);
                });
            }
            this.setState({categories: categories, loading: false});
        });
        this.itemsRef.on('value', (val) => {
            const res = val.val();
            const items = {};
            if (res) {
                val.forEach((item) => {
                    items[item.key] = item.val();
                    items[item.key].id = item.key;
                });
            }
            this.setState({items: items});
        });
    }

    componentWillUnmount() {
        this.sessionsRef.off("value");
        this.itemsRef.off("value");
    }

    render() {
        const columns = [
            {
                title: 'Title',
                dataIndex: 'title',
                filters: [
                    {
                        text: 'Joe',
                        value: 'Joe',
                    },
                    {
                        text: 'Jim',
                        value: 'Jim',
                    },
                    {
                        text: 'Submenu',
                        value: 'Submenu',
                        children: [
                            {
                                text: 'Green',
                                value: 'Green',
                            },
                            {
                                text: 'Black',
                                value: 'Black',
                            },
                        ],
                    },
                ],
                // specify the condition of filtering result
                // here is that finding the name started with `value`
                onFilter: (value, record) => record.name.indexOf(value) === 0,
                sorter: (a, b) => a.name.length - b.name.length,
                sortDirections: ['descend'],
            },
            {
                title: 'Day',
                dataIndex: 'day',
                defaultSortOrder: 'descend',
                // sorter: (a, b) => a.age - b.age,
            },
            {
                title: 'Type',
                dataIndex: 'type',
                filters: [
                    {
                        text: 'London',
                        value: 'London',
                    },
                    {
                        text: 'New York',
                        value: 'New York',
                    },
                ],
                filterMultiple: false,
                onFilter: (value, record) => record.address.indexOf(value) === 0,
                sorter: (a, b) => a.address.length - b.address.length,
                sortDirections: ['descend', 'ascend'],
            },
        ];
        return (<Table columns={columns} dataSource={this.state.sessions} onChange={this.onChange}/>)
    }

    onChange() {

    }

}
