import React from 'react';
import {Avatar, Badge, Card, List, Space, Spin, Tabs} from "antd";

const {TabPane} = Tabs;
const IconText = ({icon, text}) => (
    <Space>
        {React.createElement(icon)}
        {text}
    </Space>
);

class ActiveUsers extends React.Component {
    constructor(props) {
        super(props);
        this.state = {usersHere: [], hasMore: true, profiles: {}, loggedIn: false};
    }

    //
    // installActivityListener(firstValueInList, firstKeyInList) {
    //     let query = new Parse.Query("UserStatus");
    //     query.include(["user.displayname","user.profilePhoto"]);
    //     query.addDescending("updatedAt");
    //     let date = new Date();
    //     date.setTime(date.getTime() - 10);
    //
    //     // query.greaterThanOrEqualTo("updatedAt",date);
    //     query.find().then(res => {
    //         this.setState({
    //             activeUsers: res,
    //             loading: false
    //         });
    //         this.sub = this.props.parseLive.subscribe(query);
    //         this.sub.on('create', vid => {
    //             this.setState((prevState) => ({
    //                 activeUsers: [vid, ...prevState.activeUsers]
    //             }))
    //         })
    //         this.sub.on("delete", vid=>{
    //             this.setState((prevState)=> ({
    //                 activeUsers: prevState.activeUsers.filter((v)=>(
    //                     v.id != vid.id
    //                 ))
    //             }));
    //         });
    //     })
    //
    // }

    userChanged(newUser) {
        console.log(newUser)
        if (newUser == null) {
            this.cleanup();
            this.setState({loggedIn: false});
        } else {
            this.setState({loggedIn: true});
            this.props.auth.getChatClient((client) => {
                this.chatClient = client;
                client.on("userUpdated", (update) => {
                    console.log(update);
                    if (update.user)
                        this.setState((prevState) => {
                                let authorID = update.user.identity.substring(0, update.user.identity.indexOf(":"));
                                console.log(authorID)
                                return (
                                    {
                                        usersHere: prevState.usersHere.map(profile => profile.id == authorID ?
                                            {
                                                ...profile,
                                                online: update.user.online,
                                                notifiable: update.user.notifiable,
                                                attributes: update.user.attributes
                                            } : profile)
                                    }
                                )
                            }
                        )
                })
                this.props.auth.getLiveChannel((channel) => {
                    if (this.channel) {
                        this.cleanupChannel(this.channel);
                    }
                    this.channel = channel;
                    channel.getUserDescriptors().then((users) => {
                        let formattedUsers = [];
                        users.items.forEach((user) => {
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
                            this.setState({usersHere: formattedUsers});
                        })
                        channel.on("memberJoined", (member) => {
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
                this.setState({hasMore: false});
                return;
            }
            // let newLast = keys[19];
            // this.installActivityListener(this.state.activeUsers[newLast].last_changed, newLast);
        }
    }

    render() {
        if (!this.state.loggedIn) {
            return <Card title="Active Users" style={{height: '75vh', overflow: 'auto', border: '1px solid #FAFAFA'}}>
            </Card>
        }
        return (
            <Card title="Active Users" style={{height: '75vh', overflow: 'auto', border: '1px solid #FAFAFA'}}>
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
                            avatar = <Avatar src={profile.get("profilePhoto").url()}/>
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
                                /><Badge status={item.online ? "success" : "default"}/>
                            </List.Item>
                        )
                    }}
                >
                    {this.state.loading && this.state.hasMore && (
                        <div className="demo-loading-container">
                            <Spin/>
                        </div>
                    )}
                </List>
                {/*</InfiniteScroll>*/}
            </Card>

        );
    }

    cleanupChannel(channel) {
        channel.removeAllListeners("memberJoined");
        console.log("Cleaned up")
        console.log(channel)
    }
}


export default ActiveUsers;