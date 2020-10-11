import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import Column, { DefaultItemRenderer, Item as ColumnItem } from "../../Columns/Column/Column";
import "./AllParticipants.scss";

export default function AllParticipants() {
    useHeading("All participants");

    const conference = useConference();
    const [userProfiles, setUserProfiles] = useState<Array<UserProfile> | null>(null);
    const [userProfileItems, setUserProfileItems] = useState<ColumnItem[] | undefined>();

    // Subscribe to all user profiles
    useSafeAsync(async () => UserProfile.getAll(conference.id), setUserProfiles, [conference.id]);

    const onUserProfileUpdated = useCallback(function _onUserProfileUpdated(ev: DataUpdatedEventDetails<"UserProfile">) {
        setUserProfiles(existing => {
            const updated = Array.from(existing ?? []);
            const idx = updated?.findIndex(x => x.id === ev.object.id);
            let item = ev.object as UserProfile;
            if (idx === -1) {
                updated.push(item);
            } else {
                updated.splice(idx, 1, item);
            }
            return updated;
        });
    }, []);

    const onUserProfileDeleted = useCallback(function _onUserProfileDeleted(ev: DataDeletedEventDetails<"UserProfile">) {
        setUserProfiles(existing => (existing ?? []).filter(item => item.id !== ev.objectId));
    }, []);

    useDataSubscription("UserProfile", onUserProfileUpdated, onUserProfileDeleted, !userProfiles, conference);

    // Compute list items from user profiles
    useEffect(() => {
        const profileItems = userProfiles?.map(profile => {
            return {
                text: profile.displayName,
                link: `/profile/${profile.id}`,
            } as ColumnItem;
        });
        setUserProfileItems(profileItems);
    }, [userProfiles])

    return <Column
        className="all-participants"
        items={userProfileItems}
        itemRenderer={new DefaultItemRenderer()}
        loadingMessage="Loading participants" />
}