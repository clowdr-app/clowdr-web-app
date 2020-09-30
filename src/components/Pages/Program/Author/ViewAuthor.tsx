import { ProgramItem, ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import ProfileView from "../../../Profile/ProfileView/ProfileView";
import Item from "../All/Item";
import "./ViewAuthor.scss";

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
        async () => (await author?.items ?? null)?.sort((x, y) => x.title.localeCompare(y.title)),
        setItems,
        [author]);

    // TODO: Subscribe to live updates of profile and items

    useHeading(author ? author.name : "Author");

    return author
        ? <div className="view-author">
            {profile ? <ProfileView profile={profile} /> : <></>}
            <div className="whole-program single-track single-session">
                <div className="track with-heading">
                    <h2 className="title">
                        Authored items
                    </h2>
                    <div className="content">
                        {items ? items.map(x => {
                            return <Item key={x.id} item={x} clickable={true} />
                        }) : <LoadingSpinner />}
                    </div>
                </div>
            </div>
        </div>
        : <LoadingSpinner />;
}
