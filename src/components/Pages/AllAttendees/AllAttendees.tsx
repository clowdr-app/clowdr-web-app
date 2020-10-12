import { _Role } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useEffect, useState } from "react";
import Parse from "parse";
import { Link } from "react-router-dom";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import useUserProfiles from "../../../hooks/useUserProfiles";
import useUserRoles from "../../../hooks/useUserRoles";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import ConfirmButton from "../../ConfirmButton/ConfirmButton";
import "./AllAttendees.scss";

interface AttendeeRenderData {
    icon?: string;
    profileId: string;
}

export default function AllAttendees() {
    useHeading("All attendees");

    const profile = useUserProfile();
    const userProfiles = useUserProfiles();
    const [userProfileItems, setUserProfileItems] = useState<ColumnItem<AttendeeRenderData>[] | undefined>();
    const { isAdmin } = useUserRoles();
    const conference = useConference();

    const [admins, setAdmins] = useState<string[] | undefined>();
    const [managers, setManagers] = useState<string[] | undefined>();

    // Compute list items from user profiles
    useEffect(() => {
        const profileItems = userProfiles?.map(profile => {
            return {
                key: profile.id,
                text: profile.displayName,
                link: `/profile/${profile.id}`,
                renderData: { icon: "fas fa-user", profileId: profile.id },
            };
        });
        setUserProfileItems(profileItems);
    }, [userProfiles]);

    useSafeAsync(async () => await _Role.userProfileIdsOfRoles(conference.id, ["admin"]), setAdmins, [conference.id]);
    useSafeAsync(async () => await _Role.userProfileIdsOfRoles(conference.id, ["manager"]), setManagers, [conference.id]);

    const promote = useCallback(async function _promote(profileId: string): Promise<void> {
        try {
            await Parse.Cloud.run("promote", {
                conference: conference.id,
                target: profileId,
                newRole: "manager",
            });
            addNotification("Promoted user to manager.");
        } catch (e) {
            addError(`Failed to promote user. Error: ${e}`, 20000);
        }
    }, [conference.id]);

    const demote = useCallback(async function _demote(profileId: string): Promise<void> {
        try {
            await Parse.Cloud.run("demote", {
                conference: conference.id,
                target: profileId,
                newRole: "attendee",
            });
            addNotification("Demoted user to attendee.");
        } catch (e) {
            addError(`Failed to demote user. Error: ${e}`, 20000);
        }
    }, [conference.id]);

    const ban = useCallback(async function _ban(profileId: string): Promise<void> {
        try {
            await Parse.Cloud.run("user-ban", {
                conference: conference.id,
                target: profileId,
            });
            addNotification("Banned user.");
        } catch (e) {
            addError(`Failed to ban user. Error: ${e}`, 20000);
        }
    }, [conference.id]);

    const attendeeItemRenderer = useCallback((item: ColumnItem<AttendeeRenderData>): JSX.Element => {
        const profileId = item.renderData.profileId;
        const isSelf = profileId === profile.id;
        const isAttendee = admins && managers && !admins.includes(profileId) && !managers.includes(profileId);
        const isManager = managers && managers.includes(profileId);
        return <>
            <i className={`${item.renderData.icon} column-item__icon`}></i>
            {item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>}
            { isAdmin && !isSelf && <div className="admin-buttons">
                <ConfirmButton className="admin-buttons__button" text="Ban" action={() => ban(profileId)} />
                {isAttendee && <ConfirmButton className="admin-buttons__button" text="Promote to manager" action={() => promote(profileId)} />}
                {isManager && <ConfirmButton className="admin-buttons__button" text="Demote to attendee" action={() => demote(profileId)} />}
            </div>}
        </>
    }, [profile.id, admins, managers, isAdmin, ban, promote, demote]);

    return <Column
        className="all-participants"
        items={userProfileItems}
        itemRenderer={{ render: attendeeItemRenderer }}
        loadingMessage="Loading attendees" />
}
