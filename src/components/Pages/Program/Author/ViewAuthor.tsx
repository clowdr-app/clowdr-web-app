import { ProgramItem, ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import ProfileView from "../../../Profile/ProfileView/ProfileView";

interface Props {
    authorId: string;
}

export default function ViewAuthor(props: Props) {
    const conference = useConference();
    const [author, setAuthor] = useState<ProgramPerson | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [items, setItems] = useState<Array<ProgramItem> | null>(null);

    useSafeAsync(
        async () => await ProgramPerson.get(props.authorId, conference.id),
        setAuthor,
        [props.authorId, conference.id]);

    useSafeAsync(
        async () => await author?.profile ?? null,
        setProfile,
        [author]);

    useSafeAsync(
        async () => await author?.items ?? null,
        setItems,
        [author]);

    // TODO: Subscribe to live updates of profile and items

    useHeading(author ? author.name : "Author");

    // TODO: Extract ViewItem from ViewEventItem and re-use for the list of items here

    return author
        ? <>
            {profile ? <ProfileView profile={profile} /> : <></>}
            <p>TODO: Render an author program items.</p>
        </>
        : <LoadingSpinner />;
}
