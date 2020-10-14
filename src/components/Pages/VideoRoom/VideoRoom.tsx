import React, { useCallback, useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../../Video/VideoGrid/VideoGrid";
import "./VideoRoom.scss";
import SplitterLayout from "react-splitter-layout";
import "react-splitter-layout/lib/index.css";
import { TextChat, UserProfile, VideoRoom, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import useConference from "../../../hooks/useConference";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { ActionButton } from "../../../contexts/HeadingContext";
import MultiSelect from "react-multi-select-component";
import useUserProfile from "../../../hooks/useUserProfile";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import assert from "assert";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import useMaybeVideo from "../../../hooks/useMaybeVideo";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";

interface Props {
    roomId: string;
}

type UserOption = {
    label: string;
    value: string;
}

export default function ViewVideoRoom(props: Props) {
    const conference = useConference();
    const currentUserProfile = useUserProfile();
    const mVideo = useMaybeVideo();
    const [size, setSize] = useState(30);
    const [room, setRoom] = useState<VideoRoom | null>(null);
    const [chat, setChat] = useState<TextChat | "not present" | null>(null);
    const [showInvite, setShowInvite] = useState<boolean>(false);
    const [allUsers, setAllUsers] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const [inviting, setInviting] = useState<CancelablePromise<unknown> | null>(null);

    useSafeAsync(
        async () => await VideoRoom.get(props.roomId, conference.id),
        setRoom,
        [props.roomId, conference.id]);
    useSafeAsync(
        async () => room ? ((await room.textChat) ?? "not present") : null,
        setChat,
        [room]);
    useSafeAsync(async () => {
        const profiles = await UserProfile.getAll(conference.id);
        return profiles
            .filter(x => !x.isBanned)
            .map(x => ({
                value: x.id,
                label: x.displayName
            })).filter(x => x.value !== currentUserProfile.id);
    }, setAllUsers, []);

    const actionButtons: Array<ActionButton> = [];
    if (mVideo && room && room.isPrivate) {
        if (showInvite) {
            actionButtons.push({
                label: "Back to room",
                icon: <i className="fas fa-video"></i>,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowInvite(false);
                }
            });
        }
        else {
            actionButtons.push({
                label: "Invite",
                icon: <i className="fas fa-envelope"></i>,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowInvite(true);
                }
            });
        }
    }


    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await currentUserProfile.watched;
        return watched.watchedRooms.includes(props.roomId);
    }, setIsFollowing, [currentUserProfile.watchedId, props.roomId]);

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === currentUserProfile.watchedId) {
            setIsFollowing((update.object as WatchedItems).watchedRooms.includes(props.roomId));
        }
    }, [props.roomId, currentUserProfile.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conference);

    const doFollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await currentUserProfile.watched;
                let doSave = false;
                if (!watched.watchedRooms.includes(props.roomId)) {
                    watched.watchedRooms.push(props.roomId);
                    doSave = true;
                }
                if (chat && chat !== "not present" && !watched.watchedChats.includes(chat.id)) {
                    watched.watchedChats.push(chat.id);
                    doSave = true;
                }
                if (doSave) {
                    await watched.save();
                }
            })());
            setChangingFollow(p);
            await p.promise;
            setChangingFollow(null);
        }
        catch (e) {
            if (!e.isCanceled) {
                setChangingFollow(null);
                throw e;
            }
        }
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.roomId, currentUserProfile.watchedId]);

    const doUnfollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await currentUserProfile.watched;
                let doSave = false;
                if (watched.watchedRooms.includes(props.roomId)) {
                    watched.watchedRooms = watched.watchedRooms.filter(x => x !== props.roomId);
                    doSave = true;
                }
                if (chat && chat !== "not present" && watched.watchedChats.includes(chat.id)) {
                    watched.watchedChats = watched.watchedChats.filter(x => x !== chat.id);
                    doSave = true;
                }
                if (doSave) {
                    await watched.save();
                }
            })());
            setChangingFollow(p);
            await p.promise;
            setChangingFollow(null);
        }
        catch (e) {
            if (!e.isCanceled) {
                setChangingFollow(null);
                throw e;
            }
        }
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.roomId, currentUserProfile.watchedId]);

    if (room) {
        if (isFollowing !== null) {
            if (isFollowing) {
                actionButtons.push({
                    label: changingFollow ? "Changing" : "Unfollow room",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doUnfollow();
                    }
                });
            }
            else {
                actionButtons.push({
                    label: changingFollow ? "Changing" : "Follow room",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doFollow();
                    }
                });
            }
        }
    }


    useHeading({
        title: room?.name ?? "Room",
        buttons: actionButtons
    });

    useEffect(() => inviting?.cancel, [inviting]);
    function doInviteUsers(ev: React.FormEvent) {
        ev.preventDefault();
        ev.stopPropagation();

        if (!invites || invites.length === 0) {
            addError("Please select some users to invite.");
            return;
        }

        async function inviteUsers(): Promise<void> {
            try {
                assert(room);
                assert(mVideo);
                assert(invites);
                const p = makeCancelable(mVideo.inviteToRoom(room, invites.map(x => x.value)));
                setInviting(p);
                const results = await p.promise;
                const fails = [];
                for (const key in results) {
                    if (!results[key]) {
                        fails.push(key);
                    }
                }
                if (fails.length > 0) {
                    addError(`Failed to invite some users: ${fails.map(x => allUsers?.find(u => u.value === x)?.label ?? ", <Unknown>").reduce((acc, x) => `${acc}, ${x}`, "").substr(2)}`);
                }
                else {
                    addNotification("Successfully invited selected users.",);
                }
                setShowInvite(false);
                setInviting(null);
                setInvites([]);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        inviteUsers();
    }

    const inviteEl
        = inviting
            ? <LoadingSpinner message="Inviting users, please wait" />
            : <>
                <p>
                    By inviting users to join this room you will give them access to
                    participate in the room but not to invite more people.
        </p>
                <form onSubmit={(ev) => doInviteUsers(ev)}>
                    <label>Select users to invite:</label>
                    <div className="invite-users-control">
                        <MultiSelect
                            className="invite-users-control__multiselect"
                            labelledBy="Invite users"
                            overrideStrings={{ "allItemsAreSelected": "Everyone", "selectAll": "Everyone" }}
                            options={allUsers?.filter(x => !room?.userIdsWithAccess?.includes(x.value)) ?? []}
                            value={invites ?? []}
                            onChange={setInvites}
                        />
                    </div>
                    <div className="submit-container">
                        <button>Invite</button>
                    </div>
                </form>
            </>;

    // TODO: Members list (action button)

    return <div className={`video-room${showInvite ? " invite-view" : ""}`}>
        {showInvite ? inviteEl : <></>}
        <SplitterLayout
            vertical={true}
            percentage={true}
            ref={component => { component?.setState({ secondaryPaneSize: size }) }}
            onSecondaryPaneSizeChange={newSize => setSize(newSize)}
        >
            <div className="split top-split">
                {room ? <VideoGrid room={room} /> : <LoadingSpinner />}
                <button onClick={() => setSize(100)}>
                    &#9650;
                </button>
            </div>
            <div className="split bottom-split">
                <button onClick={() => setSize(0)}>
                    &#9660;
                </button>
                {chat ? chat !== "not present" ? <ChatFrame chatId={chat.id} /> : <>This room does not have a chat.</> : <LoadingSpinner />}
            </div>
        </SplitterLayout>
    </div>;
}
