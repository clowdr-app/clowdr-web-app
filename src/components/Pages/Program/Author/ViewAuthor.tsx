import { ProgramItem, ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import ProfileView from "../../../Profile/ProfileView/ProfileView";
import Item from "../All/Item";
import { SortedItemData } from "../WholeProgramData";
import "./ViewAuthor.scss";

interface Props {
    authorId: string;
}

export default function ViewAuthor(props: Props) {
    const conference = useConference();
    const [author, setAuthor] = useState<ProgramPerson | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [itemsData, setItemsData] = useState<Array<SortedItemData> | null>(null);

    useSafeAsync(
        async () => await ProgramPerson.get(props.authorId, conference.id),
        setAuthor,
        [props.authorId, conference.id], "ViewAuthor:setAuthor");

    useSafeAsync(
        async () => await author?.profile ?? null,
        setProfile,
        [author], "ViewAuthor:setProfile");

    useSafeAsync(
        async () => {
            const items = (await author?.items ?? null)?.sort((x, y) => x.title.localeCompare(y.title)) ?? [];
            return Promise.all(items.map(async item => ({
                item,
                authors: await item.authorPerons,
                eventsForItem: await item.events
            })));
        },
        setItemsData,
        [author], "ViewAuthor:setItemsData");

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
                        {itemsData
                            ? itemsData.map(item => <Item key={item.item.id} item={item} clickable={true} />)
                            : <LoadingSpinner />}
                    </div>
                </div>
            </div>
        </div>
        : <LoadingSpinner />;
}
