import React from "react";
import { Avatar, Badge, Button, Popover, Skeleton, Tag, Tooltip } from "antd";
import { AuthUserContext } from "../Session";
import { withRouter, RouteComponentProps } from "react-router-dom";

import ReactMarkdown from "react-markdown";
import ProgramPersonAuthorship from "../Program/ProgramPersonAuthorship";
import { PresetStatusColorType } from "antd/lib/_util/colors";

interface UserStatusDisplayProps extends RouteComponentProps {
    profileID: string;
    hideLink?: boolean;
    popover?: boolean;
}

class UserStatusDisplay extends React.Component<any, any> {
    mounted: boolean = false;
    loadingDMCall: boolean = false;

    constructor(props: any) {
        super(props)
        this.state = {
            id: this.props.profileID
        }
    }

    componentDidMount() {
        this.mounted = true;

        this.props.auth.programCache.getUserProfileByProfileID(this.state.id, this).then((profile: any) => {
            if (!this.mounted)
                return;
            let userStatus = this.props.auth.presences[this.state.id];
            this.setState({ profile: profile, presence: userStatus })
            //Fetch any related program item info
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        this.props.auth.helpers.unmountProfileDisplay(this.state.id, this);
    }

    componentDidUpdate(prevProps: any, prevState: any, snapshot: any) {
        if (!this.mounted)
            return;
        if (this.props.auth.presences[this.state.id] !== this.state.presence) {
            this.setState({ presence: this.props.auth.presences[this.state.id] });
        }
    }

    async openDM() {
        if (!this.loadingDMCall) {
            this.loadingDMCall = true;
            this.setState({ loading: true })
            await this.props.auth.helpers.createOrOpenDM(this.state.profile);
            this.setState({ loading: false })
            this.loadingDMCall = false;
        }
    }
    linkRenderer = (props: any) => {
        let currentDomain = window.location.origin;
        if (props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={() => { this.props.history.push(props.href.replace(currentDomain, "")) }}>{props.children}</a>;
        return <a href={props.href} rel="noopener noreferrer" target="_blank">{props.children}</a>;
    };

    render() {
        if (!this.state.profile)
            return <Skeleton.Input active style={{ width: '100px', height: '1em' }} />
        let presenceDesc = "";
        let badgeColor = "";
        let badgeStyle: PresetStatusColorType = "default";
        let dntWaiver = "";
        if (this.state.presence && this.state.presence.isOnline) {
            presenceDesc = "(Online)";
            badgeColor = "green";
        }
        else {
            presenceDesc = "(Offline)";
            badgeColor = "grey";
        }
        let onClick = () => { };
        if (this.props.auth.userProfile.id !== this.state.profile.id && !this.props.hideLink) {
            onClick = this.openDM.bind(this);
        }
        let avatar;
        if (this.state.profile && this.state.profile.profilePhoto != null)
            avatar = <Avatar src={this.state.profile.profilePhoto.url()} />

        let affiliation = "";
        let parensData = [];
        if (this.state.profile.pronouns)
            parensData.push(this.state.profile.pronouns);
        if (this.state.profile.position && this.state.profile.affiliation)
            parensData.push(this.state.profile.position + " @ " +
                this.state.profile.affiliation);
        else if (this.state.profile.position)
            parensData.push(this.state.profile.position);
        else if (this.state.profile.affiliation)
            parensData.push(this.state.profile.affiliation);
        if (parensData.length > 0) {
            affiliation = "(" + parensData.join(", ") + ")";
        }
        let bio = <></>;
        if (this.state.profile.bio) {
            bio = <div className="userBio"><b>Bio:</b><ReactMarkdown source={this.state.profile.bio}
                renderers={{ link: this.linkRenderer }}
            /> </div>
        }
        let authorship = <></>;
        if (this.state.profile.programPersons) {
            let persons = [];
            for (let programPerson of this.state.profile.programPersons) {
                persons.push(<ProgramPersonAuthorship id={programPerson.id} key={programPerson.id}
                    auth={this.props.auth}
                />);
            }
            authorship = <div className="profileAuthorOf">
                {persons}
            </div>
        }
        let tags: JSX.Element[] = [];
        let tagToHighlight: any;
        let tagsToHighlight = [];
        if (this.state.profile.tags) {
            tags = this.state.profile.tags.map((t: any) => {
                let tag = <Tag key={t.id} color={t.color} closable={false}
                    style={{ marginRight: 3 }}>{t.label}</Tag>
                if (t.alwaysShow)
                    tagsToHighlight.push(tag);
                else if (!tagToHighlight || t.priority < tagToHighlight.priority)
                    tagToHighlight = t;
                if (t.tooltip)
                    return <Tooltip mouseEnterDelay={0.5} key={t.id} title={t.tooltip}>{tag}</Tooltip>
                else return tag;
            }
            )
        }
        if (tagToHighlight) {
            tagsToHighlight.push(<Tag key={tagToHighlight.id} color={tagToHighlight.color} closable={false}
                style={{ marginRight: 3 }}>{tagToHighlight.label}</Tag>);
        }

        let popoverTitle =
            <div className="nameAndAvatar">
                {avatar} {this.state.profile.displayName} {affiliation}
                <div> {tags} {presenceDesc}</div>
            </div>;
        let webpage = <></>;
        if ("" + this.state.profile.webpage !== "undefined") {
            webpage = <div>
                <a href={this.state.profile.webpage} rel="noopener noreferrer" target="_blank">
                    {this.state.profile.webpage}</a>
            </div>;
        }
        let dmButton = <Button className="dmButton" type="primary" loading={this.state.loading} onClick={onClick}>Send a message to {this.state.profile.displayName}</Button>
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
        let timestamp = <></>;
        if (this.props.timestamp) {
            timestamp = <span className="timestamp">{this.props.timestamp}</span>
        }

        if (this.props.inline) {
            return <span className="userDisplay" style={this.props.style}
                onClick={onClick}>
                <Popover
                    title={popoverTitle} content={popoverContent} mouseEnterDelay={0.5}>
                    {this.state.profile.displayName}
                </Popover>
            </span>
        }

        return <div className="userDisplay" style={this.props.style}
            onClick={onClick}>
            <Popover
                title={popoverTitle} content={popoverContent} mouseEnterDelay={0.5}>
                <div>
                    &nbsp;&nbsp;&nbsp; {/* BCP: Better way to do this? */}
                    <Badge status={badgeStyle} color={badgeColor} />
                    <span className="userName">{this.state.profile.displayName}</span>
                        &nbsp;
                        <span className="highlightedTags">{tagsToHighlight}</span>
                </div>
            </Popover>
            {timestamp}
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
                   {this.state.profile.displayName} {statusDesc}</Popover>
            </div>
        */
    }
}

const AuthConsumer = withRouter((props: UserStatusDisplayProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserStatusDisplay {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
