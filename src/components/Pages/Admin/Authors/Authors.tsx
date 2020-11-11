import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import { ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import "./Authors.scss";
import { useForm } from "react-hook-form";
import { addError } from "../../../../classes/Notifications/Notifications";
import {
    DataUpdatedEventDetails,
    DataDeletedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useUserProfiles from "../../../../hooks/useUserProfiles";

interface FormData {
    programPerson: string;
    userProfile: string;
}

export default function Authors() {
    useHeading("Authors");
    const conference = useConference();
    const [authors, setAuthors] = useState<ProgramPerson[] | null>(null);
    const profiles = useUserProfiles();

    const { register, handleSubmit, errors, formState, reset } = useForm<FormData>();

    useSafeAsync(
        () => ProgramPerson.getAll(conference.id),
        setAuthors,
        [conference.id],
        "Authors:ProgramPerson.getAll"
    );

    // Subscribe to authors
    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        setAuthors(oldAuthors => {
            if (oldAuthors) {
                const newAuthors = Array.from(oldAuthors ?? []);
                for (const object of ev.objects) {
                    const author = object as ProgramPerson;
                    const idx = newAuthors.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newAuthors.push(author);
                    } else {
                        newAuthors.splice(idx, 1, author);
                    }
                }
                return newAuthors;
            }
            return null;
        });
    }, []);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        setAuthors(oldAuthors => oldAuthors?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);

    function renderProfile(author: ProgramPerson) {
        const profile = profiles?.find(profile => profile.id === author.profileId);
        return profile ? (
            <div className="attendee-item">
                <a href={`/profile/${profile.id}`}>
                    {profile.realName} {profile.affiliation ? `(${profile.affiliation})` : ""}
                </a>
            </div>
        ) : (
            "Linked attendee is missing"
        );
    }

    async function onSubmit(data: FormData) {
        const author = authors?.find(author => author.id === data.programPerson);

        if (!author) {
            throw new Error("Could not find selected author");
        }

        author.profileId = data.userProfile;
        try {
            await author.save();
            reset();
        } catch (e) {
            addError(`Failed to link author to attendee. Error ${e}`, 20000);
        }
    }

    const authorRows = authors
        ?.filter(author => author.profileId)
        ?.sort((a, b) => a.name.localeCompare(b.name))
        ?.map(author => {
            return (
                <tr key={author.id}>
                    <td style={{ width: "50%" }}>
                        <a href={`/author/${author.id}`}>
                            {author.name} {author.affiliation ? `(${author.affiliation})` : ""}
                        </a>
                    </td>
                    <td style={{ width: "50%" }}>{renderProfile(author)}</td>
                    <td style={{ width: "0" }}>
                        <AsyncButton
                            ariaLabel="Unlink attendee from author"
                            title="Unlink attendee from author"
                            action={async () => {
                                author.profileId = "";
                                await author.save();
                            }}
                        >
                            <i className="fas fa-unlink"></i>
                        </AsyncButton>
                    </td>
                </tr>
            );
        });

    const contents = (
        <>
            <h2>Linked program authors</h2>
            <table className="authors-to-attendees">
                <thead>
                    <tr>
                        <th>Program Author</th>
                        <th>Linked Attendee</th>
                    </tr>
                </thead>
                <tbody>
                    {authorRows && authorRows.length > 0 ? (
                        authorRows
                    ) : (
                        <tr>
                            <td colSpan={3}>No author has been linked to an attendee.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <h2>Link a program author to an attendee</h2>
            <div className="link-authors-form-wrapper">
                <form className="link-authors-form" onSubmit={handleSubmit(onSubmit)}>
                    <label htmlFor="programPerson" hidden>
                        Program author
                    </label>
                    <select name="programPerson" ref={register({ required: true })} disabled={formState.isSubmitting}>
                        {authors
                            ?.filter(author => !author.profileId)
                            ?.sort((a, b) => a.name.localeCompare(b.name))
                            ?.map(author => (
                                <option key={author.id} value={author.id}>
                                    {author.name} {author.affiliation ? `(${author.affiliation})` : ""}
                                </option>
                            ))}
                    </select>

                    <label htmlFor="userProfile" hidden>
                        Linked attendee
                    </label>
                    <select name="userProfile" ref={register({ required: true })} disabled={formState.isSubmitting}>
                        {profiles
                            ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
                            ?.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.realName} {profile.affiliation ? `(${profile.affiliation})` : ""}
                                </option>
                            ))}
                    </select>

                    <div className="form-buttons">
                        <AsyncButton
                            action={handleSubmit(onSubmit)}
                            disabled={!!(errors.programPerson || errors.userProfile)}
                        >
                            <i className="fas fa-plus"></i>
                        </AsyncButton>
                    </div>
                </form>
            </div>
        </>
    );

    return <section className="admin-authors">{contents}</section>;
}
