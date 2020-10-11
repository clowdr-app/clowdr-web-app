import React, { useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfiles from "../../../hooks/useUserProfiles";
import Column, { FontAwesomeIconItemRenderer, Item as ColumnItem } from "../../Columns/Column/Column";
import "./AllAttendees.scss";

export default function AllAttendees() {
    useHeading("All attendees");

    const userProfiles = useUserProfiles();
    const [userProfileItems, setUserProfileItems] = useState<ColumnItem<{icon?: string}>[] | undefined>();

    // Compute list items from user profiles
    useEffect(() => {
        const profileItems = userProfiles?.map(profile => {
            return {
                text: profile.displayName,
                link: `/profile/${profile.id}`,
                renderData: {icon: "fas fa-user"},
            } as ColumnItem<{icon?: string}>;
        });
        setUserProfileItems(profileItems);
    }, [userProfiles]);

    return <Column
        className="all-participants"
        items={userProfileItems}
        itemRenderer={new FontAwesomeIconItemRenderer()}
        loadingMessage="Loading attendees" />
}