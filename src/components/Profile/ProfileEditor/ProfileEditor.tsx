import React from "react";
import { UserProfile } from "../../../classes/DataLayer";

interface Props {
    profile: UserProfile;
}

export default function ProfileEditor(props: Props) {
    return <>Profile Editor: {props.profile.displayName}</>;
}