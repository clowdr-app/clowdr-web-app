import React, { useState } from "react";
import "./ProfileView.scss";
import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema/build/DataLayer";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import ReactMarkdown from "react-markdown";
import useSafeAsync from "../../../hooks/useSafeAsync";
import FlairChip from "../FlairChip/FlairChip";

interface Props {
    profile: UserProfile;
    setEditing?: () => void;
}

export default function ProfileView(props: Props) {
    const p = props.profile;

    const [flairs, setFlairs] = useState<Flair[]>([]);

    useSafeAsync(() => p.flairs, setFlairs, [])

    let affiliation = null;
    if (p.position && p.affiliation) {
        affiliation = <>{p.position} <span>at</span> {p.affiliation}</>;
    } else if (p.position) {
        affiliation = p.position;
    } else if (p.affiliation) {
        affiliation = <><span>At</span> {p.affiliation}</>;
    }

    const profilePhotoUrl
        = p.profilePhoto
            // TODO: I think this weirdness is caused by the indexeddb caching
            // This code has been copied around - search for all copies
            ? "url" in p.profilePhoto
                ? p.profilePhoto.url()
                // @ts-ignore
                : p.profilePhoto._url as string
            : null;

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
                    <span className="pronouns">({p.pronouns.reduce((x, y) => `${x}/${y}`)})</span>
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
                    <ReactMarkdown source={p.bio} escapeHtml={true} />
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
