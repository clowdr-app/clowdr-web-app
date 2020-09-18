import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import useUserProfile from "../../../hooks/useUserProfile";
import ProfileEditor from "../../Profile/ProfileView/ProfileView";
import ProfileView from "../../Profile/ProfileView/ProfileView";

interface Props {
    userProfileId: string;
}

export default function Profile(props: Props) {
    const loggedInUserProfile = useUserProfile();

    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Profile");
    }, [docTitle]);

    return props.userProfileId === loggedInUserProfile.id
        ? <ProfileEditor profile={loggedInUserProfile} />
        : <ProfileView profile={loggedInUserProfile} />; // TODO ACTUALLY GET THE PROFILE
}