import { ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import ProfileView from "../../Profile/ProfileView/ProfileView";
import Item from "../Program/All/Item";
import { SortedItemData } from "../Program/WholeProgramData";
import "./ProfileItems.scss";

interface Props {
    userProfileId: string;
}

export default function ProfileItems(props: Props) {
    const conference = useConference();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [authors, setAuthors] = useState<ProgramPerson[] | null>(null);
    const [itemsData, setItemsData] = useState<SortedItemData[] | null>(null);

    useSafeAsync(
        async () => (await UserProfile.get(props.userProfileId, conference.id)) ?? null,
        setProfile,
        [props.userProfileId, conference.id],
        "ProfileItems:setProfile"
    );

    useSafeAsync(async () => await profile?.programPersons, setAuthors, [profile], "ProfileItems:setAuthors");

    useSafeAsync(
        async () => {
            const groupedItems = await Promise.all(authors?.map(async author => (await author?.items) ?? null) ?? []);

            const items = groupedItems.flat(1).sort((x, y) => x.title.localeCompare(y.title));

            return Promise.all(
                items.map(async item => ({
                    item,
                    authors: await item.authorPerons,
                    eventsForItem: await item.events,
                }))
            );
        },
        setItemsData,
        [authors],
        "ProfileItems:setItemsData"
    );

    // TODO: Subscribe to live updates of profile and items

    useHeading(profile ? `${profile.displayName}'s items` : "Profile items");

    return profile ? (
        <div className="view-profile">
            {profile ? <ProfileView profile={profile} /> : <></>}
            <div className="whole-program single-track single-session">
                <div className="track with-heading">
                    <h2 className="title">Authored items</h2>
                    <div className="content">
                        {itemsData ? (
                            itemsData.length ? (
                                itemsData.map(item => <Item key={item.item.id} item={item} clickable={true} />)
                            ) : (
                                <p>You are not listed as an author for any items.</p>
                            )
                        ) : (
                            <LoadingSpinner />
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <LoadingSpinner />
    );
}
