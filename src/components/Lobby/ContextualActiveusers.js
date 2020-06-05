import React, {Component} from "react";
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import Parse from "parse";
import {Avatar, Badge, Collapse, List, Divider, Skeleton,Tooltip, Tabs} from "antd";
import {withRouter} from "react-router-dom";
import NewRoomForm from "./NewRoomForm";

class ContextualActiveUsers extends Component {

    constructor(props) {
        super(props);
        this.state = {loading: true, currentRoom: this.props.auth.currentRoom, collapsed: this.props.collapsed};
    }

    async componentDidMount() {
        let user = await this.props.auth.refreshUser();
        if (user) {
            this.setState({loggedIn: true});
            this.installActivityListener();

        } else {
            this.setState({loggedIn: false});
        }

    }

    areEqualID(o1, o2) {
        if (!o1 && !o2)
            return true;
        if (!o1 || !o2)
            return false;
        return o1.id == o2.id;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
            if (this.props.auth.user) {
                this.setState({loggedIn: true});
            }
            this.installActivityListener();
        }
        if (this.state.collapsed != this.props.collapsed) {
            this.setState({collapsed: this.props.collapsed});
        }
        if (!this.areEqualID(this.state.currentRoom, this.props.auth.currentRoom)) {
            this.setState({currentRoom: this.props.auth.currentRoom})
        }
    }

    installActivityListener() {


        let query = new Parse.Query("BreakoutRoom");
        query.equalTo("conference", this.props.auth.currentConference);
        query.include("members");
        // query.greaterThanOrEqualTo("updatedAt",date);
        query.find().then(res => {
            if(!this.props.auth.user){
                //event race: user is logged out...
                if(this.sub){
                    this.sub.unsubscribe();
                    return;
                }
            }
            this.setState({
                activeRooms: res,
                loading: false
            });
            if (this.sub) {
                this.sub.unsubscribe();
            }
            this.sub = this.props.parseLive.subscribe(query, this.props.auth.user.getSessionToken());
            this.sub.on('create', async (vid) => {
                vid = await this.props.auth.helpers.populateMembers(vid);
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
            this.sub.on('update', async (newItem) => {
                newItem = await this.props.auth.helpers.populateMembers(newItem);
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

    onChangeTab() {

    }

    expandTab() {
        this.props.setCollapsed(!this.state.collapsed);
    }

    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }
        let tabs = "";
        let liveMembers = 0
        if (this.state.activeRooms)
            for (let room of this.state.activeRooms) {
                if (room && room.get("members"))
                    liveMembers += room.get("members").length;
            }
        if (!this.state.collapsed) {
            tabs = <div>
                <div>
                    <Divider>
                        Available Rooms
                    </Divider>
                    <div style={{textAlign: 'center'}}>
                        <NewRoomForm type="secondary" text="New Room" />
                    </div>
                </div>
            <Collapse bordered={false}
                             defaultActiveKey={this.props.auth.currentRoom ? [this.props.auth.currentRoom.id] : []}
                             style={{backgroundColor: "#f0f2f5"}}>
                {/*<List*/}
                {/*    dataSource={this.state.activeRooms}*/}
                {/*renderItem={item => {*/}
                {this.state.activeRooms ? this.state.activeRooms.sort((i1, i2) => {
                    return (i1 && i2 && i1.get("updatedAt") < i2.get("updatedAt") ? 1 : -1)
                }).map((item) => {
                    if(!item){
                        return <Skeleton />
                    }

                    let membersCount = 0;
                    if (item.get("members")) {
                        membersCount = item.get("members").length;
                    }
                    let header = <div style={{clear: 'both'}}>

                        <div style={{float: 'left'}}>{item.get('title')}</div>
                        <div style={{float: 'right', paddingRight: '10px'}}>


                        <Badge
                            title={membersCount + " user"+(membersCount == 1 ? " is" : "s are")+" in this video chat"}
                            showZero={true}
                            style={{
                                backgroundColor: (membersCount == 0 ? '#999' : '#52c41a'),
                            }}
                            offset={[6, -5]}
                            count={membersCount}/>
                        </div>
                    </div>
                    let joinLink = "";
                        if (!this.state.currentRoom || this.state.currentRoom.id != item.id)
                            joinLink = <div><a href="#"
                                                onClick={this.joinCall.bind(this, item)}>Join this video room</a></div>;
                        let list;
                        if (item.get("members") && item.get("members").length > 0)
                            list = <List dataSource={item.get("members")} size={"small"}
                                         renderItem={user => {
                                             let avatar;
                                             if (user.get("profilePhoto"))
                                                 avatar = <Avatar src={user.get("profilePhoto").url()}/>
                                             else {
                                                 let initials = "";
                                                 user.get("displayname").split(" ").forEach((v => initials += v.substring(0, 1)))

                                                 avatar = <Avatar>{initials}</Avatar>
                                             }
                                             return <List.Item key={user.id}>
                                                 <List.Item.Meta
                                                     avatar={
                                                         avatar
                                                     }
                                                     title={user.get("displayname")}
                                                 />
                                             </List.Item>
                                         }}/>
                        else
                            list = <span>This room is empty</span>
                        return (
                            <Collapse.Panel key={item.id} header={header} showArrow={false}
                                            className="chat-list-panel" style={{borderBottom: "none"}}>
                                {joinLink}
                                {list}
                            </Collapse.Panel>
                        )
                    }
                ) : <Collapse.Panel showArrow={false} header={<Skeleton/>}></Collapse.Panel>}
                {/*{this.state.loading && this.state.hasMore && (*/}
                {/*    <div className="demo-loading-container">*/}
                {/*        <Spin/>*/}
                {/*    </div>*/}
                {/*)}*/}
            </Collapse></div>
        }
        return (
            <div id="sidepopoutcontainer" style={{
                height: '100vh',
                margin: '0 0 0 auto',
                // zIndex: "5",
                // right: 0
            }}>
                <Tabs tabPosition="right" style={{height: '100vh'}}
                      type="card"

                >
                    <Tabs.TabPane
                        style={{marginLeft: 'auto', marginRight: 'auto'}} tab={<span onClick={this.expandTab.bind(this)} style={{paddingLeft: "0px", verticalAlign: "middle"}}>Lobby<Badge
                        title={liveMembers + " user"+(liveMembers == 1 ? " is" : "s are")+" in video chats"}
                        showZero={true} style={{backgroundColor: '#52c41a'}} count={liveMembers} offset={[-2,-20]}></Badge></span>}
                    key="general" style={{backgroundColor: '#f0f2f5',
                        overflow: 'auto',
                        // width: "350px",
                        border: '2px solid #c1c1c1',
                        height: '100vh'}}>
                        <div style={{backgroundColor: '#f0f2f5'}}>

                            {tabs}
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </div>

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
