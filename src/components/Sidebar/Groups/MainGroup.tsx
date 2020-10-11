import React, {  } from 'react';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuGroup, { MenuGroupItems } from '../Menu/MenuGroup';
import MenuItem from '../Menu/MenuItem';
import useUserRoles from '../../../hooks/useUserRoles';

export default function MainMenuGroup() {
    const mUser = useMaybeUserProfile();
    const { isAdmin, isManager } = useUserRoles();

    let mainMenuGroup: JSX.Element = <></>;

    if (mUser) {
        const mainMenuItems: MenuGroupItems = [
            { key: "watched-items", element: <MenuItem title="Followed items" label="Followed items" action="/watched" /> },
            { key: "exhibits", element: <MenuItem title="Exhibition" label="Exhibition" action="/exhibits" /> },
            { key: "profile", element: <MenuItem title={`Profile (${mUser.displayName})`} label={`Profile (${mUser.displayName})`} action="/profile" /> },
            { key: "participants", element: <MenuItem title="Participants" label="Participants" action="/participants" /> },
            { key: "contact-moderators", element: <MenuItem title="Contact moderators" label="Contact moderators" action="/moderation" /> },
        ];
        if (isAdmin || isManager) {
            mainMenuItems.push({ key: "moderation-hub", element: <MenuItem title="Moderation hub" label="Moderation hub" action="/moderation/hub" /> });
        }
        if (isAdmin) {
            mainMenuItems.push({ key: "admin", element: <MenuItem title="Admin tools" label="Admin tools" action="/admin" /> });
        }
        mainMenuGroup = <MenuGroup items={mainMenuItems} />;
    }

    return mainMenuGroup;
}
