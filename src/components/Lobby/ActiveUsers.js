import React from 'react';
import {Avatar, Card, List, Space, Spin, Tabs} from "antd";
import InfiniteScroll from 'react-infinite-scroller';
import Parse from "parse";

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
        this.state = {activeUsers: {}, hasMore: true };
    }

    installActivityListener(firstValueInList, firstKeyInList) {
        let query = new Parse.Query("UserStatus");
        query.include(["user.displayname","user.profilePhoto"]);
        query.addDescending("updatedAt");
        let date = new Date();
        date.setTime(date.getTime() - 10);

        // query.greaterThanOrEqualTo("updatedAt",date);
        query.find().then(res => {
            this.setState({
                activeUsers: res,
                loading: false
            });
            this.sub = this.props.parseLive.subscribe(query);
            this.sub.on('create', vid => {
                this.setState((prevState) => ({
                    activeUsers: [vid, ...prevState.activeUsers]
                }))
            })
            this.sub.on("delete", vid=>{
                this.setState((prevState)=> ({
                    activeUsers: prevState.activeUsers.filter((v)=>(
                        v.id != vid.id
                    ))
                }));
            });
        })
        // if(this.query){
        //     this.query.off("value");
        // }
        // this.query = this.statusRef.orderByChild("last_changed");
        // if (firstKeyInList) {
        //     console.log(firstValueInList);
        //     console.log(firstKeyInList);
        //     this.query = this.query.endAt(firstValueInList, firstKeyInList);
        // }
        // this.query = this.query.limitToLast(40);
        //
        // this.query.on("value", async (val) => {
        //     const res = val.val();
        //     let users = {};
        //     if (res) {
        //         let requests = [];
        //         for (let i = 0; i < Object.keys(res).length; i++) {
        //             let k = Object.keys(res)[i];
        //             requests.push(this.usersRef.child(k).once("value").then((userData) => {
        //                 users[i] = {
        //                     name: userData.val().username,
        //                     photoURL: userData.val().photoURL,
        //                     last_changed: res[k].last_changed
        //                 }
        //             }));
        //         }
        //         await Promise.all(requests);
        //         this.setState({activeUsers: users});
        //     }
        // });

    }

    componentDidMount() {
        this.installActivityListener();
    }

    componentWillUnmount() {
        // this.statusRef.off("value");
    }

    loadMore() {
        if(this.state.activeUsers){
            let keys = Object.keys(this.state.activeUsers);
            if(keys.length < 20){
                this.setState({hasMore: false});
                return;
            }
            // let newLast = keys[19];
            // this.installActivityListener(this.state.activeUsers[newLast].last_changed, newLast);
        }
    }

    render() {
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
                        dataSource={Object.values(this.state.activeUsers)}
                        renderItem={item => (
                            <List.Item key={item.id}>
                                <List.Item.Meta
                                    avatar={
                                        <Avatar src={(item.get("user").get("profilePhoto")?  item.get("user").get("profilePhoto").url() : "")}/>
                                    }
                                    title={item.get("user").get("displayname")}
                                />
                            </List.Item>
                        )}
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


export default ActiveUsers;