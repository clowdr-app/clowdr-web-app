import React, { useState } from "react";
import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import "./ProfileEditor.scss";
import TagInput from "../../Inputs/TagInput/TagInput";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";

interface Props {
    profile: UserProfile;
}

export default function ProfileEditor(props: Props) {
    const p = props.profile;

    const [displayName, setDisplayName] = useState(p.displayName);
    const [realName, setRealName] = useState(p.realName);
    const [pronouns, setPronouns] = useState(p.pronouns);
    const [affiliation, setAffiliation] = useState(p.affiliation);

    const submitForm = async (e: React.MouseEvent) => {
        e.preventDefault();

        p.realName = realName;
        p.displayName = displayName;
        p.pronouns = pronouns;
        p.affiliation = affiliation;
        await p.save();
    };

    const makeTextInput = (label: string, value: string, setter: (x: string) => void) => {
        const name = label.replace(/\s/g, "");

        return <>
            <label htmlFor={name}>{label}</label>
            <input
                name={name}
                type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
            />
        </>;
    };

    return <div className="profile-editor">
        <form>
            <div className="content">
                <div className="photo">
                    {p.profilePhoto
                        ? <img src={p.profilePhoto.url()} alt={p.displayName + "'s avatar"} />
                        : <img src={defaultProfilePic} alt="default avatar" />
                    }
                </div>
                <div className="main-info">
                    {makeTextInput("Real Name", realName, setRealName)}
                    {makeTextInput("Display Name", displayName, setDisplayName)}
                    <label htmlFor="pronouns">Pronouns</label>
                    <TagInput
                        name="pronouns"
                        tags={pronouns}
                        setTags={ps => setPronouns(ps)}
                    />
                    {makeTextInput(
                        "Affiliation",
                        affiliation ?? "",
                        (s) => setAffiliation(s === "" ? undefined : s)
                    )}
                    <div className="name">
                        <span className="display-name">{p.displayName}</span>
                        <span className="pronouns">({p.pronouns.reduce((x, y) => `${x}/${y}`)})</span>
                        {p.realName !== p.displayName
                            ? <div className="real-name">{p.realName}</div>
                            : <></>}
                    </div>
                    <div className="affiliation">
                        {p.position} <span>at</span> {p.affiliation}
                    </div>
                    <p className="bio">
                        {p.bio}
                    </p>
                    <a className="webpage" href={p.webpage}>{p.webpage}</a>
                </div>
            </div>
            <div className="submit-container">
                <input type="submit" value="Save" onClick={submitForm} />
            </div>
        </form>
    </div>;
}
