import * as React from 'react';
import { Space, Table } from "antd";
import { ColumnsType } from 'antd/lib/table';
import Firebase from '../../Firebase/firebase';

interface ScheduleListProps {
    firebase: Firebase;
}

interface ScheduleListState {
    sessions: any[],//TS: refine!
    items: {}  //TS: refine!
    loading: boolean,
    categories: string[],
}

interface ScheduleListSchema {
    title: string,
    dataIndex?: string,
    key: string,
    name: string,
    address: string,
    render: (text: string, record: { key: string }) => React.ReactElement,
}

export default class ScheduleList extends React.Component<ScheduleListProps, ScheduleListState> {
    sessionsRef: firebase.database.Reference;
    itemsRef: firebase.database.Reference;
    categoriesRef: firebase.database.Reference;
    constructor(props: ScheduleListProps) {
        super(props);
        this.state = { sessions: [], items: {}, loading: false, categories: [] }
        this.sessionsRef = this.props.firebase.db.ref("program/sessions/");
        this.itemsRef = this.props.firebase.db.ref("program/items/");
        this.categoriesRef = this.props.firebase.db.ref("program/categories/");
    }

    componentDidMount() {
        this.sessionsRef.on('value', (val) => {
            const res = val.val();
            const sessions: string[] = [];   // TS: ??
            if (res) {
                val.forEach((session) => {
                    let d = session.val();
                    d.key = session.key;
                    sessions.push(d);
                });
            }
            this.setState({ sessions: sessions, loading: false });
        });
        this.categoriesRef.on('value', (val) => {
            const res = val.val();
            const categories: string[] = [];   // TS: ??
            if (res) {
                val.forEach((cat) => {
                    let d = cat.val();
                    d.key = cat.key;
                    categories.push(d);
                });
            }
            this.setState({ categories: categories, loading: false });
        });
        this.itemsRef.on('value', (val) => {
            const res = val.val();
            const items = {};
            if (res) {
                val.forEach((item) => {
                    // TS : TS is unhappy because item.key can be null according to its type...
                    // @ts-ignore
                    if (items.key != null) {
                    // @ts-ignore
                    items[item.key] = item.val();
                    // @ts-ignore
                    items[item.key].id = item.key;
                    }
                });
            }
            this.setState({ items: items });
        });
    }

    componentWillUnmount() {
        this.sessionsRef.off("value");
        this.itemsRef.off("value");
    }

    render() {
        const columns: ColumnsType<ScheduleListSchema> = [
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
                // TS: Not sure what the correct annotations are here: onFilter seems to want a function that 
                // can accept any of string,number,boolean, but indexOf only wants a string...
                // @ts-ignore
                onFilter: (value:string|number|boolean, record) => record.name.indexOf(value) === 0,
                sorter: (a: ScheduleListSchema, b: ScheduleListSchema) => a.name.length - b.name.length,
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
                onFilter: (value, record:any) => record.address.indexOf(value) === 0,  // TS: refine!
                sorter: (a: {address:string}, b: {address:string}) => a.address.length - b.address.length,
                sortDirections: ['descend', 'ascend'],
            },
        ];
        return (<Table 
            columns= { columns } 
            dataSource = { this.state.sessions } 
            onChange = { this.onChange } />)
    }

    onChange() {

    }

}
