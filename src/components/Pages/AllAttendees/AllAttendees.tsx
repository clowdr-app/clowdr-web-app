import { Flair, UserProfile, _Role } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useState } from "react";
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
import FlairChip from "../../Profile/FlairChip/FlairChip";

interface AttendeeRenderData {
    profile: UserProfile;
    flairs: Flair[];
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
    useSafeAsync(
        async () => {
            if (userProfiles) {
                return Promise.all(
                    userProfiles.map(async _profile => {
                        const flairs = await _profile.flairObjects;
                        return {
                            key: _profile.id,
                            text: _profile.displayName,
                            searchText: [
                                _profile.displayName,
                                _profile.realName,
                                ...(_profile.affiliation ? [_profile.affiliation] : []),
                                ...(_profile.country ? [_profile.country] : []),
                            ],
                            link: `/profile/${_profile.id}`,
                            renderData: {
                                profile: _profile,
                                flairs,
                            },
                        };
                    })
                );
            }
            return undefined;
        },
        setUserProfileItems,
        [userProfiles],
        "AllAttendees:getProfiles with detail"
    );

    useSafeAsync(
        async () => await _Role.userProfileIdsOfRoles(conference.id, ["admin"]),
        setAdmins,
        [conference.id],
        "AllAttendees:getAdmins"
    );
    useSafeAsync(
        async () => await _Role.userProfileIdsOfRoles(conference.id, ["manager"]),
        setManagers,
        [conference.id],
        "AllAttendees:getManagers"
    );

    const promote = useCallback(
        async function _promote(profileId: string): Promise<void> {
            try {
                await Parse.Cloud.run("promote", {
                    conference: conference.id,
                    target: profileId,
                    newRole: "manager",
                });
                addNotification(
                    "Promoted user to manager, please switch page and back to see changes (no need to refresh)."
                );
            } catch (e) {
                addError(`Failed to promote user. Error: ${e}`, 20000);
            }
        },
        [conference.id]
    );

    const demote = useCallback(
        async function _demote(profileId: string): Promise<void> {
            try {
                await Parse.Cloud.run("demote", {
                    conference: conference.id,
                    target: profileId,
                    newRole: "attendee",
                });
                addNotification(
                    "Demoted user to attendee, please switch page and back to see changes (no need to refresh)."
                );
            } catch (e) {
                addError(`Failed to demote user. Error: ${e}`, 20000);
            }
        },
        [conference.id]
    );

    const ban = useCallback(
        async function _ban(profileId: string): Promise<void> {
            try {
                await Parse.Cloud.run("user-ban", {
                    conference: conference.id,
                    target: profileId,
                });
                addNotification("Banned user.");
            } catch (e) {
                addError(`Failed to ban user. Error: ${e}`, 20000);
            }
        },
        [conference.id]
    );

    const attendeeItemRenderer = useCallback(
        (item: ColumnItem<AttendeeRenderData>): JSX.Element => {
            const profileId = item.renderData.profile.id;
            const isSelf = profileId === profile.id;
            const isAttendee = admins && managers && !admins.includes(profileId) && !managers.includes(profileId);
            const isManager = managers && managers.includes(profileId);
            const isBanned = item.renderData.profile.isBanned;
            return (
                <Link to={item.link ? item.link : "#"} className="participant" title={item.text}>
                    <div className={`name${isBanned ? " banned" : ""}`} aria-label="user display name">
                        {item.text}
                    </div>
                    {item.renderData.profile.affiliation && (
                        <div className={"affiliation"} aria-label="affiliation">
                            {item.renderData.profile.affiliation}
                        </div>
                    )}
                    <div className="flair-box">
                        {item.renderData.flairs
                            .sort((a, b) => b.priority - a.priority)
                            .map((flair, i) => (
                                <div className="flair-container" key={i}>
                                    <FlairChip flair={flair} />
                                </div>
                            ))}
                    </div>
                    {isAdmin && !isSelf && (
                        <div className="admin-buttons">
                            {!isBanned && (isAttendee || isManager) && (
                                <ConfirmButton
                                    className="admin-buttons__button"
                                    text="Ban"
                                    action={() => ban(profileId)}
                                />
                            )}
                            {!isBanned && isAttendee && (
                                <ConfirmButton
                                    className="admin-buttons__button"
                                    text="Promote to manager"
                                    action={() => promote(profileId)}
                                />
                            )}
                            {!isBanned && isManager && (
                                <ConfirmButton
                                    className="admin-buttons__button"
                                    text="Demote to attendee"
                                    action={() => demote(profileId)}
                                />
                            )}
                        </div>
                    )}
                </Link>
            );
        },
        [profile.id, admins, managers, isAdmin, ban, promote, demote]
    );

    return (
        <Column
            className="all-participants"
            items={userProfileItems}
            itemRenderer={{ render: attendeeItemRenderer }}
            loadingMessage="Loading attendees"
        />
    );
}
