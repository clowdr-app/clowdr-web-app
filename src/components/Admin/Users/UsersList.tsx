import * as React from "react";
import Parse from "parse";
import { AuthUserContext } from "../../Session";
import withLoginRequired from "../../Session/withLoginRequired";
import { Button, Input, message, Space, Switch, Table, Tooltip } from "antd";
import { SearchOutlined } from "@material-ui/icons";
import Highlighter from 'react-highlight-words';
import { ClowdrState, UserSessionToken } from "../../../ClowdrTypes";
import assert from 'assert';
import { UserProfile } from "../../../classes/ParseObjects";
import { FilterDropdownProps } from "antd/lib/table/interface";

interface UsersListProps {
    auth: ClowdrState,
}

// Replace item by manu or something
interface UsersListState {
    loading: boolean,
    banUpdating: boolean,
    allUsers: UserProfile[],
    roles: Record<string, string[]>,
    roleUpdating: boolean,
    searchedColumn: string,
    searchText: string,
}

interface UserProfileSchema {
}

// TS: Not very sure about this!  
interface QueryResult { id: string, get: (x: string) => unknown }

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
            roles: {},
            searchedColumn: "",
            searchText: "",
            roleUpdating: false,
        }
    }

    async updateBan(item: UserProfile) {
        assert(this.props.auth.currentConference, "Current conference is null");

        this.setState({ banUpdating: true })
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
                    profileID: item.id,
                    isBan: (item.user.isBanned === "No")
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if (res.status === "OK") {
            let updatedItem = item;
            if (item.user.isBanned === "Yes")
                updatedItem.user.set("isBanned", "No");
            else
                updatedItem.user.set("isBanned", "Yes");
            this.setState((prevState: UsersListState) => ({
                banUpdating: false,
                allUsers: prevState.allUsers.map(u => (u.id === item.id ? updatedItem : u))
            }));
        }
        else {
            message.error(res.message);
            this.setState({ banUpdating: false })
        }
    }
    async componentDidMount() {
        assert(this.props.auth.currentConference, "Current conference is null");

        let parseUserQ = new Parse.Query<UserProfile>("UserProfile")
        parseUserQ.equalTo("conference", this.props.auth.currentConference);
        parseUserQ.include("user");
        parseUserQ.addAscending("displayName");
        // Code quality: Is the constant in the next line going to bite us someday??
        parseUserQ.limit(4000);
        // @ts-ignore     TS: Apparently the Parse type definitions are not up to date (this was added recently)
        parseUserQ.withCount();
        let nRetrieved = 0;
        let roleData: Array<Promise<{
            role: { name: string }, users: string[]
        }>> = [];
        for (let role of roles) {
            roleData.push(Parse.Cloud.run('admin-userProfiles-by-role', {
                id: this.props.auth.currentConference.id,
                roleName: role.name
            }).then((ids) => {
                return { 'role': role, 'users': ids }
            }))
        }
        let roleUsers = await Promise.all(roleData);

        // @ts-ignore - See `withCount` above
        let { count, results }: { count: number, results: UserProfile[] }
            = await parseUserQ.find();
        nRetrieved = results.length;
        let allUsers = results;
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
                allUsers = allUsers.concat(results);
            }
        }
        let roleObj: Record<string, string[]> = {};
        for (let role of roleUsers) {
            roleObj[role.role.name] = role.users;
        }
        this.setState({ allUsers: allUsers, loading: false, roles: roleObj });
    }
    async refreshRoles() {
        assert(this.props.auth.currentConference, "Current conference is null");

        let roleData: Array<Promise<{
            role: { name: string },
            users: string[]
        }>> = [];
        for (let role of roles) {
            roleData.push(Parse.Cloud.run('admin-userProfiles-by-role', {
                id: this.props.auth.currentConference.id,
                roleName: role.name
            }).then((ids) => {
                return { 'role': role, 'users': ids }
            }));
        }
        let roleUsers = await Promise.all(roleData);
        let roleObj: Record<string, string[]> = {};
        for (let role of roleUsers) {
            roleObj[role.role.name] = role.users;
        }

        this.setState({ roles: roleObj });
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
    getColumnSearchProps = (dataIndex: keyof UserProfile | "isBanned") => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => {
            assert(clearFilters);

            return <div style={{ padding: 8 }}>
                <Input
                    ref={node => {
                        this.searchInput = node;
                    }}
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => this.handleSearch(selectedKeys as string[], confirm, dataIndex)}
                    style={{ width: 188, marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => this.handleSearch(selectedKeys as string[], confirm, dataIndex)}
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
        },
        filterIcon: (filtered: boolean): React.ReactNode => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value: string | number | boolean, record: UserProfile): boolean => {
            assert(typeof value === "string");
            if (dataIndex === "isBanned") {
                return record.user.isBanned.toLowerCase().includes(value.toLowerCase());
            }
            else {
                return record[dataIndex].toString().toLowerCase().includes(value.toLowerCase());
            }
        },
        onFilterDropdownVisibleChange: (visible: boolean) => {
            if (visible) {
                setTimeout(() => { if (this.searchInput != null) this.searchInput.select(); })
            }
        },
        render: (text: string, item: UserProfile) => {
            if (dataIndex === "isBanned") {
                return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={text === "Yes"} loading={this.state.banUpdating} onChange={this.updateBan.bind(this, item)}></Switch>
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

    async updateRole(roleName: string, item: UserProfile, shouldHaveRole: boolean) {
        assert(this.props.auth.currentConference, "Current conference is null");

        this.setState({ roleUpdating: true })
        await Parse.Cloud.run('admin-role', {
            id: this.props.auth.currentConference.id,
            roleName: roleName,
            // TODO: Lookup the user's profile to get this: userProfileId: item.id,
            shouldHaveRole: shouldHaveRole
        })
        this.refreshRoles();
        this.setState({ roleUpdating: false })
    }

    render() {
        assert(this.props.auth.currentConference, "Current conference is null");
        let currConfId = this.props.auth.currentConference.id;

        if (!this.props.auth.roles.find(v => v
            && v.getName() === currConfId + "-admin"))
            return <div>Error: you do not have permission to view this page - it is only for administrators.</div>
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
            }, {
                title: <Tooltip title="Administrators have full access to all that managers do, plus the ability to manage internal clowdr settings"><>Admin</></Tooltip>,
                key: 'admin',
                render: (text: string, item: UserProfile) => {
                    let hasRole = this.state.roles['admin'] && this.state.roles['admin'].includes(item.id);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                        onChange={this.updateRole.bind(this, 'admin', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Content managers can edit the program"><>Manager</></Tooltip>,
                key: 'manager',
                render: (text: string, item: UserProfile) => {
                    let hasRole = this.state.roles['manager'] && this.state.roles['manager'].includes(item.id);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                        onChange={this.updateRole.bind(this, 'manager', item, !hasRole)}></Switch>
                }
            },
            {
                title: <Tooltip title="Moderators can enter all private channels and send global announcements"><>Moderator</></Tooltip>,
                key: 'moderator',
                render: (text: string, item: UserProfile) => {
                    let hasRole = this.state.roles['moderator'] && this.state.roles['moderator'].includes(item.id);
                    return <Switch checkedChildren="Yes" unCheckedChildren="No" checked={hasRole} loading={this.state.roleUpdating}
                        onChange={this.updateRole.bind(this, 'moderator', item, !hasRole)}></Switch>
                }
            },
        ];
        // Add the key to the users - this is a bit unsafe but nevermind
        this.state.allUsers.forEach(item => {
            // @ts-ignore
            item.key = item.id;
        });
        return <div>
            <h2>User Management</h2>
            <Table dataSource={this.state.allUsers} columns={columns}>
            </Table>
        </div>
    }
}

const AuthConsumer = withLoginRequired((props: UsersListProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :   // @ts-ignore  TS: Can value really be null here?
            <UsersList {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
