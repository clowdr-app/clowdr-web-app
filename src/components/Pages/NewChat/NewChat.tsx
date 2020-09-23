import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";

interface Props {
    dmUserId?: string;
}

export default function NewChat(props: Props) {
    const conference = useConference();
    const currentUserProfile = useUserProfile();
    const [dmUserProfile, setDMUserProfile] = useState<UserProfile | null>(null);

    useDocTitle("New chat");

    // Fetch DM user profile if it exists
    useSafeAsync(async () => {
        if (props.dmUserId) {
            let profile = await UserProfile.getByUserId(props.dmUserId, conference.id);
            if (profile) {
                return profile;
            }
        }
        return undefined;
    }, setDMUserProfile, [props.dmUserId]);

    return <>{dmUserProfile
        ? <>You, {currentUserProfile.displayName}, wish to DM {dmUserProfile.displayName}?</>
        : <>You, {currentUserProfile.displayName}, shall DM no-one!</>
    }</>;
}
