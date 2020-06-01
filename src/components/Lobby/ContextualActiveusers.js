import React, {Component} from "react";
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import Parse from "parse";
import {Badge, Card, Divider, List, Popconfirm, Popover, Spin} from "antd";
import {withRouter} from "react-router-dom";
import NewRoomForm from "./NewRoomForm";

class ContextualActiveUsers extends Component {

    constructor(props) {
        super(props);
        this.state = {loading: true};
    }

    async componentDidMount() {
        this.props.auth.refreshUser((user) => {
            if (user) {
                this.setState({loggedIn: true});
                this.installActivityListener();

            } else {
                this.setState({loggedIn: false});
            }
        });

    }

    installActivityListener() {
        let query = new Parse.Query("BreakoutRoom");

        query.equalTo("conference", this.props.auth.currentConference);
        // query.greaterThanOrEqualTo("updatedAt",date);
        query.find().then(res => {
            this.setState({
                activeRooms: res,
                loading: false
            });
            this.sub = this.props.parseLive.subscribe(query);
            this.sub.on('create', vid => {
                this.setState((prevState) => ({
                    activeRooms: [vid, ...prevState.activeRooms]
                }))
            })
            this.sub.on("delete", vid => {
                this.setState((prevState) => ({
                    activeRooms: prevState.activeRooms.filter((v) => (
                        v.id != vid.id
                    ))
                }));
            });
            this.sub.on('update', newItem => {
                this.setState((prevState) => ({
                    activeRooms: prevState.activeRooms.map(room => room.id == newItem.id ? newItem : room)
                }))
            })
        })

    }

    componentWillUnmount() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }

    joinCall(room) {
        console.log(this.props)
        this.props.history.push("/video/" + this.props.auth.currentConference.get('conferenceName') + "/" + room.get("title"));
        this.props.auth.setActiveRoom(room.get("title"));
    }

    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }
        return (
            <Card title="Active Rooms" style={{height: '75vh', overflow: 'auto', border: '1px solid #FAFAFA'}}>
                {/*<InfiniteScroll*/}
                {/*    pageStart={0}*/}
                {/*    // hasMore={Object.keys(this.state.activeUsers).length >= 20}*/}
                {/*    hasMore={true}*/}
                {/*    loadMore={this.loadMore.bind(this)}*/}
                {/*    useWindow={false}*/}
                {/*    initialLoad={false}*/}
                {/*    loader={<Spin>Loading...</Spin>}*/}
                {/*>*/}
                <NewRoomForm />
                <Divider/>
                <List
                    dataSource={this.state.activeRooms}
                    renderItem={item => {
                        // let profile = this.state.profiles[item.id];
                        // let avatar, username;
                        // if (profile && profile.get("profilePhoto") != null)
                        //     avatar = <Avatar src={profile.get("profilePhoto").url()}/>
                        // else
                        //     avatar = <Avatar>{item.initials}</Avatar>
                        // if (profile)
                        //     username = profile.get("displayname");
                        // else
                        //     username = item.name;
                        let membersString = "";
                        let membersCount = 0;
                        if (item.get("members")) {
                            membersCount = item.get("members").length;
                            for (let m of item.get("members")) {
                                membersString += m.get("displayname") + ", ";
                            }
                        }
                        if (membersString.length > 1)
                            membersString = membersString.substring(0, membersString.length - 2);
                        else
                            membersString = "Nobody's here right now";

                        return (
                            <List.Item key={item.id}>
                                <Popover content={membersString}>
                                    <Popconfirm title="Are you sure you want to join this video call?"
                                                onConfirm={this.joinCall.bind(this, item)} okText="Join">
                                        <span><a href="#"><Badge
                                            showZero={true}
                                            style={{backgroundColor: (membersCount == 0 ? '#999' : '#52c41a')}}
                                            count={membersCount}/> {item.get("title")}</a></span></Popconfirm>
                                </Popover>
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
}

const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
            <ParseLiveContext.Consumer>
                {parseLive => (
                    <AuthUserContext.Consumer>
                        {value => (
                            <ContextualActiveUsers {...props} parseLive={parseLive} auth={value}/>
                        )}
                    </AuthUserContext.Consumer>
                )}
            </ParseLiveContext.Consumer>
        // )}</Router.Consumer>

);

export default withRouter(AuthConsumer)
