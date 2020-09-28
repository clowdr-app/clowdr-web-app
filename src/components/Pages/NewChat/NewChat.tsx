import { UserProfile } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
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

    useHeading("New chat");

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
     * Elements that need to be on this page (as a MVP):
     *
     *    * Who to invite to the chat (+ auto-fill for DM scenario)
     *    * Public vs private selector
     *    * Chat title (unless DM'ing)
     */

    async function doCreateChat(ev: React.FormEvent) {
        ev.preventDefault();
        ev.stopPropagation();

        if (invites && invites.length > 0) {
            const newChannel = await mChat?.createChat(
                invites.map(x => x.value),
                !isPublic,
                (!isPublic && invites.length === 1) ? `DM: ${currentUserProfile.displayName} <-> ${invites[0].label}` : title
            )
            console.log(`New channel SID ${JSON.stringify(newChannel)}`);
            setNewChannelSID(newChannel?.sid ?? null);
        }
    }

    function inviteAll(ev: React.FormEvent<HTMLButtonElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        setInvites(allUsers);

        return true;
    }

    const publicEl = <label>
        <span>Public?</span>
        <Toggle
            defaultChecked={!props.dmUserProfileId}
            onChange={(ev) => setIsPublic(ev.target.checked)}
        />
    </label>;
    const invitesEl = <div>
        <MultiSelect
            labelledBy="Invite users"
            options={allUsers ?? []}
            value={invites ?? []}
            onChange={setInvites}
        />
        <button 
            onClick={(ev) => { ev.preventDefault(); }}
            onSubmit={(ev) => inviteAll(ev)}>
            Select all
        </button>
    </div>;
    const titleEl = (isPublic || !invites || invites.length > 1)
        ? <label>
            <span>Name</span>
            <input
                type="text"
                placeholder="Title of the chat"
                maxLength={25}
                onChange={(ev) => setTitle(ev.target.value)}
            />
        </label>
        : <></>;
    const createButton =
        <button onClick={(ev) => doCreateChat(ev)}>Create chat</button>;

    /*
        dmUserProfile
                ? <>You, {currentUserProfile.displayName}, wish to DM {dmUserProfile.displayName}?<br />{testButton}</>
                : <>You, {currentUserProfile.displayName}, shall DM no-one!</>
     */
    return <>{
        newChannelSID
            ? <Redirect to={`/chat/${newChannelSID}`} />
            : <form onSubmit={(ev) => doCreateChat(ev)}>
                {publicEl}<br />
                {invitesEl}<br />
                {titleEl}<br />
                {createButton}
            </form>
    }</>;
}
