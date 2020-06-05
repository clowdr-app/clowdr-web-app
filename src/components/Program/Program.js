import React from 'react';
import {Tabs, Timeline} from 'antd';
import Parse from "parse";
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import LiveVideoPanel from "../LiveStreaming/LiveVideoPanel";

var moment = require('moment');

class Program extends React.Component {
    constructor(props) {
        super(props);
        this.state = {sessions: [], loading: true}
    }

    componentDidMount() {
        let query = new Parse.Query("ProgramSession");
        query.include(["items.title"]);
        query.addAscending("startTime");
        query.find().then(res => {
            this.setState({
                sessions: res,
                loading: false
            });
            //TODO live subscription
            // this.sub = this.props.parseLive.subscribe(query);
            // this.sub.on('create', newItem => {
            //     this.setState((prevState) => ({
            //         rooms: [newItem, ...prevState.rooms]
            //     }))
            // })
            // this.sub.on('update', newItem => {
            //     this.setState((prevState) => ({
            //         rooms: prevState.rooms.map(room => room.id == newItem.id ? newItem : room)
            //     }))
            // })
            // this.sub.on("delete", vid => {
            //     this.setState((prevState) => ({
            //         rooms: prevState.rooms.filter((v) => (
            //             v.id != vid.id
            //         ))
            //     }));
            // });
        })
        let query2 = new Parse.Query("LiveVideo");
        query2.first().then(video => {
            this.setState({dummyVideo: video});
        })
    }

    groupBy(list, keyGetter) {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }
    render() {
        let firstDate = moment(moment().format("YYYY-MM-DD"));
        let lastDate = firstDate.clone();
        lastDate.add(1, "days")
        let groupedByDate = this.groupBy(this.state.sessions,(item)=>moment(item.get("startTime"),"ddd "))
        // console.log(firstDate.toDate())
        // console.log(lastDate.toDate())
        // console.log(this.state.sessions)
        return <div>
            <h4>Today's Program:</h4>
            <Timeline mode="left">
                {this.state.sessions
                    // .sort((a, b) => (a.get("startTime") > b.get("startTime") ? 1 : -1))
                    .filter((session) => moment(session.get("endTime")).isBetween(firstDate, lastDate)).map(
                        (value => {
                            let isCurrent = moment().isBetween(moment(value.get("startTime")), moment(value.get("endTime")));
                            let isPast = moment().isAfter(value.get("endTime"));
                            let isFuture = moment().isBefore(value.get("startTime"));

                            var color = "blue";
                            if (isCurrent)
                                color = "green";
                            if (isPast)
                                color = "gray";
                            let video = ""
                            if (this.state.expandedSession == value.id) {
                                video = <div>
                                    <Timeline>
                                        {value.get("items").map(i=>{
                                            return <Timeline.Item>{i.get("title")}</Timeline.Item>
                                        })}
                                    </Timeline>
                                    <LiveVideoPanel video={this.state.dummyVideo}/>
                                </div>
                            }
                            return <Timeline.Item color={color} label={moment(value.get("startTime")).calendar()}> <a
                                onClick={() => {
                                    this.setState({expandedSession: (value.id == this.state.expandedSession ? null : value.id)});
                                    return false;
                                }} href="#">{value.get("title")}</a>
                                {video}
                            </Timeline.Item>

                        })
                    )}
            </Timeline>
        </div>
    }
}

const
    AuthConsumer = (props) => (
        <ParseLiveContext.Consumer>
            {parseValue => (
                <AuthUserContext.Consumer>
                    {value => (
                        <Program {...props} auth={value} parseLive={parseValue}/>
                    )}
                </AuthUserContext.Consumer>
            )
            }

        </ParseLiveContext.Consumer>
    );
export default AuthConsumer;

