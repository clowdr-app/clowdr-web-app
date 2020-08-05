import * as React from "react";
import {AuthUserContext} from "../../Session";
import withLoginRequired from "../../Session/withLoginRequired";
import Parse from "parse"
import {Button, Input, message, Space, Switch, Table, Tooltip} from "antd";
import {SearchOutlined} from "@material-ui/icons";
import Highlighter from 'react-highlight-words';
import { ClowdrAppState, UserSessionToken } from "../../../ClowdrTypes";

interface UsersListProps {
    auth: ClowdrAppState,
}

interface ManagedUser {
    key: string,
    displayName: string,
    slackUID: string,
    user_id: string,
    email: string | undefined,  // TS: Maybe not string??
    isBanned: "Yes" | "No"
}

// Replace item by manu or something
interface UsersListState {
    loading: boolean,
    banUpdating: boolean,
    allUsers: ManagedUser[],
    roles: any,    // TS: ???
    roleUpdating: boolean,
    searchedColumn: string,
    searchText: string,
}

interface UserProfileSchema {
}

// TS: Not very sure about this!  
interface QueryResult {id: string, get: (x:string)=>unknown}

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
class UsersList extends React.Component<UsersListProps, UsersListState> {
    searchInput: Input | null = null;  // TS: ??
    constructor(props: UsersListProps) {
        super(props);
        this.state = {
            loading: true, 
            banUpdating: false,  
            allUsers: [], 
            roles: {},      // TS: ???
            searchedColumn: "",     // TS: ???
            searchText: "",     // TS: ???
            roleUpdating: false,     // TS: ???
        }
    }

    async updateBan(item: ManagedUser){
        this.setState({banUpdating: true})
        console.log(item);
        let idToken: UserSessionToken = "";
        if (this.props.auth.user != null) {
            idToken = this.props.auth.user.getSessionToken();
        }

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
            if (item.isBanned == "Yes")
                updatedItem.isBanned = "No";
            else
                updatedItem.isBanned = "Yes";
            this.setState((prevState:UsersListState) => ({
                banUpdating: false,
                allUsers: prevState.allUsers.map(u => (u.key == item.key ? updatedItem : u))
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
        // Code quality: Is the constant in the next line going to bite us someday??
        parseUserQ.limit(4000);
        // @ts-ignore     TS: Apparently the Parse type definitions are not up to date (this was added recently)
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
        // TS: BCP stopped here -- need to figure out what type find is returning!
        let {count, results} = (await parseUserQ.find()) as unknown as {count: number, results: any[]};
        nRetrieved = results.length;
        // @ts-ignore     Jon/Crista: Don't we need a user_id field also??
        //Jon: user_id is item.id is key in this situation.
        // BCP: @Jon: Right now the field user_id is a required part of the UsersLisetState type; should it be optional?
        // And by the way, "item" should probably be renamed "user"
        let allUsers: ManagedUser[] = results.map((item: QueryResult) => ({
            key: item.id,
            displayName: item.get("displayName"),
            slackUID: item.get("slackID"),
            // TS: The unsafe "as" coercion is ugly -- is there a better way??
            email: (item.get("user") ? (item.get("user") as QueryResult).get("email") : undefined),
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
        for(let role of roleUsers) {
            // @ts-ignore     TS: should roleObj be declared as an empty _array_ above?
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
            // @ts-ignore     TS: Need help with this!
            roleObj[role.role.name] = role.users;
        }

        this.setState({roles: roleObj});
    }
    handleSearch = (selectedKeys: string[], confirm: () => void, dataIndex: string) => {
        confirm();
        this.setState({
            searchText: selectedKeys[0],
            searchedColumn: dataIndex,
        });
    };

    handleReset = (clearFilters: () => void) => {
        clearFilters();
        this.setState({ searchText: '' });
    };
    getColumnSearchProps = (dataIndex:string) => ({
        // @ts-ignore     TS: Need help with this!
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
        filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value:string, record:ManagedUser) =>
        // @ts-ignore     TS: What is the right type for record??
            record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
        onFilterDropdownVisibleChange: (visible:boolean) => {
            if (visible) {
                setTimeout(() => {if (this.searchInput != null) this.searchInput.select();})
            }
        },
        render: (text:string, item: ManagedUser) =>{
            if (dataIndex == "isBanned")
            {
                return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={text =="Yes"} loading={this.state.banUpdating} onChange={this.updateBan.bind(this, item)}></Switch>
            }
            return this.state.searchedColumn === dataIndex ? (
                <Highlighter
                    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                    searchWords={[this.state.searchText]}
                    autoEscape
                    textToHighlight={text.toString()}  // TS: Why do we need toString here?  Is it not already a string?
                />
            ) : (
                text
            )
        },
    });

    async updateRole(roleName:string, item: { key: any; }, shouldHaveRole:boolean){
        this.setState({roleUpdating: true})
        let res = await Parse.Cloud.run('admin-role', {
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
                 title: <Tooltip title="Administrators have full access to all that managers do, plus the ability to manage internal clowdr settings"><>Admin</></Tooltip>,
                key: 'admin',
                render: (text:string, item: { key: any; })=>{   // TS: Is this the best annotation?
                    let hasRole = this.state.roles['admin'] && this.state.roles['admin'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'admin', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Content managers can edit the program"><>Manager</></Tooltip>,
                key: 'manager',
                render: (text:string, item: { key: any; })=>{
                    let hasRole = this.state.roles['manager'] && this.state.roles['manager'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'manager', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Moderators can enter all private channels and send global announcements"><>Moderator</></Tooltip>,
                key: 'moderator',
                render: (text:string, item: { key: any; })=>{
                    let hasRole = this.state.roles['moderator'] && this.state.roles['moderator'].includes(item.key);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                                   onChange={this.updateRole.bind(this, 'moderator', item, !hasRole)}></Switch>
                }
            },
        ];
        return <div>
            <h2>User Management</h2>
            {/* @ts-ignore    TS: Need to figure out what's wrong here -- number and string not compatible... */}
            <Table dataSource={this.state.allUsers} columns={columns}>
            </Table>
        </div>
    }
}

const AuthConsumer = (props:UsersListProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :   // @ts-ignore  TS: Can value really be null here?
            <UsersList {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);