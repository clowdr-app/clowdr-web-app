import { UserProfile, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import assert from "assert";
import React, { useCallback, useEffect, useState } from "react";
import MultiSelect from "react-multi-select-component";
import { Link, Redirect } from "react-router-dom";
import { ChatDescriptor, MemberDescriptor } from "../../../classes/Chat";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import { ActionButton } from "../../../contexts/HeadingContext";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import useUserRoles from "../../../hooks/useUserRoles";
import AsyncButton from "../../AsyncButton/AsyncButton";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import Message, { RenderedMessage, renderMessage } from "../../Chat/MessageList/Message";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

type RenderMemberDescriptor = MemberDescriptor & {
    displayName: string
};

type UserOption = {
    label: string;
    value: string;
}

export default function ModerationChat(props: Props) {
    const conf = useConference();
    const mUser = useUserProfile();
    const mChat = useMaybeChat();
    const [showPanel, setShowPanel] = useState<"members" | "invite" | "chat" | "related">("chat");
    const [chatDesc, setChatDesc] = useState<ChatDescriptor | null>(null);
    const [members, setMembers] = useState<Array<RenderMemberDescriptor> | null>(null);
    const [allUsers, setAllUsers] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const { isAdmin, isManager } = useUserRoles();
    const [sendingInvites, setSendingInvites] = useState<boolean>(false);
    const [reportedChat, setReportedChat] = useState<ChatDescriptor | null>(null);
    const [reportedMessage, setReportedMessage] = useState<RenderedMessage | null>(null);
    const [markingCompletedP, setMarkingCompletedP] = useState<CancelablePromise<void> | null>(null);
    const [refetchChatDesc, setRefetchChatDesc] = useState<boolean>(false);

    useEffect(() => {
        return markingCompletedP?.cancel;
    }, [markingCompletedP]);

    // Fetch all user profiles
    useSafeAsync(async () => {
        const profiles = await UserProfile.getAll(conf.id);
        return profiles
            .filter(x => !x.isBanned)
            .map(x => ({
                value: x.id,
                label: x.displayName
            })).filter(x => x.value !== mUser.id);
    }, setAllUsers, []);

    // Fetch chat info
    useSafeAsync(async () => mChat?.getChat(props.chatId) ?? null, (d) => {
        setChatDesc(d);
    }, [props.chatId, mChat, refetchChatDesc]);

    // Subscribe to updates
    const onTextChatUpdated = useCallback(function _onTextChatUpdated(update: DataUpdatedEventDetails<"TextChat">) {
        if (update.object.id === props.chatId) {
            setRefetchChatDesc(x => !x);
        }
    }, [props.chatId]);
    useDataSubscription("TextChat", onTextChatUpdated, null, !chatDesc, conf);

    // Fetch members
    useSafeAsync(async () => {
        if (mChat) {
            return Promise.all((await mChat.listChatMembers(props.chatId)).map(async mem => {
                return {
                    ...mem,
                    displayName: (await UserProfile.get(mem.profileId, conf.id))?.displayName ?? "<Unknown>"
                };
            }));
        }
        else {
            return null;
        }
    }, setMembers, [conf.id, props.chatId, mChat]);

    // Fetch reported chat
    useSafeAsync(async () =>
        chatDesc?.isModeration && chatDesc.relatedModerationKey
            ? mChat?.getChat(chatDesc.relatedModerationKey.split(":")[0])
            : null,
        setReportedChat, [mChat, chatDesc]);

    // Fetch reported message
    useSafeAsync(async () => {
        if (chatDesc?.isModeration && chatDesc.relatedModerationKey && reportedChat) {
            const msg = await mChat?.getMessage(
                chatDesc.relatedModerationKey.split(":")[0],
                chatDesc.relatedModerationKey.split(":")[1],
                parseInt(chatDesc.relatedModerationKey.split(":")[2], 10)
            ) ?? null;
            if (msg) {
                return renderMessage(conf, mUser, reportedChat.id, msg, reportedChat.isDM, reportedChat.friendlyName);
            }
        }
        return null;
    },
        setReportedMessage, [mChat, chatDesc, reportedChat]);

    const usersLeftToInvite = allUsers?.filter(x => !members?.some(y => y.profileId === x.value)) ?? [];

    const actionButtons: Array<ActionButton> = [];

    if (isAdmin || isManager) {
        actionButtons.push({
            label: "Back to moderation hub",
            icon: <i className="fas fa-arrow-left"></i>,
            action: "/moderation/hub"
        });
    }

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await mUser.watched;
        return watched.watchedChats.includes(props.chatId);
    }, setIsFollowing, [mUser.watchedId, props.chatId]);

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === mUser.watchedId) {
            setIsFollowing((update.object as WatchedItems).watchedChats.includes(props.chatId));
        }
    }, [props.chatId, mUser.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conf);

    const doFollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await mUser.watched;
                if (!watched.watchedChats.includes(props.chatId)) {
                    watched.watchedChats.push(props.chatId);
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
    }, [props.chatId, mUser.watchedId]);

    const doUnfollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await mUser.watched;
                if (watched.watchedChats.includes(props.chatId)) {
                    watched.watchedChats = watched.watchedChats.filter(x => x !== props.chatId);
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
    }, [props.chatId, mUser.watchedId]);

    if (showPanel !== "chat") {
        actionButtons.push({
            label: "Back to chat",
            icon: <i className="fas fa-comment"></i>,
            action: (ev) => {
                ev.stopPropagation();
                ev.preventDefault();

                setShowPanel("chat");
            }
        });
    }
    else {
        if (members) {
            actionButtons.push({
                label: `Members${members ? ` (${members.length})` : ""}`,
                icon: <i className="fas fa-user-friends"></i>,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowPanel("members");
                }
            });
        }

        if (chatDesc?.isModeration && chatDesc.relatedModerationKey) {
            actionButtons.push({
                label: "Reported content",
                icon: <i className="fas fa-eye"></i>,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowPanel("related");
                }
            });
        }

        if (usersLeftToInvite.length > 0) {
            actionButtons.push({
                label: "Invite",
                icon: <i className="fas fa-envelope"></i>,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowPanel("invite");
                }
            });
        }
    }

    if (isFollowing !== null) {
        if (isFollowing) {
            actionButtons.push({
                label: changingFollow ? "Changing" : "Unfollow chat",
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
                label: changingFollow ? "Changing" : "Follow chat",
                icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                action: (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    doFollow();
                }
            });
        }
    }

    if (isAdmin || isManager) {
        if (chatDesc?.isModeration && chatDesc.isActive && !markingCompletedP) {
            actionButtons.push({
                label: "Mark completed",
                icon: <i className="fas fa-check-circle" />,
                action: async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    try {
                        assert(mChat);
                        const p = makeCancelable(mChat.markModerationChatCompleted(props.chatId));
                        setMarkingCompletedP(p);
                        await p.promise;
                        addNotification("Channel marked completed");
                    }
                    catch (e) {
                        if (!e.isCanceled) {
                            addError("Sorry, we could not mark channel completed. Please try again later.");
                        }
                    }

                    setMarkingCompletedP(null);
                }
            });
        }
        else if (markingCompletedP) {
            actionButtons.push({
                label: "",
                icon: <LoadingSpinner message="Marking" />,
                action: (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            });
        }
    }

    useHeading({
        title: (chatDesc?.friendlyName ?? "Chat") + (chatDesc?.isModeration && !chatDesc?.isActive ? " (Completed)" : ""),
        icon: <i className="fas fa-circle moderation"></i>,
        buttons: actionButtons
    });

    const chat = <ChatFrame chatId={props.chatId} />;

    // TODO: Action buttons: Launch video chat

    useEffect(() => {
        if (mChat) {
            const joinedFunctionToOff = mChat.channelEventOn(props.chatId, "memberJoined", async (mem) => {
                const newMember: RenderMemberDescriptor = {
                    profileId: mem.profileId,
                    isOnline: await mem.getOnlineStatus(),
                    displayName: (await UserProfile.get(mem.profileId, conf.id))?.displayName ?? "<Unknown>"
                };
                setMembers(oldMembers => oldMembers ? [...oldMembers, newMember] : [newMember]);
            });

            const leftFunctionToOff = mChat.channelEventOn(props.chatId, "memberLeft", async (mem) => {
                setMembers(oldMembers => oldMembers ? oldMembers.filter(x => x.profileId !== mem.profileId) : null);
            });

            const updateFunctionToOff = mChat.serviceEventOn("userUpdated", async (event) => {
                if (event.updateReasons.includes("online")) {
                    setMembers(oldMembers => oldMembers
                        ? oldMembers.map(x => x.profileId === event.user.profileId
                            ? {
                                ...x,
                                isOnline: event.user.isOnline
                            }
                            : x)
                        : null);
                }
            });

            return async () => {
                mChat.channelEventOff(props.chatId, "memberJoined", await joinedFunctionToOff);
                mChat.channelEventOff(props.chatId, "memberLeft", await leftFunctionToOff);
                mChat.serviceEventOff("userUpdated", await updateFunctionToOff);
            };
        }
        return () => { };
    }, [conf.id, mChat, props.chatId]);

    async function doInvite() {
        if (!invites) {
            addError("Please select users to invite.");
            return;
        }

        setSendingInvites(true);

        if (mChat) {
            try {
                await mChat.inviteUsers(props.chatId, invites.map(x => x.value));
                addNotification("Invites sent.");

                setShowPanel("chat");
                setInvites(null);
                setSendingInvites(false);
            }
            catch {
                addError("Sorry, we were unable to invite some or all of the users you selected.");
            }
        }
        else {
            addError("Unable to invite users - chat is not currently available. Please don't refresh your page but try again in a moment.");
        }
    }

    return chatDesc?.isModerationHub
        ? <Redirect to={`/moderation/hub`} />
        : chatDesc == null
            ? <LoadingSpinner />
            : !chatDesc.isModeration
                ? <Redirect to={`/chat/${props.chatId}`} />
                : <div className={`chat-view${showPanel !== "chat" ? " show-panel" : ""}`}>
                    {showPanel === "members"
                        ? <div className="members-list">
                            {members
                                ? <ul className="members">
                                    {members
                                        .sort((x, y) => x.displayName.localeCompare(y.displayName))
                                        .map(mem => {
                                            const icon = <i className={`fa${mem.isOnline ? 's' : 'r'} fa-circle ${mem.isOnline ? 'online' : ''}`}></i>;
                                            return <li key={mem.profileId}>
                                                <Link to={`/profile/${mem.profileId}`}>{icon}<span>{mem.displayName}</span></Link>
                                            </li>;
                                        })}
                                </ul>
                                : <LoadingSpinner message="Loading members" />
                            }
                        </div>
                        :
                        showPanel === "invite"
                            ? <div className="invite">
                                <form onSubmit={async (ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                }}>
                                    {!isAdmin && !isManager ? <p>You may invite up to 20 people at a time.</p> : <></>}
                                    <label>Select users to invite:</label>
                                    <div className="invite-users-control">
                                        <MultiSelect
                                            className="invite-users-control__multiselect"
                                            labelledBy="Invite users"
                                            overrideStrings={{ "allItemsAreSelected": "Everyone", "selectAll": "Everyone" }}
                                            options={usersLeftToInvite}
                                            value={invites ?? []}
                                            onChange={setInvites}
                                        />
                                    </div>
                                    <div className="submit-container">
                                        <AsyncButton
                                            action={() => doInvite()}
                                            content="Invite"
                                            disabled={sendingInvites || !(invites && invites.length > 0 && (isAdmin || isManager || invites.length <= 20))} />
                                    </div>
                                </form>
                            </div>
                            :
                            showPanel === "related"
                                ? (reportedMessage
                                    ? <Message msg={reportedMessage} />
                                    : <>The reported message could not be loaded. It may have been deleted.</>
                                )
                                : <></>
                    }
                    {chat}
                </div>;
}
