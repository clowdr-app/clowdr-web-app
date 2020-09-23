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

    /**
     * Elements that need to be on this page (as a MVP):
     * 
     *    * Who to invite to the chat (+ auto-fill for DM scenario)
     *    * Public vs private selector
     *    * Chat title (unless DM'ing)
     * 
     *    * Perhaps we need to put channel creation through parse to enforce the
     *      rules of DMs? This requires turning off the createChannel permission
     *      for service users/admins.
     * 
     *    * DM only if private selected, otherwise treat as a public group with
     *      2 participants
     *    * Generate a unique name: Perhaps `creatorUserId-${randomGUID}`
     *      unless it's a DM, in which case `userId1-userId2`
     *        (where userId1/2 are creator/target sorted alpha-numerically)
     *    * For DMs, verify whether a channel already exists
     */

    return <>{dmUserProfile
        ? <>You, {currentUserProfile.displayName}, wish to DM {dmUserProfile.displayName}?</>
        : <>You, {currentUserProfile.displayName}, shall DM no-one!</>
    }</>;
}
