import {NavLink} from "react-router-dom";
import React from "react";
import {Button, Skeleton, Tooltip} from "antd";
import BreakoutRoomDisplay from "../Lobby/BreakoutRoomDisplay"
import ProgramVideoChat from "../VideoChat/ProgramVideoChat";
import ProgramPersonDisplay from "./ProgramPersonDisplay";
import moment from "moment";
import ProgramItemDisplay from "./ProgramItemDisplay";
var timezone = require('moment-timezone');

export default class ProgramSessionEventDisplay extends React.Component{
    constructor(props){
        super(props);
        this.state = {loading: true};
    }

    async componentDidMount() {
        let event = await this.props.auth.programCache.getProgramSessionEvent(this.props.id, this);
        this.setState({
            ProgramSessionEvent: event,
            loading: false
        })
    }
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramSessionEvent", this, this.props.id);
    }
    formatTime(timestamp) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }
    render() {
        if(this.state.loading){
            return <Skeleton.Input />
        }
        let item = this.state.ProgramSessionEvent.get("programItem");
        return <ProgramItemDisplay id={item.id} auth={this.props.auth} showBreakoutRoom={this.props.showBreakoutRoom} event={this.state.ProgramSessionEvent} />
    }
}