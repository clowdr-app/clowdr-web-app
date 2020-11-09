import React from "react";
import useUserProfile from "../../../hooks/useUserProfile";
import MenuGroup, { MenuGroupItems } from "../Menu/MenuGroup";
import MenuItem from "../Menu/MenuItem";
import useUserRoles from "../../../hooks/useUserRoles";
// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import "./MainGroup.scss";

interface Props {
    onItemClicked?: () => void;
}

export default function MainMenuGroup(props: Props) {
    const mUser = useUserProfile();
    const { isAdmin, isManager } = useUserRoles();

    const profilePhotoUrl = handleParseFileURLWeirdness(mUser.profilePhoto);
    const profileIcon = profilePhotoUrl ? (
        <img src={profilePhotoUrl} alt={mUser.displayName + "'s avatar"} className="profile-icon" />
    ) : (
        <img src={defaultProfilePic} alt="default avatar" className="profile-icon" />
    );

    const mainMenuItems: MenuGroupItems = [
        {
            key: "profile",
            element: (
                <MenuItem
                    icon={profileIcon}
                    title={`${mUser.displayName} (${mUser.realName})`}
                    label={`Profile (${mUser.displayName})`}
                    action="/profile"
                    onClick={props.onItemClicked}
                    className="menu-item--profile"
                />
            ),
        },
        {
            key: "watched-items",
            element: (
                <MenuItem
                    title="Followed items"
                    label="Followed items"
                    action="/watched"
                    onClick={props.onItemClicked}
                />
            ),
        },
        {
            key: "exhibits",
            element: (
                <MenuItem title="Exhibition" label="Exhibition" action="/exhibits" onClick={props.onItemClicked} />
            ),
        },
        {
            key: "attendees",
            element: <MenuItem title="Attendees" label="Attendees" action="/attendees" onClick={props.onItemClicked} />,
        },
        {
            key: "contact-moderators",
            element: (
                <MenuItem
                    title="Contact moderators"
                    label="Contact moderators"
                    action="/moderation"
                    onClick={props.onItemClicked}
                />
            ),
        },
    ];
    if (isAdmin || isManager) {
        mainMenuItems.push({
            key: "moderation-hub",
            element: (
                <MenuItem
                    title="Moderation hub"
                    label="Moderation hub"
                    action="/moderation/hub"
                    onClick={props.onItemClicked}
                />
            ),
        });
    }
    if (isAdmin) {
        mainMenuItems.push({
            key: "admin",
            element: <MenuItem title="Admin tools" label="Admin tools" action="/admin" onClick={props.onItemClicked} />,
        });
    }

    return <MenuGroup items={mainMenuItems} />;
}
