import React, { useState } from "react";
import Parse from "parse";
import { Flair, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import "./ProfileEditor.scss";
import TagInput from "../../Inputs/TagInput/TagInput";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import FlairInput from "../../Inputs/FlairInput/FlairInput";
import useSafeAsync from "../../../hooks/useSafeAsync";

interface Props {
    profile: UserProfile;
    setViewing: () => void;
}

export default function ProfileEditor(props: Props) {
    const p = props.profile;

    const [displayName, setDisplayName] = useState(p.displayName);
    const [realName, setRealName] = useState(p.realName);
    const [pronouns, setPronouns] = useState(p.pronouns);
    const [affiliation, setAffiliation] = useState(p.affiliation);
    const [position, setPosition] = useState(p.position);
    const [webpage, setWebpage] = useState(p.webpage);
    const [bio, setBio] = useState(p.bio);
    const [flairs, setFlairs] = useState<Flair[]>([]);
    const [_flairs, _setFlairs] = useState<Flair[]>([]);

    useSafeAsync(async () => {
        return await p.flairs;
    }, setFlairs, []);

    useSafeAsync(async () => {
        return await p.flairs;
    }, _setFlairs, []);

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        p.realName = realName;
        p.displayName = displayName;
        p.pronouns = pronouns;
        p.affiliation = affiliation;
        p.position = position;
        p.webpage = webpage;
        p.flairs = Promise.resolve(flairs);
        p.bio = bio;

        await p.save();
    };

    function sameObjects(xs: { id: string }[], ys: { id: string }[]) {
        return JSON.stringify(xs.map(x => x.id).sort()) ===
            JSON.stringify(ys.map(y => y.id).sort());
    }

    const isFormDirty =
        p.realName !== realName ||
        p.displayName !== displayName ||
        p.pronouns !== pronouns ||
        p.affiliation !== affiliation ||
        p.position !== position ||
        p.webpage !== webpage ||
        p.bio !== bio ||
        !sameObjects(_flairs, flairs);

    const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.item(0);
        if (file) {
            const data = new Uint8Array(await file.arrayBuffer());
            const parseFile = new Parse.File("photos-" + p.id + "-" + file.name, [...data]);
            await parseFile.save();

            p.profilePhoto = parseFile;
            await p.save();
        }
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
        <div className="content">
            <div className="photo">
                {p.profilePhoto
                    ? <img src={p.profilePhoto.url()} alt={p.displayName + "'s avatar"} />
                    : <img src={defaultProfilePic} alt="default avatar" />
                }
                <div className="upload">
                    <input
                        disabled={isFormDirty}
                        name="photo"
                        id="photo"
                        type="file"
                        className="photo-input"
                        onChange={uploadPhoto}
                    />
                    <label
                        htmlFor="photo"
                        title={isFormDirty ? "Please save your profile info." : undefined}
                    >
                        Upload New Photo
                    </label>
                </div>
            </div>
            <form onSubmit={submitForm}>
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
                {makeTextInput(
                    "Position",
                    position ?? "",
                    (s) => setPosition(s === "" ? undefined : s)
                )}
                {makeTextInput(
                    "Webpage",
                    webpage ?? "",
                    (s) => setWebpage(s === "" ? undefined : s)
                )}
                <label htmlFor="flairs">Flairs</label>
                <FlairInput name="flairs" flairs={flairs} setFlairs={setFlairs} />
                <label htmlFor="bio">Bio</label>
                <textarea
                    name="bio"
                    onChange={e => setBio(e.target.value)}
                    cols={30} rows={4}
                    value={bio}
                />
                <div className="submit-container">
                    <button
                        type="button"
                        disabled={isFormDirty}
                        title={isFormDirty ? "Please save your profile info." : undefined}
                        onClick={props.setViewing}
                    >View</button>
                    <input type="submit" value="Save" />
                </div>
            </form>
        </div>
    </div>;
}
