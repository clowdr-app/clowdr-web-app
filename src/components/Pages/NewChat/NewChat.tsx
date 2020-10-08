import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import useMaybeChat from "../../../hooks/useMaybeChat";
import { Redirect } from "react-router-dom";
import Toggle from "react-toggle";
import "react-toggle/style.css";
import MultiSelect from "react-multi-select-component";
import "./NewChat.scss";
import { addError } from "../../../classes/Notifications/Notifications";
import AsyncButton from "../../AsyncButton/AsyncButton";
import { ActionButton } from "../../../contexts/HeadingContext";

interface Props {
    dmUserProfileId?: string;
}

type UserOption = {
    label: string;
    value: string;
}

export default function NewChat(props: Props) {
    const conference = useConference();
    const currentUserProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [newChannelSID, setNewChannelSID] = useState<string | null>(null);

    const [allUsers, setAllUsers] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const [title, setTitle] = useState<string>("");
    const [isPublic, setIsPublic] = useState<boolean>(!props.dmUserProfileId);
    const [isCreating, setIsCreating] = useState<boolean>(false);

    const actionButtons: Array<ActionButton> = [];
    if (props.dmUserProfileId) {
        if (invites && invites.length === 1) {
            actionButtons.push({
                label: `Go to ${invites[0].label}'s profile`,
                action: `/profile/${invites[0].value}`,
                icon: <i className="fas fa-eye"></i>
            });
        }
    }
    useHeading({
        title: "New chat",
        buttons: actionButtons
    });

    // Fetch DM user profile if it exists
    useSafeAsync(async () => {
        const result: Array<UserOption> = [];
        if (props.dmUserProfileId) {
            const profile = await UserProfile.get(props.dmUserProfileId, conference.id);
            if (profile && profile.id !== currentUserProfile.id) {
                result.push({
                    value: profile.id,
                    label: profile.displayName
                });
            }
        }
        return result;
    }, setInvites, [props.dmUserProfileId]);

    // Fetch all user profiles
    useSafeAsync(async () => {
        const profiles = await UserProfile.getAll(conference.id);
        return profiles.map(x => ({
            value: x.id,
            label: x.displayName
        })).filter(x => x.value !== currentUserProfile.id);
    }, setAllUsers, []);

    /**
     * Check whether the state is currently valid for the form to be submitted.
     */
    function inputValid(): boolean {
        // Currently we don't bother checking that the title is long enough (this is handled at submission time)
        return invites !== null && invites.length > 0
    }

    /**
     * Elements that need to be on this page (as a MVP):
     *
     *    * Who to invite to the chat (+ auto-fill for DM scenario)
     *    * Public vs private selector
     *    * Chat title (unless DM'ing)
     */

    async function doCreateChat() {
        if (invites === null || invites.length === 0) {
            addError("You must invite somebody to chat.")
            return;
        }

        const chatTitle = (!isPublic && invites.length === 1) ? `DM: ${currentUserProfile.displayName} <-> ${invites[0].label}` : title;

        if (chatTitle === null || chatTitle.trim().length < 5) {
            addError("You must choose a chat title with at least five characters.");
            return;
        }

        const newChannel = await mChat?.createChat(
            invites.map(x => x.value),
            !isPublic,
            chatTitle
        );
        console.log(`New channel: ${JSON.stringify(newChannel)}`);
        setNewChannelSID(newChannel?.id ?? null);
    }

    const publicEl = <>
        <label htmlFor="is-public">Public?</label>
        <Toggle
            name="is-public"
            defaultChecked={!props.dmUserProfileId}
            onChange={(ev) => setIsPublic(ev.target.checked)}
            disabled={isCreating}
        />
    </>;
    const invitesEl = <>
        <label>With:</label>
        <div className="invite-users-control">
            <MultiSelect
                className="invite-users-control__multiselect"
                labelledBy="Invite users"
                overrideStrings={{ "allItemsAreSelected": "Everyone", "selectAll": "Everyone" }}
                options={allUsers ?? []}
                value={invites ?? []}
                onChange={setInvites}
                disabled={isCreating}
            />
        </div>
    </>;
    const titleEl = (isPublic || !invites || invites.length > 1)
        ? <>
            <label htmlFor="title-control">Name</label>
            <input
                name="title-control"
                type="text"
                placeholder="Title of the chat"
                maxLength={25}
                onChange={(ev) => setTitle(ev.target.value)}
                disabled={isCreating}
            />
        </>
        : <></>;
    const createButton =
        <AsyncButton
            action={() => doCreateChat()}
            disabled={!inputValid()}
            setIsRunning={setIsCreating}
            content="Create chat" />;

    return newChannelSID
        ? <Redirect to={`/chat/${newChannelSID}`} />
        : <div className="new-chat">
            <form onSubmit={() => doCreateChat()}>
                {publicEl}
                {invitesEl}
                {titleEl}
                <div className="submit-container">
                    {createButton}
                </div>
            </form>
        </div>;
}
