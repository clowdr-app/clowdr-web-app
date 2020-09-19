import React, { useEffect, useState } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import useUserProfile from "../../../hooks/useUserProfile";
import ProfileEditor from "../../Profile/ProfileEditor/ProfileEditor";
import ProfileView from "../../Profile/ProfileView/ProfileView";
import useConference from "../../../hooks/useConference";
import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import { makeCancelable } from "clowdr-db-schema/src/classes/Util";

interface Props {
    userProfileId: string;
}

export default function Profile(props: Props) {
    const loggedInUserProfile = useUserProfile();
    const conference = useConference();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useDocTitle("Profile");

    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateProfile() {
            try {
                let profileCancelablePromise = makeCancelable(UserProfile.get(props.userProfileId, conference.id));
                cancel = profileCancelablePromise.cancel;
                setProfile(await profileCancelablePromise.promise);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
            finally {
                cancel = () => { };
            }
        }

        updateProfile();

        return cancel;
    }, [conference.id, props.userProfileId]);

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
