import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useEffect, useState } from "react";
import MultiSelect from "react-multi-select-component";
import { Link } from "react-router-dom";
import { MemberDescriptor } from "../../../classes/Chat";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import { ActionButton } from "../../../contexts/HeadingContext";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import useUserRoles from "../../../hooks/useUserRoles";
import AsyncButton from "../../AsyncButton/AsyncButton";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { computeChatDisplayName, upgradeChatDescriptor } from "../../Sidebar/Sidebar";
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

export default function ChatView(props: Props) {
    const conf = useConference();
    const mUser = useUserProfile();
    const mChat = useMaybeChat();
    const [chatName, setChatName] = useState<string>("Chat");
    const [showPanel, setShowPanel] = useState<"members" | "invite" | "chat">("chat");
    const [chatMembersCount, setChatMembersCount] = useState<number | null>(null);
    const [members, setMembers] = useState<Array<RenderMemberDescriptor> | null>(null);
    const [isDM, setIsDM] = useState<boolean | null>(null);
    const [allUsers, setAllUsers] = useState<Array<UserOption> | null>(null);
    const [invites, setInvites] = useState<Array<UserOption> | null>(null);
    const { isAdmin, isManager } = useUserRoles();
    const [sendingInvites, setSendingInvites] = useState<boolean>(false);

    // Fetch all user profiles
    useSafeAsync(async () => {
        const profiles = await UserProfile.getAll(conf.id);
        return profiles.map(x => ({
            value: x.id,
            label: x.displayName
        })).filter(x => x.value !== mUser.id);
    }, setAllUsers, []);

    const usersLeftToInvite = allUsers?.filter(x => !members?.some(y => y.profileId === x.value)) ?? [];

    const actionButtons: Array<ActionButton> = [];

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
        actionButtons.push({
            label: `Members${chatMembersCount ? ` (${chatMembersCount})` : ""}`,
            icon: <i className="fas fa-user-friends"></i>,
            action: (ev) => {
                ev.stopPropagation();
                ev.preventDefault();

                setShowPanel("members");
            }
        });

        // isDM could be null...
        if (isDM === false && usersLeftToInvite.length > 0) {
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

    useHeading({
        title: chatName,
        buttons: actionButtons
    });

    useSafeAsync(async () => {
        if (mChat) {
            const chatD = await mChat.getChat(props.chatId);
            const chatSD = await upgradeChatDescriptor(conf, chatD);
            const { friendlyName, skip } = computeChatDisplayName(chatSD, mUser);
            const memberCount = await mChat.getChatMembersCount(props.chatId);
            return {
                name: skip ? "Chat" : friendlyName,
                count: memberCount,
                isDM: chatSD.isDM
            };
        }
        else {
            return {
                name: "Chat",
                count: null,
                isDM: null
            };
        }
    }, (data: { name: string, count: number | null, isDM: boolean | null }) => {
        setChatName(data.name);
        setChatMembersCount(data.count);
        setIsDM(data.isDM);
    }, [props.chatId, mChat]);

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

    const chat = <ChatFrame chatSid={props.chatId} />;

    // TODO: Action buttons: Watch, Laucnh video room, Invite
    // TODO: Start/stop watching action button

    useEffect(() => {
        if (mChat) {
            const joinedFunctionToOff = mChat.channelEventOn(props.chatId, "memberJoined", async (mem) => {
                const newMember: RenderMemberDescriptor = {
                    profileId: mem.profileId,
                    isOnline: await mem.getOnlineStatus(),
                    displayName: (await UserProfile.get(mem.profileId, conf.id))?.displayName ?? "<Unknown>"
                };
                setMembers(oldMembers => oldMembers ? [...oldMembers, newMember] : [newMember]);
                setChatMembersCount(oldCount => oldCount ? oldCount + 1 : null);
            });

            const leftFunctionToOff = mChat.channelEventOn(props.chatId, "memberLeft", async (mem) => {
                setMembers(oldMembers => oldMembers ? oldMembers.filter(x => x.profileId !== mem.profileId) : null);
                setChatMembersCount(oldCount => oldCount ? oldCount - 1 : null);
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

    async function doInvite(ev: React.FormEvent) {
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

    return <div className={`chat-view${showPanel !== "chat" ? " show-panel" : ""}`}>
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
                                action={(ev) => doInvite(ev)}
                                content="Invite"
                                disabled={sendingInvites || !(invites && invites.length > 0 && (isAdmin || isManager || invites.length <= 20))}/>
                        </div>
                    </form>
                </div>
                : <></>
        }
        {chat}
    </div>;
}
