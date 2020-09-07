import { NavLink } from "react-router-dom";
import React from "react";
import { Tag, Button, Skeleton, Tooltip } from "antd";
import ProgramPersonDisplay from "./ProgramPersonDisplay";
import moment from "moment";
import { startTImeOffsetForProgramDisplay } from "../../globals";
import { withRouter } from 'react-router';

var timezone = require('moment-timezone');

class ProgramSessionEventDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loading: true };
    }

    async componentDidMount() {
        let event = await this.props.auth.programCache.getProgramSessionEvent(this.props.id, this);
        let programItem = await this.props.auth.programCache.getProgramItem(event.get("programItem").id, this);
        let track = await this.props.auth.programCache.getProgramTrack(event.get("programTrack").id, this);
        this.setState({
            ProgramSessionEvent: event,
            ProgramItem: programItem,
            loading: false,
            ProgramTrack: track,
            room: this.props.auth.programCache.getProgramRoomForEvent(event)
        })
    }

    componentWillUnmount() {
        if (this.props.id)
            this.props.auth.programCache.cancelSubscription("ProgramSessionEvent", this, this.props.id);
        if (this.state.ProgramTrack)
            this.props.auth.programCache.cancelSubscription("ProgramTrack", this, this.state.ProgramTrack.id);
        if (this.state.ProgramItem)
            this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
    }

    formatTime(timestamp) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }

    render() {
        if (this.state.loading) {
            return <Skeleton.Input />
        }
        let authors = this.state.ProgramItem.get("authors") ? this.state.ProgramItem.get("authors") : [];
        let authorstr = "";
        let authorsArr = authors.map(a => <ProgramPersonDisplay key={a.id} auth={this.props.auth} id={a.id} />);
        if (authorsArr.length >= 1)
            authorstr = authorsArr.reduce((prev, curr) => [prev, ", ", curr]);
        let sessionInfo = <div>
            {this.formatTime(this.state.ProgramSessionEvent.get("startTime"))} - {this.formatTime(this.state.ProgramSessionEvent.get("endTime"))}: Event in track {this.state.ProgramTrack.get("name")} (Click to enter event)
            <br />
            <NavLink to={"/program/" + this.state.ProgramItem.get("confKey")}>View more about this paper</NavLink>

        </div>
        let now = Date.now();
        // console.log("now =                " + now.toString());
        let littleBitAfterNow = now + 60000 * startTImeOffsetForProgramDisplay;
        // console.log("littleBitAfterNow = " + littleBitAfterNow.toString());

        let className = "summaryProgramEvent";
        let linkTo = "/program/" + this.state.ProgramItem.get("confKey");
        let startTime = this.state.ProgramSessionEvent.get("startTime");
        let endTime = this.state.ProgramSessionEvent.get("endTime");
        if (endTime < now) {
            className = "summaryProgramEvent-past";
        } else if (startTime <= littleBitAfterNow && endTime >= now) {
            linkTo = "/live/now/" + this.state.room.get("name");
            className = "summaryProgramEvent-live";
        } else if (startTime > littleBitAfterNow) {
            className = "summaryProgramEvent-future";
        }
        if (this.state.ProgramSessionEvent.get("directLink")) {
            linkTo = this.state.ProgramSessionEvent.get("directLink");
        }

        let badge = <></>
        if (this.state.ProgramTrack && this.state.ProgramTrack.get("badgeText")) {
            badge = <Tag color={this.state.ProgramTrack.get("badgeColor")}>{this.state.ProgramTrack.get("badgeText")}</Tag>
        }

        let tooltip = <div>
            <b>{this.state.ProgramItem.get("title")}</b>
            <div><i>{authorstr}</i></div>
            {sessionInfo}
            {/*<p><b>Abstract: </b> {this.state.ProgramItem.get("abstract")}</p>*/}
            {(this.props.auth.user && this.state.ProgramItem.get("breakoutRoom")) ?
                <p><b>Breakout Room: </b>
                    <Button onClick={() => {
                        this.props.history.push("/breakoutRoom/" + this.state.ProgramItem.get("confKey"))
                    }
                    }>Join Breakout Room</Button></p> : <></>}

        </div>
        return <div className={"program-item-display " + className}>
            <Tooltip placement="right" title={tooltip}>
                <NavLink to={linkTo}>{badge} {this.state.ProgramItem.get("title")}</NavLink></Tooltip>
        </div>

    }
}

export default withRouter(ProgramSessionEventDisplay);
