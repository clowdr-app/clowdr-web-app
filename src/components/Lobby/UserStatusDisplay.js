import React from "react";
import {Avatar, Badge, Button, Popover, Skeleton, Tag, Tooltip} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";

import {isAvailableColor, isDNDColor, isDNDNameColor, isLookingForConversationColor} from "./LobbyColors";
import ReactMarkdown from "react-markdown";
import ProgramItemDisplay from "../Program/ProgramItemDisplay";
import ProgramPersonAuthorship from "../Program/ProgramPersonAuthorship";

class UserStatusDisplay extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            id: this.props.profileID
        }
    }

    componentDidMount() {
        this.mounted = true;

        this.props.auth.helpers.getUserProfilesFromUserProfileID(this.state.id, this).then(profile=>{
            if(!this.mounted)
                return;
            let userStatus = this.props.auth.helpers.presences[this.state.id];
            this.setState({profile: profile, presence: userStatus})
            //Fetch any related program item info
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        this.props.auth.helpers.unmountProfileDisplay(this.state.id, this);
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
    linkRenderer = (props) => {
        let currentDomain = window.location.origin;
        if(props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={()=>{this.props.auth.history.push(props.href.replace(currentDomain,""))}}>{props.children}</a>;
        return <a href={props.href} target="_blank">{props.children}</a>;
    };

    render() {
        if (!this.state.profile)
            return <Skeleton.Input active style={{width: '100px', height: '1em'}}/>
        let presenceDesc = "";
        let badgeColor = "";
        let badgeStyle = "default";
        let nameColor = "black";
        let dntWaiver = "";
        if(this.state.presence && this.state.presence.get("isOnline")) {
            presenceDesc = "(Online)";
            badgeColor = "green";
        }
        else{
            presenceDesc = "(Offline)";
            badgeColor = "grey";
        }
        let onClick = ()=>{};
        if (this.props.auth.userProfile.id != this.state.profile.id){
            onClick = this.openDM.bind(this);
        }
        let avatar, inlineAvatar;
        if (this.state.profile && this.state.profile.get("profilePhoto") != null)
            avatar = <Avatar src={this.state.profile.get("profilePhoto").url()}/>

        let affiliation = "";
        let parensData = [];
        if(this.state.profile.get("pronouns"))
            parensData.push(this.state.profile.get("pronouns"));
        if(this.state.profile.get("position") && this.state.profile.get("affiliation"))
            parensData.push(this.state.profile.get("position") + " @ "+
            this.state.profile.get("affiliation"));
        else if(this.state.profile.get("position"))
            parensData.push(this.state.profile.get("position"));
        else if(this.state.profile.get("affiliation"))
            parensData.push(this.state.profile.get("affiliation"));
        if(parensData.length > 0){
            affiliation = "("+parensData.join(", ")+")";
        }
        let bio = "";
        if (this.state.profile.get("bio")){
            bio = <div className="userBio"><b>Bio:</b><ReactMarkdown source={this.state.profile.get("bio")}
            renderers={{link: this.linkRenderer}}
            /> </div>
        }
        let authorship = "";
        if(this.state.profile.get("programPersons")){
            let persons = [];
            for(let programPerson of this.state.profile.get("programPersons")){
                persons.push(<ProgramPersonAuthorship id={programPerson.id} key={programPerson.id}
                auth={this.props.auth}
                />);
            }
            authorship = <div className="profileAuthorOf">
                {persons}
            </div>
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
              <div> {tags} {presenceDesc}</div>
            </div>;
        let webpage = "";
        if ("" + this.state.profile.get("webpage") != "undefined") {
            webpage = <div>
                <a href={this.state.profile.get("webpage")} target="_blank">
                    {this.state.profile.get("webpage")}</a>
                </div>;
        }
        let dmButton = <Button className="dmButton" type="primary" onClick={onClick}>Send a message to {this.state.profile.get("displayName")}</Button>
        let firstLine =
            <div>
              {dntWaiver}
            </div>;
        // BCP: And this needs a bit more vertical spacing between non-empty elements too:
        let popoverContent = <div className="userPopover"> {firstLine}
        {authorship} {bio} {webpage} {dmButton} </div>;
/*
        let popoverContent = <span></span>
        // BCP: Not clear to me why we were treating these so popovers differently
        // in different contexts; I am going to make them all the same for now
        if (this.props.popover)
*/
        if(this.props.inline){
            return <span className="userDisplay" style={this.props.style}
                        onClick={onClick}>
                <Popover
                    title={popoverTitle} content={popoverContent} mouseEnterDelay={0.5}>
                    {this.state.profile.get("displayName")}
                </Popover>
            </span>
        }
        return <div className="userDisplay" style={this.props.style}
                    onClick={onClick}>
                    <Popover
                        title={popoverTitle} content={popoverContent} mouseEnterDelay={0.5}>
                      &nbsp;&nbsp;&nbsp; {/* BCP: Better way to do this? */}
                      <Badge status={badgeStyle} color={badgeColor} />
                      <span style={{color:nameColor}}>{this.state.profile.get("displayName")}</span>
                      &nbsp;
                      <span className="highlightedTags">{tagsToHighlight}</span>

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
