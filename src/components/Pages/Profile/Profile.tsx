import React, { useEffect, useState } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import useUserProfile from "../../../hooks/useUserProfile";
import ProfileEditor from "../../Profile/ProfileEditor/ProfileEditor";
import ProfileView from "../../Profile/ProfileView/ProfileView";
import useConference from "../../../hooks/useConference";
import { UserProfile } from "../../../classes/DataLayer";

interface Props {
    userProfileId: string;
}

export default function Profile(props: Props) {
    const loggedInUserProfile = useUserProfile();
    const conference = useConference();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Profile");

        (async () => {
            const _profile = await UserProfile.get(props.userProfileId, conference.id);
            setProfile(_profile);
        })();

    }, [docTitle, conference, props, profile]);

    let element;
    if (props.userProfileId === loggedInUserProfile.id) {
        element = <ProfileEditor profile={loggedInUserProfile} />;
    } else if (profile) {
        element = <ProfileView profile={profile} />;
    } else {
        element = <>Loading profile</>;
    }
    return element;
}