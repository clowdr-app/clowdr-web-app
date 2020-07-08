import React from "react";
import {Avatar, Badge, Button, Popover, Skeleton, Tag, Tooltip} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";

import {isAvailableColor, isDNDColor, isDNDNameColor, isLookingForConversationColor} from "./LobbyColors.js";

class UserStatusDisplay extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            id: this.props.profileID
        }
    }

    componentDidMount() {
        this.mounted = true;

        this.props.auth.helpers.getUserProfilesFromUserProfileID(this.state.id).then(profile=>{
            if(!this.mounted)
                return;
            let userStatus = this.props.auth.helpers.presences[this.state.id];
            this.setState({profile: profile, presence: userStatus})
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(!this.mounted)
            return;
        if(this.props.auth.helpers.presences[this.state.id] != this.state.presence){
            this.setState({presence: this.props.auth.helpers.presences[this.state.id]});
        }
    }

    openDM(){
        this.props.auth.helpers.createOrOpenDM(this.state.profile);
    }

    render() {
        if (!this.state.profile)
            return <Skeleton.Input active style={{width: '100px', height: '1em'}}/>
        let presenceDesc = "";
        let badgeColor = "";
        let badgeStyle = "success";
        let nameColor = "black";
        let dntWaiver = "";
        if (!this.state.presence){
            if(this.props.onlyShowWithPresence)
                return <div></div>
            badgeStyle = "default";
            presenceDesc = "Offline";
        } else if (this.state.presence.get("isLookingForConversation")) {
            presenceDesc = "looking for conversation";
            badgeColor = isLookingForConversationColor;
            badgeStyle = "processing";
        } else if (this.state.presence.get("isAvailable")) {
            // presenceDesc = "In a conversation: come join if you like";
            presenceDesc = "";
            badgeColor = isAvailableColor;
        } else if (this.state.presence.get("isOpenToConversation")) {
            presenceDesc = "open to conversation";
            badgeColor = "geekBlue";
        } else if (this.state.presence.get("isDND")) {
            presenceDesc = "busy: do not disturb";
            badgeColor = isDNDColor;
            nameColor = isDNDNameColor;
        } else if (this.state.presence.get("isDNT")){
            presenceDesc = "Do not track"
            badgeStyle = "default"
            dntWaiver = "Only you can see this status. Others will still see your presence in public rooms, but won't see a status"
        }
        // BCP: We should really do the italic styling and color in a style sheet!
        let statusDesc = (this.state.presence ? <i><span style={{color:"gray"}}>{this.state.presence.get("status")}</span></i> : <></>);
        let onClick = ()=>{};
        if (this.props.auth.userProfile.id != this.state.profile.id){
            onClick = this.openDM.bind(this);
        }
        let avatar, inlineAvatar;
        if (this.state.profile && this.state.profile.get("profilePhoto") != null)
            avatar = <Avatar src={this.state.profile.get("profilePhoto").url()}/>

        let affiliation = "";
        // BCP: This way of writing the tests is certainly suboptimal!
        if ("" + this.state.profile.get("affiliation") != "undefined") {
            affiliation = " (" + this.state.profile.get("affiliation") + ")";
        }
        let bio = "";
        if ("" + this.state.profile.get("bio") != "undefined") {
            bio = <div>
                {"" + this.state.profile.get("bio")}
            </div>;
        }
        let tags = "";
        let tagToHighlight;
        let tagsToHighlight = [];
        if (this.state.profile.get("tags")) {
            tags = this.state.profile.get("tags").map(t => {
                    let tag = <Tag key={t.id} color={t.get('color')} closable={false}
                                   style={{marginRight: 3}}>{t.get("label")}</Tag>
                    if (t.get("alwaysShow"))
                        tagsToHighlight.push(tag);
                    else if (!tagToHighlight || t.get("priority") < tagToHighlight.get("priority"))
                        tagToHighlight = t;
                    if (t.get("tooltip"))
                        return <Tooltip mouseEnterDelay={0.5} key={t.id} title={t.get("tooltip")}>{tag}</Tooltip>
                    else return tag;
                }
            )
        }
        if (tagToHighlight) {
            tagsToHighlight.push(<Tag key={tagToHighlight.id} color={tagToHighlight.get('color')} closable={false}
                           style={{marginRight: 3}}>{tagToHighlight.get("label")}</Tag>);
        }

        let popoverTitle =
            <div className="nameAndAvatar">
              {avatar} {this.state.profile.get("displayName")} {affiliation}
              <span className="presenceDesc">{presenceDesc == "" ? "" : " is " + presenceDesc}</span>
              <div> {tags} {statusDesc} </div>
            </div>;
        let webpage = "";
        if ("" + this.state.profile.get("webpage") != "undefined") {
            webpage = <div>
                <a href={this.state.profile.get("webpage")} target="_blank">
                    {this.state.profile.get("webpage")}</a>
                </div>;
        }
        let dmButton = <Button type="primary" onClick={onClick}>Send a message to {this.state.profile.get("displayName")}</Button>
        let firstLine =
            <div>
              {dntWaiver}
            </div>;
        // BCP: And this needs a bit more vertical spacing between non-empty elements too:
        let popoverContent = <div className="userPopover"> {firstLine} {bio} {webpage} {dmButton} </div>;
/*
        let popoverContent = <span></span>
        // BCP: Not clear to me why we were treating these so popovers differently
        // in different contexts; I am going to make them all the same for now
        if (this.props.popover)
*/
        return <div className="userDisplay" style={this.props.style}
                    onClick={onClick}>
                    <Popover title={popoverTitle} content={popoverContent} mouseEnterDelay={0.5}>
                      &nbsp;&nbsp;&nbsp; {/* BCP: Better way to do this? */}
                      <Badge status={badgeStyle} color={badgeColor} />
                      <span style={{color:nameColor}}>{this.state.profile.get("displayName")}</span>
                      &nbsp;
                      <span className="highlightedTags">{tagsToHighlight}</span>
                      {this.props.popover && statusDesc != "" ? <></> : <span> &nbsp; {statusDesc} </span>}
                    </Popover>
              </div>
/*
    else return <div
        key={this.state.profile.id}
        className="userTag"
        onClick={onClick}
        title=
        {dntWaiver}>
        <Popover
            title={presenceDesc}
            mouseEnterDelay={0.5}
            content={popoverContent}>
        <Badge  status={badgeStyle} color={badgeColor} />
           {this.state.profile.get("displayName")} {statusDesc}</Popover>
    </div>
*/
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserStatusDisplay {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default withRouter(AuthConsumer);
