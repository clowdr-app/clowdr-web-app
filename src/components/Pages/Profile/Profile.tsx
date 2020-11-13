import React, { useEffect, useMemo, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import ProfileEditor from "../../Profile/ProfileEditor/ProfileEditor";
import ProfileView from "../../Profile/ProfileView/ProfileView";
import useConference from "../../../hooks/useConference";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import LocalStorage from "../../../classes/LocalStorage/ProfileEditing";

interface Props {
    userProfileId: string;
}

export default function Profile(props: Props) {
    const loggedInUserProfile = useUserProfile();
    const conference = useConference();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [editing, setEditing] = useState(!LocalStorage.justSavedProfile);

    useHeading({
        title: profile ? profile.displayName : "Profile",
        buttons:
            profile && profile.id !== loggedInUserProfile.id
                ? [
                    {
                        label: `Send DM`,
                        icon: <i className="fas fa-envelope" />,
                        action: `/chat/new/${profile.id}`,
                        ariaLabel: "Send this user a direct message"
                    },
                ]
                : [],
    });

    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateProfile() {
            try {
                const profileCancelablePromise = makeCancelable(UserProfile.get(props.userProfileId, conference.id));
                cancel = profileCancelablePromise.cancel;
                setProfile(await profileCancelablePromise.promise);
            } catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            } finally {
                cancel = () => { };
            }
        }

        updateProfile();

        return cancel;
    }, [conference.id, props.userProfileId]);

    let element = useMemo(() => {
        if (props.userProfileId === loggedInUserProfile.id) {
            return (
                <>
                    {editing ? (
                        <ProfileEditor profile={loggedInUserProfile} setViewing={() => setEditing(false)} />
                    ) : (
                            <ProfileView profile={loggedInUserProfile} setEditing={() => setEditing(true)} />
                        )}
                </>
            );
        } else if (profile) {
            return <ProfileView profile={profile} />;
        } else {
            return <>Loading profile</>;
        }
    }, [editing, loggedInUserProfile, profile, props.userProfileId]);

    return <>{element}</>;
}
