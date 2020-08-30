import React from "react";
import { AuthUserContext } from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import Parse from "parse"
import { Button, Input, message, Space, Switch, Table } from "antd";
import { SearchOutlined } from "@material-ui/icons";
import Highlighter from 'react-highlight-words';

class Moderation extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loading: true }

    }
    async updateBan(item) {
        this.setState({ banUpdating: true })
        console.log(item);
        let idToken = this.props.auth.user.getSessionToken();

        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/users/ban`
            , {
                method: 'POST',
                body: JSON.stringify({
                    identity: idToken,
                    conference: this.props.auth.currentConference.id,
                    profileID: item.key,
                    isBan: (item.isBanned === "No")
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if (res.status === "OK") {
            let updatedItem = item;
            if (item.isBanned === "Yes")
                updatedItem.isBanned = "No";
            else
                updatedItem.isBanned = "Yes";
            console.log(updatedItem.key)
            this.setState((prevState) => ({
                banUpdating: false,
                allUsers: prevState.allUsers.map(u => (u.key === item.key ? updatedItem : u))
            }));
        }
        else {
            message.error(res.message);
            this.setState({ banUpdating: false })
        }
    }
    async componentDidMount() {
        let parseUserQ = new Parse.Query("UserProfile")
        parseUserQ.equalTo("conference", this.props.auth.currentConference);
        parseUserQ.include("user");
        parseUserQ.addAscending("displayName");
        parseUserQ.limit(1000);
        parseUserQ.withCount();
        let nRetrieved = 0;
        let { count, results } = await parseUserQ.find();
        nRetrieved = results.length;
        let allUsers = [];
        allUsers = results.map(item => ({
            key: item.id,
            displayName: item.get("displayName"),
            email: (item.get("user") ? item.get("user").get("email") : undefined),
            isBanned: item.get('isBanned') ? "Yes" : "No"
        }))
        while (nRetrieved < count) {
            parseUserQ = new Parse.Query("UserProfile")
            parseUserQ.equalTo("conference", this.props.auth.currentConference);
            parseUserQ.include("user");
            parseUserQ.skip(nRetrieved)
            parseUserQ.addAscending("displayName");
            parseUserQ.limit(1000);
            results = await parseUserQ.find();
            // // results = dat.results;
            nRetrieved += results.length;
            if (results) {
                allUsers = allUsers.concat(results.map(item => ({
                    key: item.id,
                    displayName: item.get("displayName"),
                    email: (item.get("user") ? item.get("user").get("email") : undefined),
                    isBanned: item.get('isBanned') ? "Yes" : "No"
                })));
            }
        }
        this.setState({ allUsers: allUsers, loading: false });
    }
    handleSearch = (selectedKeys, confirm, dataIndex) => {
        confirm();
        this.setState({
            searchText: selectedKeys[0],
            searchedColumn: dataIndex,
        });
    };

    handleReset = clearFilters => {
        clearFilters();
        this.setState({ searchText: '' });
    };
    getColumnSearchProps = dataIndex => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    ref={node => {
                        this.searchInput = node;
                    }}
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
                    style={{ width: 188, marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Search
                    </Button>
                    <Button onClick={() => this.handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) =>
            record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
        onFilterDropdownVisibleChange: visible => {
            if (visible) {
                setTimeout(() => this.searchInput.select());
            }
        },
        render: (text, item) => {
            if (dataIndex === "isBanned") {
                return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={text === "Yes"} loading={this.state.banUpdating} onChange={this.updateBan.bind(this, item)}></Switch>
            }
            return this.state.searchedColumn === dataIndex ? (
                <Highlighter
                    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                    searchWords={[this.state.searchText]}
                    autoEscape
                    textToHighlight={text.toString()}
                />
            ) : (
                    text
                )
        },
    });

    render() {
        if (!this.props.auth.isModerator)
            return <div></div>
        if (this.state.loading)
            return <div>Loading...</div>

        const columns = [
            {
                title: 'Name',
                dataIndex: 'displayName',
                key: 'displayName',
                ...this.getColumnSearchProps('displayName'),
            },
            {
                title: 'Banned',
                dataIndex: 'isBanned',
                key: 'isBanned',
                ...this.getColumnSearchProps('isBanned'),
            },
        ];
        return <div>
            <h2>Moderation</h2>
            <Table dataSource={this.state.allUsers} columns={columns}>
            </Table>
        </div>
    }
}

const AuthConsumer = withLoginRequired((props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Moderation {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
