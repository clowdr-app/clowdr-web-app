import React from 'react';
import { Avatar, Badge, Card, List, Space, Spin, Tabs } from "antd";
import { ClowdrState } from "../../ClowdrTypes";
import { timeStamp } from 'console';
import { UserDescriptor } from 'twilio-chat/lib/userdescriptor';

/*
const { TabPane } = Tabs;
interface IconText { icon: any, text: string }  // ???
const IconText = ({ icon, text }: IconText) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);
*/

interface ActiveUsersProps {
    auth: ClowdrState | null;
}

interface ActiveUsersState {
    usersHere: any[],  // ??
    hasMore: boolean,
    loggedIn: boolean,
    activeUsers: any[],
    loading: boolean,
    profiles: any,
}

interface UserDesc {   // TS: What should this be called?
    identity: string,
    online: boolean,
    notifiable: boolean,
    attributes: any,  // TS: ???
}

interface Update { // TS: Guessing!
    user: UserDescriptor,
}

type Channel = any   // TS: Probly something from Twilio??
type ChatClient = any   // TS: Probly something from Twilio??

class ActiveUsers extends React.Component<ActiveUsersProps, ActiveUsersState> {
    chatClient: any;
    channel: Channel;
    constructor(props: ActiveUsersProps) {
        super(props);
        this.state = {
            usersHere: [], hasMore: true, profiles: {}, loggedIn: false,
            loading: false, activeUsers: [],  // TS: Guessing!
        };
    }

    userChanged(newUser: null) {
        console.log(newUser)
        if (newUser == null) {
            this.cleanup();
            this.setState({ loggedIn: false });
        } else {
            this.setState({ loggedIn: true });
            if (this.props.auth) // Should not fail??
                this.props.auth.getChatClient((client: ChatClient) => {
                    this.chatClient = client;
                    client.on("userUpdated", (update: Update) => {
                        console.log(update);
                        if (update.user)
                            this.setState((prevState) => {
                                let authorID = update.user.identity.substring(0, update.user.identity.indexOf(":"));
                                console.log(authorID)
                                return ({
                                    usersHere: prevState.usersHere.map(profile => profile.id == authorID ?
                                        {
                                            ...profile,
                                            online: update.user.online,
                                            notifiable: update.user.notifiable,
                                            attributes: update.user.attributes
                                        } : profile)
                                })
                            }
                            )
                    })
                    if (this.props.auth) // Should not fail??
                        this.props.auth.getLiveChannel((channel: Channel) => {
                            if (this.channel) {
                                this.cleanupChannel(this.channel);
                            }
                            this.channel = channel;
                            channel.getUserDescriptors().then((users: {items:UserDesc[]}) => {
                                let formattedUsers: { id: any; name: any; initials: string; online: any; attributes: any; notifiable: any; }[] = [];
                                users.items.forEach((user: UserDesc) => {
                                    let authorName = user.identity.substring(1 + user.identity.indexOf(":"));
                                    let initials = "";
                                    let authorID = user.identity.substring(0, user.identity.indexOf(":"));
                                    authorName.split(" ").forEach((v => initials += v.substring(0, 1)))

                                    // user.subscribe();

                                    let obj = {
                                        id: authorID,
                                        name: authorName,
                                        initials: initials,
                                        online: user.online,
                                        attributes: user.attributes,
                                        notifiable: user.notifiable
                                    };
                                    if (!this.state.profiles[authorID]) {
                                        if (this.props.auth) // Should not fail
                                            this.props.auth.getUserProfile(authorID, (u) => {
                                                this.setState((prevState) => ({
                                                    profiles: {
                                                        ...prevState.profiles,
                                                        [u.id]: u
                                                    }
                                                }))
                                            })
                                    }
                                    formattedUsers.push(obj);
                                    this.setState({ usersHere: formattedUsers });
                                })
                                channel.on("memberJoined", (member: string) => {
                                    console.log("Added " + member);
                                })
                            });
                        });
                });
        }
    }

    componentDidMount() {
        // this.installActivityListener();
        let _this = this;
        // console.log(client.getChannelUserDescriptors())
        // client.users.list().then((user)=>{
        //     console.log(user);
        // });
    }

    cleanup() {
        if (this.channel)
            this.cleanupChannel(this.channel);
        this.channel = null;
    }

    componentWillUnmount() {
        // this.statusRef.off("value");
        this.cleanup();
    }

    loadMore() {
        if (this.state.activeUsers) {
            let keys = Object.keys(this.state.activeUsers);
            if (keys.length < 20) {
                this.setState({ hasMore: false });
                return;
            }
            // let newLast = keys[19];
            // this.installActivityListener(this.state.activeUsers[newLast].last_changed, newLast);
        }
    }

    render() {
        if (!this.state.loggedIn) {
            return <Card title="Active Users" style={{ height: '75vh', overflow: 'auto', border: '1px solid #FAFAFA' }}>
            </Card>
        }
        return (
            <Card title="Active Users" style={{ height: '75vh', overflow: 'auto', border: '1px solid #FAFAFA' }}>
                {/*<InfiniteScroll*/}
                {/*    pageStart={0}*/}
                {/*    // hasMore={Object.keys(this.state.activeUsers).length >= 20}*/}
                {/*    hasMore={true}*/}
                {/*    loadMore={this.loadMore.bind(this)}*/}
                {/*    useWindow={false}*/}
                {/*    initialLoad={false}*/}
                {/*    loader={<Spin>Loading...</Spin>}*/}
                {/*>*/}
                <List
                    dataSource={this.state.usersHere}
                    renderItem={item => {
                        let profile = this.state.profiles[item.id];
                        let avatar, username;
                        if (profile && profile.get("profilePhoto") != null)
                            avatar = <Avatar src={profile.get("profilePhoto").url()} />
                        else
                            avatar = <Avatar>{item.initials}</Avatar>
                        if (profile)
                            username = profile.get("displayName");
                        else
                            username = item.name;
                        return (
                            <List.Item key={item.id}>
                                <List.Item.Meta
                                    avatar={
                                        avatar
                                    }
                                    title={username}
                                /><Badge status={item.online ? "success" : "default"} />
                            </List.Item>
                        )
                    }}
                >
                    {this.state.loading && this.state.hasMore && (
                        <div className="demo-loading-container">
                            <Spin />
                        </div>
                    )}
                </List>
                {/*</InfiniteScroll>*/}
            </Card>

        );
    }

    cleanupChannel(channel: Channel) {
        channel.removeAllListeners("memberJoined");
        console.log("Cleaned up")
        console.log(channel)
    }
}

export default ActiveUsers;