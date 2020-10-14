import React, { useState } from "react";
import "./ProfileView.scss";
import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import ReactMarkdown from "react-markdown";
import useSafeAsync from "../../../hooks/useSafeAsync";
import FlairChip from "../FlairChip/FlairChip";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import LocalStorage from "../../../classes/LocalStorage/ProfileEditing";

interface Props {
    profile: UserProfile;
    setEditing?: () => void;
}

export default function ProfileView(props: Props) {
    const p = props.profile;

    LocalStorage.justSavedProfile = false;

    const [flairs, setFlairs] = useState<Flair[]>([]);

    useSafeAsync(() => p.flairObjects, setFlairs, [])

    let affiliation = null;
    if (p.position && p.affiliation) {
        affiliation = <>{p.position} <span>at</span> {p.affiliation}</>;
    } else if (p.position) {
        affiliation = p.position;
    } else if (p.affiliation) {
        affiliation = <><span>At</span> {p.affiliation}</>;
    }

    const profilePhotoUrl = handleParseFileURLWeirdness(p.profilePhoto);

    return <div className="profile-view">
        <div className="content">
            <div className="photo">
                {profilePhotoUrl
                    ? <img src={profilePhotoUrl} alt={p.displayName + "'s avatar"} />
                    : <img src={defaultProfilePic} alt="default avatar" />
                }
            </div>
            <div className="main-info">
                <div className="name">
                    <span className="display-name">{p.displayName}</span>
                    {p.pronouns.length > 0 ? <span className="pronouns">({p.pronouns.reduce((x, y) => `${x}/${y}`, "")})</span> : <></>}
                    {p.realName !== p.displayName
                        ? <div className="real-name">{p.realName}</div>
                        : <></>}
                    <div className="flair-box">
                        {flairs.map((flair, i) =>
                            <div className="flair-container" key={i}>
                                <FlairChip flair={flair} small />
                            </div>
                        )}
                    </div>
                </div>
                {affiliation
                    ? <div className="affiliation">{affiliation}</div>
                    : <></>}
                {p.country
                    ? <div className="country">{p.country}</div>
                    : <></>}
                <div className="bio">
                    <ReactMarkdown 
                        linkTarget="_blank"
                        escapeHtml={true}
                        source={p.bio}
                    />
                </div>
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
