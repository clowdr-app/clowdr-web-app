import { UserProfile, WatchedItems, TextChat } from "@clowdr-app/clowdr-db-schema";
import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import assert from "assert";
import React, { useCallback, useEffect, useState } from "react";
import MultiSelect from "react-multi-select-component";
import { Link, Redirect, useHistory } from "react-router-dom";
import { MemberDescriptor } from "../../../classes/Chat";
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
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { computeChatDisplayName, upgradeChatDescriptor } from "../../Sidebar/Groups/ChatsGroup";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

type RenderMemberDescriptor = MemberDescriptor & {
    displayName: string;
};

type UserOption = {
    label: string;
    value: string;
};

type DMInfo =
    | {
          isDM: false;
      }
    | {
          isDM: true;
          member1: MemberDescriptor & { displayName: string };
          member2: MemberDescriptor & { displayName: string };
      };

type ExtendedChatInfo = {
    name: string;
    dmInfo: DMInfo;
    isAutoWatch: boolean;
    isAnnouncements: boolean;
    isModeration: boolean;
    isModerationHub: boolean;
    isPrivate: boolean;
    creator: UserProfile;
};

export default function ChatView(props: Props) {
    const conf = useConference();
    const mUser = useUserProfile();
    const mChat = useMaybeChat();
    const history = useHistory();
    // const [chatName, setChatName] = useState<string>("Chat");
    const [showPanel, setShowPanel] = useState<"members" | "invite" | "chat">("chat");
    const [members, setMembers] = useState<Array<RenderMemberDescriptor> | null>(null);
    // const [dmInfo, setDMInfo] = useState<DMInfo | null>(null);
    // const [isAutoWatch, setIsAutoWatch] = useState<boolean | null>(null);
    // const [isModeration, setIsModeration] = useState<boolean | null>(null);
    // const [isModerationHub, setIsModerationHub] = useState<boolean | null>(null);
    // const [isAnnouncements, setIsAnnouncements] = useState<boolean | null>(null);
    // const [isPrivate, setIsPrivate] = useState<boolean | null>(null);
    const [chatInfo, setChatInfo] = useState<ExtendedChatInfo | null>(null);
    const [allUsers, setAllUsers] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const { isAdmin, isManager } = useUserRoles();
    const [sendingInvites, setSendingInvites] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Fetch all user profiles
    useSafeAsync(
        async () => {
            const profiles = await UserProfile.getAll(conf.id);
            return profiles
                .filter(x => !x.isBanned)
                .map(x => ({
                    value: x.id,
                    label: x.displayName,
                }))
                .filter(x => x.value !== mUser.id);
        },
        setAllUsers,
        [],
        "ChatView:setAllUsers"
    );

    // Fetch chat info
    useSafeAsync(
        async () => {
            if (mChat) {
                const chatD = await mChat.getChat(props.chatId);
                if (chatD) {
                    const chatSD = await upgradeChatDescriptor(conf, chatD);
                    const { friendlyName } = computeChatDisplayName(chatSD, mUser);
                    if (chatSD.isDM) {
                        return {
                            name: friendlyName,
                            dmInfo: {
                                isDM: true,
                                member1: chatSD.member1,
                                member2: chatSD.member2,
                            },
                            isAutoWatch: chatD.autoWatchEnabled,
                            isAnnouncements: chatD.isAnnouncements,
                            isModeration: chatD.isModeration,
                            isModerationHub: chatD.isModerationHub,
                            isPrivate: chatD.isPrivate,
                            creator: chatD.creator,
                        };
                    } else {
                        return {
                            name: friendlyName,
                            dmInfo: { isDM: false } as DMInfo,
                            isAutoWatch: chatD.autoWatchEnabled,
                            isAnnouncements: chatD.isAnnouncements,
                            isModeration: chatD.isModeration,
                            isModerationHub: chatD.isModerationHub,
                            isPrivate: chatD.isPrivate,
                            creator: chatD.creator,
                        };
                    }
                } else {
                    return null;
                }
            }

            return undefined;
        },
        setChatInfo,
        [props.chatId, mChat],
        "ChatView:setChatInfo"
    );

    // Fetch members
    useSafeAsync(
        async () => {
            if (mChat) {
                return Promise.all(
                    (await mChat.listChatMembers(props.chatId)).map(async mem => {
                        return {
                            ...mem,
                            displayName: (await UserProfile.get(mem.profileId, conf.id))?.displayName ?? "<Unknown>",
                        };
                    })
                );
            } else {
                return null;
            }
        },
        setMembers,
        [conf.id, props.chatId, mChat],
        "ChatView:setMembers"
    );

    const usersLeftToInvite = allUsers?.filter(x => !members?.some(y => y.profileId === x.value)) ?? [];

    const actionButtons: Array<ActionButton> = [];

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(
        async () => {
            const watched = await mUser.watched;
            return watched.watchedChats.includes(props.chatId);
        },
        setIsFollowing,
        [mUser.watchedId, props.chatId],
        "ChatView:setIsFollowing"
    );

    const onWatchedItemsUpdated = useCallback(
        function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
            for (const object of update.objects) {
                if (object.id === mUser.watchedId) {
                    setIsFollowing((object as WatchedItems).watchedChats.includes(props.chatId));
                }
            }
        },
        [props.chatId, mUser.watchedId]
    );

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conf);

    const onTextChatUpdated = useCallback(
        function _onTextChatUpdated(update: DataUpdatedEventDetails<"TextChat">) {
            for (const object of update.objects) {
                if (object.id === props.chatId) {
                    const tc = object as TextChat;
                    setChatInfo(oldChatInfo =>
                        oldChatInfo
                            ? {
                                  ...oldChatInfo,
                                  name: tc.name,
                                  isAutoWatch: tc.autoWatch,
                              }
                            : null
                    );
                }
            }
        },
        [props.chatId]
    );

    const onTextChatDeleted = useCallback(
        function _onTextChatDeleted(update: DataDeletedEventDetails<"TextChat">) {
            if (update.objectId === props.chatId) {
                addNotification("Chat deleted.");
                history.push("/");
            }
        },
        [history, props.chatId]
    );

    useDataSubscription("TextChat", onTextChatUpdated, onTextChatDeleted, !chatInfo, conf);

    const doFollow = useCallback(
        async function _doFollow() {
            try {
                const p = makeCancelable(
                    (async () => {
                        const watched = await mUser.watched;
                        if (!watched.watchedChats.includes(props.chatId)) {
                            watched.watchedChats.push(props.chatId);
                            await watched.save();
                        }
                    })()
                );
                setChangingFollow(p);
                await p.promise;
                setChangingFollow(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingFollow(null);
                    throw e;
                }
            }
            // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [mUser.watched, props.chatId]
    );

    const doUnfollow = useCallback(
        async function _doFollow() {
            try {
                const p = makeCancelable(
                    (async () => {
                        const watched = await mUser.watched;
                        if (watched.watchedChats.includes(props.chatId)) {
                            watched.watchedChats = watched.watchedChats.filter(x => x !== props.chatId);
                            await watched.save();
                        }
                    })()
                );
                setChangingFollow(p);
                await p.promise;
                setChangingFollow(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingFollow(null);
                    throw e;
                }
            }
            // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [mUser.watched, props.chatId]
    );

    const [changingAutoWatch, setChangingAutoWatch] = useState<CancelablePromise<void> | null>(null);
    const doEnableAutoWatch = useCallback(
        async function _doDisableAutoWatch() {
            try {
                const p = makeCancelable(
                    (async () => {
                        await mChat?.enableAutoWatch(props.chatId);
                    })()
                );
                setChangingAutoWatch(p);
                await p.promise;
                setChangingAutoWatch(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingAutoWatch(null);
                    throw e;
                }
            }
        },
        [mChat, props.chatId]
    );

    const doDisableAutoWatch = useCallback(
        async function _doDisableAutoWatch() {
            try {
                const p = makeCancelable(
                    (async () => {
                        await mChat?.disableAutoWatch(props.chatId);
                    })()
                );
                setChangingAutoWatch(p);
                await p.promise;
                setChangingAutoWatch(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingAutoWatch(null);
                    throw e;
                }
            }
        },
        [mChat, props.chatId]
    );

    if (showPanel !== "chat") {
        actionButtons.push({
            label: "Back to chat",
            icon: <i className="fas fa-comment"></i>,
            action: ev => {
                ev.stopPropagation();
                ev.preventDefault();

                setShowPanel("chat");
            },
        });
    } else {
        if (members) {
            if (chatInfo?.dmInfo?.isDM === true) {
                const otherMember =
                    chatInfo?.dmInfo.member1.profileId === mUser.id
                        ? chatInfo?.dmInfo.member2
                        : chatInfo?.dmInfo.member1;
                actionButtons.push({
                    label: `View ${otherMember.displayName}'s profile`,
                    icon: <i className="fas fa-eye"></i>,
                    action: `/profile/${otherMember.profileId}`,
                });
            } else {
                actionButtons.push({
                    label: `Members${members ? ` (${members.length})` : ""}`,
                    icon: <i className="fas fa-user-friends"></i>,
                    action: ev => {
                        ev.stopPropagation();
                        ev.preventDefault();

                        setShowPanel("members");
                    },
                });
            }
        }

        // isDM could be null...
        if (chatInfo?.dmInfo?.isDM === false && usersLeftToInvite.length > 0 && chatInfo?.isPrivate) {
            actionButtons.push({
                label: "Invite",
                icon: <i className="fas fa-envelope"></i>,
                action: ev => {
                    ev.stopPropagation();
                    ev.preventDefault();

                    setShowPanel("invite");
                },
            });
        }
    }

    if (chatInfo && chatInfo.dmInfo?.isDM === false && chatInfo.isAnnouncements !== null && !chatInfo.isAnnouncements) {
        if (isFollowing !== null) {
            if (isFollowing) {
                actionButtons.push({
                    label: changingFollow ? "Changing" : "Unfollow chat",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doUnfollow();
                    },
                });
            } else {
                actionButtons.push({
                    label: changingFollow ? "Changing" : "Follow chat",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doFollow();
                    },
                });
            }
        }

        if (chatInfo.isAutoWatch !== null && (isAdmin || isManager)) {
            if (chatInfo.isAutoWatch) {
                actionButtons.push({
                    label: changingAutoWatch ? "Changing" : "Disable auto-follow",
                    icon: changingAutoWatch ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doDisableAutoWatch();
                    },
                });
            } else {
                actionButtons.push({
                    label: changingAutoWatch ? "Changing" : "Enable auto-follow",
                    icon: changingAutoWatch ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doEnableAutoWatch();
                    },
                });
            }
        }
    }

    if (chatInfo) {
        if (
            (isManager || isAdmin || chatInfo.creator.id === mUser.id) &&
            !chatInfo?.dmInfo.isDM &&
            !chatInfo?.isAnnouncements &&
            !chatInfo?.isModeration &&
            !chatInfo?.isModerationHub
        ) {
            actionButtons.push({
                label: isDeleting ? "Deleting" : "Delete chat",
                icon: isDeleting ? <LoadingSpinner message="" /> : <i className="fas fa-trash-alt" />,
                action: ev => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    try {
                        assert(mChat, "Chat not available");
                        setIsDeleting(true);
                        mChat?.deleteChat(props.chatId).catch(e => {
                            addError(`Failed to delete chat. ${e}`);
                            setIsDeleting(false);
                        });
                    } catch (e) {
                        addError(`Failed to delete chat. ${e}`);
                    }
                },
            });
        }
    }

    useHeading({
        title: chatInfo ? chatInfo.name : "Chat",
        icon:
            chatInfo?.dmInfo && chatInfo?.dmInfo.isDM ? (
                chatInfo.dmInfo.member1.profileId === mUser.id ? (
                    chatInfo.dmInfo.member2.isOnline ? (
                        <i className="fas fa-circle online"></i>
                    ) : (
                        <i className="far fa-circle"></i>
                    )
                ) : chatInfo.dmInfo.member1.isOnline ? (
                    <i className="fas fa-circle online"></i>
                ) : (
                    <i className="far fa-circle"></i>
                )
            ) : (
                undefined
            ),
        buttons: actionButtons,
    });

    const chat = <ChatFrame chatId={props.chatId} />;

    // TODO: Action buttons: Launch video chat

    useEffect(() => {
        if (mChat) {
            const joinedFunctionToOff = mChat.channelEventOn(props.chatId, "memberJoined", async mem => {
                const newMember: RenderMemberDescriptor = {
                    profileId: mem.profileId,
                    isOnline: await mem.getOnlineStatus(),
                    displayName: (await UserProfile.get(mem.profileId, conf.id))?.displayName ?? "<Unknown>",
                };
                setMembers(oldMembers => (oldMembers ? [...oldMembers, newMember] : [newMember]));
            });

            const leftFunctionToOff = mChat.channelEventOn(props.chatId, "memberLeft", async mem => {
                setMembers(oldMembers => (oldMembers ? oldMembers.filter(x => x.profileId !== mem.profileId) : null));
            });

            const updateFunctionToOff = mChat.serviceEventOn("userUpdated", async event => {
                if (event.updateReasons.includes("online")) {
                    setMembers(oldMembers =>
                        oldMembers
                            ? oldMembers.map(x =>
                                  x.profileId === event.user.profileId
                                      ? {
                                            ...x,
                                            isOnline: event.user.isOnline,
                                        }
                                      : x
                              )
                            : null
                    );
                    setChatInfo(oldInfo => {
                        if (oldInfo?.dmInfo.isDM) {
                            return {
                                ...oldInfo,
                                dmInfo: {
                                    ...oldInfo.dmInfo,
                                    member1: {
                                        ...oldInfo.dmInfo.member1,
                                        isOnline:
                                            oldInfo.dmInfo.member1.profileId === event.user.profileId
                                                ? event.user.isOnline
                                                : oldInfo.dmInfo.member1.isOnline,
                                    },
                                    member2: {
                                        ...oldInfo.dmInfo.member2,
                                        isOnline:
                                            oldInfo.dmInfo.member2.profileId === event.user.profileId
                                                ? event.user.isOnline
                                                : oldInfo.dmInfo.member2.isOnline,
                                    },
                                },
                            };
                        }
                        return oldInfo;
                    });
                }
            });

            return async () => {
                mChat.channelEventOff(props.chatId, "memberJoined", await joinedFunctionToOff);
                mChat.channelEventOff(props.chatId, "memberLeft", await leftFunctionToOff);
                mChat.serviceEventOff("userUpdated", await updateFunctionToOff);
            };
        }
        return () => {};
    }, [conf.id, mChat, props.chatId]);

    async function doInvite() {
        if (!invites) {
            addError("Please select users to invite.");
            return;
        }

        setSendingInvites(true);

        if (mChat) {
            try {
                await mChat.inviteUsers(
                    props.chatId,
                    invites.map(x => x.value)
                );
                addNotification("Invites sent.");

                setShowPanel("chat");
                setInvites(null);
                setSendingInvites(false);
            } catch {
                addError("Sorry, we were unable to invite some or all of the users you selected.");
            }
        } else {
            addError(
                "Unable to invite users - chat is not currently available. Please don't refresh your page but try again in a moment."
            );
        }
    }

    return !chatInfo ? (
        <LoadingSpinner />
    ) : chatInfo.isModeration ? (
        <Redirect to={`/moderation/${props.chatId}`} />
    ) : chatInfo.isModerationHub ? (
        <Redirect to={`/moderation/hub`} />
    ) : (
        <div className={`chat-view${showPanel !== "chat" ? " show-panel" : ""}`}>
            {showPanel === "members" ? (
                <div className="members-list">
                    {members ? (
                        <ul className="members">
                            {members
                                .sort((x, y) => x.displayName.localeCompare(y.displayName))
                                .map(mem => {
                                    const icon = (
                                        <i
                                            className={`fa${mem.isOnline ? "s" : "r"} fa-circle ${
                                                mem.isOnline ? "online" : ""
                                            }`}
                                        ></i>
                                    );
                                    return (
                                        <li key={mem.profileId}>
                                            <Link to={`/profile/${mem.profileId}`}>
                                                {icon}
                                                <span>{mem.displayName}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                        </ul>
                    ) : (
                        <LoadingSpinner message="Loading members" />
                    )}
                </div>
            ) : showPanel === "invite" ? (
                <div className="invite">
                    <form
                        onSubmit={async ev => {
                            ev.preventDefault();
                            ev.stopPropagation();
                        }}
                    >
                        {!isAdmin && !isManager ? <p>You may invite up to 20 people at a time.</p> : <></>}
                        <label>Select users to invite:</label>
                        <div className="invite-users-control">
                            <MultiSelect
                                className="invite-users-control__multiselect"
                                labelledBy="Invite users"
                                overrideStrings={{ allItemsAreSelected: "Everyone", selectAll: "Everyone" }}
                                options={usersLeftToInvite}
                                value={invites ?? []}
                                onChange={setInvites}
                            />
                        </div>
                        <div className="submit-container">
                            <AsyncButton
                                action={() => doInvite()}
                                children="Invite"
                                disabled={
                                    sendingInvites ||
                                    !(invites && invites.length > 0 && (isAdmin || isManager || invites.length <= 20))
                                }
                            />
                        </div>
                    </form>
                </div>
            ) : (
                <></>
            )}
            {chat}
        </div>
    );
}
