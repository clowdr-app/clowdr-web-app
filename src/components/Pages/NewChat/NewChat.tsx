import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import useMaybeChat from "../../../hooks/useMaybeChat";

interface Props {
    dmUserProfileId?: string;
}

export default function NewChat(props: Props) {
    const conference = useConference();
    const currentUserProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [dmUserProfile, setDMUserProfile] = useState<UserProfile | null>(null);

    useDocTitle("New chat");

    // Fetch DM user profile if it exists
    useSafeAsync(async () => {
        if (props.dmUserProfileId) {
            let profile = await UserProfile.get(props.dmUserProfileId, conference.id);
            if (profile) {
                return profile;
            }
        }
        return undefined;
    }, setDMUserProfile, [props.dmUserProfileId]);

    /**
     * Elements that need to be on this page (as a MVP):
     * 
     *    * Who to invite to the chat (+ auto-fill for DM scenario)
     *    * Public vs private selector
     *    * Chat title (unless DM'ing)
     */

    async function doCreateChannel() {
        if (dmUserProfile) {
            let newChannel = await mChat?.createChat(
                [dmUserProfile],
                true,
                (currentUserProfile.displayName + " <-> " + dmUserProfile.displayName)
            )
            console.log(`New channel SID ${JSON.stringify(newChannel)}`);
        }
    }

    let testButton = <button onClick={() => doCreateChannel()}>(Test) Create channel</button>;

    return <>{dmUserProfile
        ? <>You, {currentUserProfile.displayName}, wish to DM {dmUserProfile.displayName}?<br/>{testButton}</>
        : <>You, {currentUserProfile.displayName}, shall DM no-one!</>
    }</>;
}
