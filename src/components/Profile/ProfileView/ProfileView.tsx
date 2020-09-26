import React from "react";
import "./ProfileView.scss";
import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import ReactMarkdown from "react-markdown";

interface Props {
    profile: UserProfile;
    setEditing?: () => void;
}

export default function ProfileView(props: Props) {
    const p = props.profile;

    let affiliation = null;
    if (p.position && p.affiliation) {
        affiliation = <>{p.position} <span>at</span> {p.affiliation}</>;
    } else if (p.position) {
        affiliation = p.position;
    } else if (p.affiliation) {
        affiliation = <><span>At</span> {p.affiliation}</>;
    }

    return <div className="profile-view">
        <div className="content">
            <div className="photo">
                {p.profilePhoto
                    ? <img src={p.profilePhoto.url()} alt={p.displayName + "'s avatar"} />
                    : <img src={defaultProfilePic} alt="default avatar" />
                }
            </div>
            <div className="main-info">
                <div className="name">
                    <span className="display-name">{p.displayName}</span>
                    <span className="pronouns">({p.pronouns.reduce((x, y) => `${x}/${y}`)})</span>
                    {p.realName !== p.displayName
                        ? <div className="real-name">{p.realName}</div>
                        : <></>}
                </div>
                {affiliation
                    ? <div className="affiliation">{affiliation}</div>
                    : <></>}
                <p className="bio">
                    <ReactMarkdown source={p.bio} escapeHtml={true} />
                </p>
                {p.webpage ? <a className="webpage" href={p.webpage}>{p.webpage}</a> : <></>}
                {props.setEditing
                    ? <div className="edit-button-container">
                        <button className="edit-button" onClick={props.setEditing}>Edit</button>
                    </div>
                    : <></>}
            </div>
        </div>
    </div>;
}
