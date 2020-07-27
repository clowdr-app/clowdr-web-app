import React from "react";
import {AuthUserContext} from "../../Session";
import withLoginRequired from "../../Session/withLoginRequired";
import Parse from "parse"
import {Button, Input, message, Space, Switch, Table, Tooltip} from "antd";
import {SearchOutlined} from "@material-ui/icons";
import Highlighter from 'react-highlight-words';

const roles = [
    {
        'name': 'moderator',
    },
    {
        'name': 'manager',
    },
    {
        'name': "admin",
    }
]
class UsersList extends React.Component{
    constructor(props) {
        super(props);
        this.state ={loading: true}

    }
    async updateBan(item){
        this.setState({banUpdating: true})
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
                    isBan: (item.isBanned == "No")
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if (res.status == "OK") {
            let updatedItem = item;
            if(item.isBanned == "Yes")
                updatedItem.isBanned = "No";
            else
                updatedItem.isBanned = "Yes";
            this.setState((prevState)=> ({banUpdating: false,
                allUsers: prevState.allUsers.map(u => (u.key == item.key ? updatedItem : u))
            }));
        }
        else{
            message.error(res.message);
            this.setState({banUpdating: false})
        }
    }
    async componentDidMount() {

        let parseUserQ = new Parse.Query("UserProfile")
        parseUserQ.equalTo("conference", this.props.auth.currentConference);
        parseUserQ.include("user");
        parseUserQ.addAscending("displayName");
        parseUserQ.limit(4000);
        parseUserQ.withCount();
        let nRetrieved = 0;
        let roleData = [];
        for (let role of roles) {
            roleData.push(Parse.Cloud.run('admin-userProfiles-by-role', {
                id: this.props.auth.currentConference.id,
                roleName: role.name
            }).then((ids) => {
                return {'role': role, 'users': ids}
            }))
        }
        let roleUsers = await Promise.all(roleData);
        let {count, results} = await parseUserQ.find();
        nRetrieved = results.length;
        let allUsers = [];
        allUsers = results.map(item => ({
            key: item.id,
            displayName: item.get("displayName"),
            slackUID: item.get("slackID"),
            email: (item.get("user") ? item.get("user").get("email") : undefined),
            isBanned: item.get('isBanned') ? "Yes":"No"
        }))
        while (nRetrieved < count) {
            parseUserQ = new Parse.Query("UserProfile")
            parseUserQ.equalTo("conference", this.props.auth.currentConference);
            parseUserQ.include("user");
            parseUserQ.skip(nRetrieved)
            parseUserQ.addAscending("displayName");
            parseUserQ.limit(4000);
            results = await parseUserQ.find();
            // // results = dat.results;
            nRetrieved += results.length;
            if (results) {
                allUsers = allUsers.concat(results.map(item => ({
                    key: item.id,
                    displayName: item.get("displayName"),
                    slackUID: item.get("slackID"),
                    user_id: item.get("user").id,
                    email: (item.get("user") ? item.get("user").get("email") : undefined),
                    isBanned: item.get('isBanned') ? "Yes" : "No"
                })));
            }
        }
        let roleObj = {};
        for(let role of roleUsers){
            roleObj[role.role.name] = role.users;
        }
        this.setState({allUsers: allUsers, loading: false, roles: roleObj});
    }
    async refreshRoles(){
        let roleData = [];
        for (let role of roles) {
            roleData.push(Parse.Cloud.run('admin-userProfiles-by-role', {
                id: this.props.auth.currentConference.id,
                roleName: role.name
            }).then((ids) => {
                return {'role': role, 'users': ids}
            }))
        }
        let roleUsers = await Promise.all(roleData);
        let roleObj = {};
        for(let role of roleUsers){
            roleObj[role.role.name] = role.users;
        }

        this.setState({roles: roleObj});
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
        render: (text, item) =>{
            if(dataIndex == "isBanned")
            {
                return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={text =="Yes"} loading={this.state.banUpdating} onChange={this.updateBan.bind(this, item)}></Switch>
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

    async updateRole(roleName, item, shouldHaveRole){
        this.setState({roleUpdating: true})
        let res =await Parse.Cloud.run('admin-role', {
            id: this.props.auth.currentConference.id,
            roleName: roleName,
            userProfileId: item.key,
            shouldHaveRole: shouldHaveRole
        })
        this.refreshRoles();
        this.setState({roleUpdating: false})


    }

    render() {
        if(!this.props.auth.roles.find(v => v && v.get("name") == this.props.auth.currentConference.id+"-admin"))
            return <div>Error: you do not have permission to view this page - it is only for administrators.</div>
        if(this.state.loading)
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
            }, {
                title: <Tooltip title="Administrators have full access to all that managers do, plus the ability to manage internal clowdr settings">Admin</Tooltip>,
                key: 'admin',
                render: (text, item)=>{
                    let hasRole = this.state.roles['admin'] && this.state.roles['admin'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'admin', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Content managers can edit the program">Manager</Tooltip>,
                key: 'manager',
                render: (text, item)=>{
                    let hasRole = this.state.roles['manager'] && this.state.roles['manager'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'manager', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Moderators can enter all private channels and send global announcements">Moderator</Tooltip>,
                key: 'moderator',
                render: (text, item)=>{
                    let hasRole = this.state.roles['moderator'] && this.state.roles['moderator'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'moderator', item, !hasRole)}></Switch>
                }
            },
        ];
        return <div>
            <h2>User Management</h2>
            <Table dataSource={this.state.allUsers} columns={columns}>
            </Table>
        </div>
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <UsersList {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);