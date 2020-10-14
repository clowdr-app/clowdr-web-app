import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { useCallback, useState } from "react";
import useConference from "./useConference";
import useDataSubscription from "./useDataSubscription";
import useSafeAsync from "./useSafeAsync";

export default function useUserProfiles(): Array<UserProfile> | null {
    const [userProfiles, setUserProfiles] = useState<Array<UserProfile> | null>(null);
    const conference = useConference();

    useSafeAsync(async () => {
        const profiles = await UserProfile.getAll(conference.id);
        return profiles.filter(x => !x.isBanned);
    }, setUserProfiles, [conference.id]);

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

    return userProfiles;
}
