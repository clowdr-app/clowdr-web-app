import React, { useState } from "react";
import Parse from "parse";
import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema";
import TagInput from "../../Inputs/TagInput/TagInput";
import FlairInput from "../../Inputs/FlairInput/FlairInput";
import useSafeAsync from "../../../hooks/useSafeAsync";
// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import { Controller, useForm } from "react-hook-form";
import LocalStorage from "../../../classes/LocalStorage/ProfileEditing";
import "./ProfileEditor.scss";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";

interface Props {
    profile: UserProfile;
}

interface FormData {
    RealName: string;
    DisplayName: string;
    pronouns: string[];
    Affiliation?: string;
    Position?: string;
    Country?: string;
    Webpage?: string;
    flairs?: string[];
    primaryFlairId?: string;
    bio?: string;
}

export default function ProfileEditor(props: Props) {
    const p = props.profile;

    const { register, handleSubmit, reset, errors, formState, control } = useForm<FormData>();

    const [flairs, setFlairs] = useState<Flair[]>([]);
    const [programPerson, setProgramPerson] = useState<string | null | undefined>(undefined);

    useSafeAsync(
        async () => await Flair.getAll(p.conferenceId),
        setFlairs,
        [p.conferenceId],
        "ProfileEditor:Flair.getAll"
    );

    useSafeAsync(
        async () => {
            const persons = await p.programPersons;
            if (persons.length > 0) {
                return persons[0].id;
            }
            return null;
        },
        setProgramPerson,
        [p.programPersons],
        "ProfileEditor:programPersons"
    );

    async function saveProfile(data: FormData) {
        const primaryFlair =
            data.flairs && data.flairs.length > 0
                ? flairs.filter(flair => data.flairs?.includes(flair.id)).sort((x, y) => y.priority - x.priority)[0]
                : undefined;

        p.realName = data.RealName;
        p.displayName = data.DisplayName;
        p.pronouns = data.pronouns;
        p.affiliation = data.Affiliation;
        p.position = data.Position;
        p.country = data.Country;
        p.webpage = data.Webpage;
        p.flairs = data.flairs ?? [];
        p.primaryFlairId = primaryFlair?.id;
        p.bio = data.bio;

        LocalStorage.justSavedProfile = true;

        await p.save();
    }

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

    const makeTextInput = (label: string, value?: string, required = false, inputType: string = "text") => {
        const name = label.replace(/\s/g, "");

        return (
            <>
                <label htmlFor={name}>{label}</label>
                <input
                    name={name}
                    type={inputType}
                    defaultValue={value}
                    disabled={formState.isSubmitting}
                    ref={register({ required })}
                />
                {errors[name]}
            </>
        );
    };

    const profilePhotoUrl = handleParseFileURLWeirdness(p.profilePhoto);

    async function onSubmit(data: FormData) {
        try {
            await saveProfile(data);
            addNotification("Profile saved.");
            reset();
        } catch (e) {
            addError("Sorry, an error occurred and we were unable to save your profile.");
            throw e;
        }
    }

    return (
        <div className="profile-editor">
            <div className="content">
                <div className="photo">
                    {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={p.displayName + "'s avatar"} />
                    ) : (
                        <img src={defaultProfilePic} alt="default avatar" />
                    )}
                    <div className="upload">
                        <input
                            disabled={formState.isDirty || formState.isSubmitting}
                            name="photo"
                            id="photo"
                            type="file"
                            className="photo-input"
                            onChange={uploadPhoto}
                        />
                        <label htmlFor="photo" title={formState.isDirty ? "Please save your profile info." : undefined}>
                            Upload New Photo
                        </label>
                    </div>
                </div>
                {programPerson === undefined ? (
                    <LoadingSpinner />
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {makeTextInput("Real Name", p.realName, true)}
                        {makeTextInput("Display Name", p.displayName, true)}
                        <label htmlFor="pronouns">Pronouns</label>
                        <Controller
                            name="pronouns"
                            defaultValue={p.tags}
                            control={control}
                            render={({ onChange, value }) => (
                                <TagInput name="" tags={value} setTags={onChange} disabled={formState.isSubmitting} />
                            )}
                        />

                        {makeTextInput("Affiliation", p.affiliation)}
                        {makeTextInput("Position", p.position)}
                        {makeTextInput("Country", p.country)}
                        {makeTextInput("Webpage", p.webpage, false, "url")}
                        <label htmlFor="flairs">Badges</label>
                        <p>Click a badge to toggle it on or off. Highlighted badges will be shown on your profile.</p>
                        <Controller
                            name="flairs"
                            defaultValue={p.flairs}
                            control={control}
                            render={({ onChange, value }) => (
                                <FlairInput
                                    name="flairs"
                                    flairs={flairs.filter(flair => value.includes(flair.id))}
                                    setFlairs={value => onChange(value.map(x => x.id))}
                                    disabled={formState.isSubmitting}
                                />
                            )}
                        />
                        <label htmlFor="bio">Bio</label>
                        <textarea
                            name="bio"
                            cols={30}
                            rows={4}
                            defaultValue={p.bio}
                            disabled={formState.isSubmitting}
                            ref={register}
                        />

                        <div className="submit-container">
                            <input type="submit" value="Save" disabled={formState.isSubmitting} />
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
