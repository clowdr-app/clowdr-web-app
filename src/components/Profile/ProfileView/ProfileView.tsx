import React from "react";
import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";

interface Props {
    profile: UserProfile;
}

export default function ProfileView(props: Props) {
    return <>Profile View: {props.profile.displayName}</>;
}
