import { ConferenceConfiguration, UserProfile, _Role } from "@clowdr-app/clowdr-db-schema";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import MultiSelect from "react-multi-select-component";
import { Link, Redirect } from "react-router-dom";
import Toggle from "react-toggle";
import { ChatDescriptor } from "../../../classes/Chat";
import { addError } from "../../../classes/Notifications/Notifications";
import { ActionButton } from "../../../contexts/HeadingContext";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import AsyncButton from "../../AsyncButton/AsyncButton";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./Moderation.scss";

type UserOption = {
    label: string;
    value: string;
}

export default function Moderation() {
    const conference = useConference();
    const currentUserProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [newChannelSID, setNewChannelSID] = useState<string | null>(null);

    const [anyModerator, setIsAnyModerator] = useState<boolean>(true);
    const [allModerators, setAllModerators] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const [initialMessage, setInitialMessage] = useState<string>("");
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [allModChats, setAllModChats] = useState<Array<ChatDescriptor> | null>(null);
    const [customNotice, setCustomNotice] = useState<string | null>(null);

    const actionButtons: Array<ActionButton> = [];

    useHeading({
        title: "Contact moderators",
        buttons: actionButtons
    });

    // Fetch custom notice
    useSafeAsync(async () => {
        const config = await ConferenceConfiguration.getByKey("MODERATION_CUSTOM_NOTICE", conference.id);
        return config.length > 0 ? config[0].value !== "<null>" ? config[0].value : null : null;
    }, setCustomNotice, [conference.id]);

    // Fetch all moderator profiles
    useSafeAsync(async () => {
        const moderatorProfileIds = await _Role.userProfileIdsOfRoles(conference.id, ["admin", "manager"]);
        const moderatorProfiles = removeNull(await Promise.all(moderatorProfileIds.map(x => UserProfile.get(x, conference.id))));
        const userOptions = await Promise.all(moderatorProfiles.map(async userProfile => {
            const online = await mChat?.getIsUserOnline(userProfile.id);
            return {
                value: userProfile.id,
                label: `${userProfile.displayName} ${online ? "(online)" : "(offline)"}`,
            };
        }));
        return userOptions.filter(x => x.value !== currentUserProfile.id);
    }, setAllModerators, [mChat, conference.id, currentUserProfile.id]);

    useSafeAsync(async () => mChat ? (await mChat.listAllModerationChats()).filter(x => x.creator.id === currentUserProfile.id) : null, setAllModChats, [mChat]);

    /**
     * Check whether the state is currently valid for the form to be submitted.
     */
    function inputValid(): boolean {
        // Currently we don't bother checking that the title is long enough (this is handled at submission time)
        return (anyModerator || (invites !== null && invites.length > 0)) && !!initialMessage;
    }

    async function doCreateChannel() {
        if (!anyModerator && (invites === null || invites.length === 0)) {
            addError("You must invite a moderator to the channel.")
            return;
        }

        const newChannel = await mChat?.createModerationChat(
            invites?.map(x => x.value) ?? [],
            undefined,
            initialMessage
        );
        console.log(`New moderation channel: ${JSON.stringify(newChannel)}`);
        setNewChannelSID(newChannel?.id ?? null);
    }

    const allModeratorsEl = <>
        <label htmlFor="is-any-moderator">Contact any moderator?</label>
        <Toggle
            name="is-any-moderator"
            defaultChecked={true}
            onChange={(ev) => setIsAnyModerator(ev.target.checked)}
            disabled={isCreating}
        />
    </>;
    const invitesEl = !anyModerator ? <>
        <label>Moderators</label>
        <div className="invite-moderators-control">
            <MultiSelect
                className="invite-moderators-control__multiselect"
                labelledBy="Invite moderators"
                overrideStrings={{ "allItemsAreSelected": "All moderators", "selectAll": "All moderators" }}
                options={allModerators ?? []}
                value={invites ?? []}
                onChange={setInvites}
                disabled={isCreating}
            />
        </div>
        <p>You can choose a specific moderator to talk to. Other moderators will be able to join the conversation as needed.</p>
    </> : <></>;
    const initialMessageEl = <>
        <label htmlFor="initial-message-control">Initial message</label>
        <textarea
            name="initial-message-control"
            placeholder="What do you want to talk to the moderators about?"
            maxLength={25}
            onChange={(ev) => setInitialMessage(ev.target.value)}
            disabled={isCreating}
        />
    </>;
    const createButton =
        <AsyncButton
            action={() => doCreateChannel()}
            disabled={!inputValid()}
            setIsRunning={setIsCreating}
            content="Contact moderators" />;

    const newChannelForm = <div className="moderation-new-channel">
        {!allModerators
            ? <LoadingSpinner message="Loading" />
            : allModerators.length < 1
                ? <p>No moderators are available.</p>
                : <form onSubmit={() => doCreateChannel()}>
                    {allModeratorsEl}
                    {invitesEl}
                    {initialMessageEl}
                    <div className="submit-container">
                        {createButton}
                    </div>
                </form>
        }
    </div>;

    function renderChannelLink(channel: ChatDescriptor) {
        const moderationNamePrefix = "Moderation: ";
        return <li key={channel.id}>
            <Link to={`/moderation/${channel.id}`}>
                {channel.friendlyName.substr(moderationNamePrefix.length)}
            </Link>
        </li>;
    }

    const existingChannels = <div className="moderation-existing-channels">
        <h2>Existing moderation channels</h2>
        {allModChats
            ? allModChats.length === 0
                ? <p>You haven't created any moderation chats.</p>
                : <ul>
                    {allModChats
                        .sort((x, y) => x.friendlyName.localeCompare(y.friendlyName))
                        .map(renderChannelLink)}
                </ul>
            : <LoadingSpinner message="Loading moderation channels" />}
    </div>;

    return newChannelSID
        ? <Redirect to={`/moderation/${newChannelSID}`} />
        : <div className="moderation">
            {customNotice
                ? <div className="notice">
                    <ReactMarkdown>{customNotice}</ReactMarkdown>
                </div>
                : <></>}
            <div className="columns">
                {newChannelForm}
                {existingChannels}
            </div>
        </div>;
}
