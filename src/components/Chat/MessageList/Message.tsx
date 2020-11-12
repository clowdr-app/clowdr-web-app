import React, { useRef, useState } from "react";
import "./Message.scss";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import FlairChip from "../../Profile/FlairChip/FlairChip";
import { Conference, Flair, TextChat } from "@clowdr-app/clowdr-db-schema";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";

import "emoji-mart/css/emoji-mart.css";
import { Picker as EmojiPicker } from "emoji-mart";
import { Tooltip } from "@material-ui/core";
import { Link, useHistory } from "react-router-dom";
import assert from "assert";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useUserProfile from "../../../hooks/useUserProfile";
import IMessage from "../../../classes/Chat/IMessage";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { handleParseFileURLWeirdness, ReactMarkdownCustomised } from "../../../classes/Utils";
import AsyncButton from "../../AsyncButton/AsyncButton";
import IMember from "../../../classes/Chat/IMember";
import useUserRoles from "../../../hooks/useUserRoles";
import useEmojiPicker from "../../../hooks/useEmojiPicker";
import ReactDOM from "react-dom";
import { emojify } from "react-emojione";

export type RenderedMessage = {
    chatSid: string;
    chatName?: string;
    sid: string;
    body: string;
    profileId: string | null;
    profileName: string;
    profilePhotoUrl: string | null;
    profileFlair: Flair | undefined;
    time: number;
    timeStr: string;
    index: number;
    isDM?: boolean;
    moderation?: {
        creator: UserProfile;
        channel: TextChat;
    };
    reactions: {
        [reaction: string]: {
            ids: Array<string>;
            names: Array<string>;
        };
    };
    remove: () => Promise<void>;
};

export async function renderMessage(
    conf: Conference,
    userProfile: UserProfile,
    chatSid: string,
    message: IMessage,
    chatIsDM?: boolean,
    chatName?: string
) {
    const body = message.body;
    const _member: "unknown" | "system" | IMember = await message.getMember();
    let memberProfileId: string | undefined;
    let profile: UserProfile | null | undefined;
    let member: "System" | "Unknown" | IMember;
    if (typeof _member !== "string") {
        memberProfileId = _member.profileId;
        profile = await UserProfile.get(memberProfileId, conf.id);
        if (!profile) {
            member = "Unknown";
        } else {
            member = _member;
        }
    } else {
        member = _member === "system" ? "System" : "Unknown";
    }
    const time = message.timestamp;
    const nowD = new Date();
    const isDifferentDay = nowD.getDate() !== time.getDate();
    const isDifferentMonth = nowD.getMonth() !== time.getMonth();
    const isDifferentYear = nowD.getFullYear() !== time.getFullYear();
    const isDifferentDate = isDifferentDay || isDifferentMonth || isDifferentYear;

    const flair = await profile?.primaryFlair;
    const profilePhotoUrl = handleParseFileURLWeirdness(profile?.profilePhoto);
    const reactorIds = (message.attributes as any)?.reactions ?? {};
    const reactions: { [reaction: string]: { ids: Array<string>; names: Array<string> } } = {};
    for (const reaction in reactorIds) {
        if (reaction in reactorIds) {
            reactions[reaction] = {
                ids: reactorIds[reaction],
                names: await Promise.all(
                    reactorIds[reaction].map(async (aProfileId: string) => {
                        const aProfile = await UserProfile.get(aProfileId, conf.id);
                        return aProfile?.id === userProfile.id ? "You" : aProfile?.displayName ?? `<Unknown>`;
                    })
                ),
            };
        }
    }
    let moderation;
    if (message.attributes.moderationChat) {
        const channel = await TextChat.get(message.attributes.moderationChat, conf.id);
        if (channel) {
            moderation = {
                creator: await channel.creator,
                channel,
            };
        }
    }

    let dateFormat: Intl.DateTimeFormatOptions | undefined;
    if (isDifferentYear) {
        dateFormat = {
            year: "numeric",
            month: "short",
            day: "2-digit",
        };
    } else if (isDifferentMonth || isDifferentDay) {
        dateFormat = {
            month: "short",
            day: "2-digit",
        };
    }

    const result: RenderedMessage = {
        chatSid,
        chatName,
        sid: message.sid,
        isDM: chatIsDM,
        body,
        profileFlair: flair,
        profileId: profile?.id ?? null,
        profileName: profile?.id === userProfile.id ? "You" : profile?.displayName ?? `<${member}>`,
        profilePhotoUrl,
        time: time.getTime(),
        timeStr:
            (isDifferentDate ? time.toLocaleDateString(undefined, dateFormat) + " " : "") +
            time
                .toLocaleTimeString()
                .split(":")
                .slice(0, 2)
                .join(":"),
        index: message.index,
        reactions,
        moderation,
        remove: () => message.remove(),
    };
    return result;
}

export default function Message(props: {
    msg: RenderedMessage;
    hideReportButton?: boolean;
    hideDeleteButton?: boolean;
}): JSX.Element {
    const history = useHistory();
    const mChat = useMaybeChat();
    const userProfile = useUserProfile();
    const { isAdmin, isManager } = useUserRoles();
    const msg = props.msg;
    const [pickEmojiForMsgSid, setPickEmojiForMsgSid] = useState<string | null>(null);
    const [showReportConfirm, setShowReportConfirm] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [reporting, setReporting] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [showProfileOptions, setShowProfileOptions] = useState<boolean>(false);

    const emoji = useEmojiPicker();
    const emojiButton = useRef<HTMLButtonElement | null>(null);
    const [emojiButtonPosition, setEmojiButtonPosition] = useState<{ bottom: number; left: number } | null>(null);

    const doEmojify = (val: any) => <>{emojify(val, { output: "unicode" })}</>;

    const getEmojiPickerOffset = () => {
        if (emojiButton && emojiButton.current) {
            var rect = emojiButton.current.getBoundingClientRect();
            var win = emojiButton.current.ownerDocument.defaultView;

            setEmojiButtonPosition({
                bottom: win ? win.innerHeight - rect.top : 0,
                left: rect.left + (win?.scrollX ?? 0) + 20,
            });
        } else {
            setEmojiButtonPosition(null);
        }
    };

    function toggleAddReaction(msgSid: string) {
        if (pickEmojiForMsgSid) {
            setPickEmojiForMsgSid(null);
        } else {
            setPickEmojiForMsgSid(msgSid);
        }
    }

    async function doReport() {
        if (!mChat) {
            const errMsg = "Sorry, we were unable to report this message. The chat service is currently unavailable.";
            addError(errMsg);
            throw new Error(errMsg);
        }
        try {
            const newModChat = await mChat.createModerationChat([], `${msg.chatSid}:${msg.sid}:${msg.index}`);
            if (!newModChat) {
                const errMsg =
                    "Sorry, we were unable to report this message. It may have been removed from the channel but cached in your browser.";
                addError(errMsg);
                throw new Error(errMsg);
            }
            history.push(`/moderation/${newModChat.id}`);
        } catch (e) {
            const errMsg = `Sorry, we were unable to report this message. ${e}.`;
            addError(errMsg);
            throw new Error(errMsg);
        }
    }

    async function doDelete() {
        if (!mChat) {
            const errMsg = "Sorry, we were unable to delete this message. The chat service is currently unavailable.";
            addError(errMsg);
            throw new Error(errMsg);
        }
        try {
            await msg.remove();
        } catch (e) {
            const errMsg = `Sorry, we were unable to delete this message. ${e}.`;
            addError(errMsg);
            throw new Error(errMsg);
        }
    }

    const moderationNamePrefix = "Moderation: ";

    return (
        <div className={`chat-message${showReportConfirm || showDeleteConfirm ? " highlight" : ""}`} key={msg.index}>
            <div
                className="profile"
                onClick={ev => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    if (msg.profileId !== userProfile.id) {
                        if (msg.profileId) {
                            setShowProfileOptions(!showProfileOptions);
                        } else {
                            addNotification("User is not known - they may have been deleted.");
                        }
                    }
                }}
            >
                {msg.profilePhotoUrl ? (
                    <img src={msg.profilePhotoUrl} alt={`${msg.profileName}'s avatar`} />
                ) : (
                        <img src={defaultProfilePic} alt="default avatar" />
                    )}
                {msg.profileFlair ? <FlairChip flair={msg.profileFlair} small /> : <></>}
            </div>
            <div className="content">
                <div className="content-inner">
                    {msg.chatName ? (
                        <div className="goto-overlay">
                            <Link className="button" to={`/chat/${msg.chatSid}`}>
                                Go to chat
                            </Link>
                        </div>
                    ) : (
                            ""
                        )}
                    <div className="name">
                        {msg.chatName ? (msg.isDM ? `DM: ` : `#${msg.chatName} / `) : ""}
                        {msg.profileName ?? "<Unknown>"}
                    </div>
                    <div className="time">{msg.timeStr}</div>

                    {showProfileOptions ? (
                        <div className="view-profile-options">
                            <Link className="button" to={`/profile/${msg.profileId}`}>
                                View {msg.profileName}'s profile
                            </Link>
                            <Link className="button" to={`/chat/new/${msg.profileId}`}>
                                DM {msg.profileName}
                            </Link>
                            <button
                                onClick={ev => {
                                    ev.stopPropagation();
                                    ev.preventDefault();
                                    setShowProfileOptions(false);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                            <ReactMarkdownCustomised className="body">
                                {msg.body}
                            </ReactMarkdownCustomised>
                        )}
                    {!showDeleteConfirm ? (
                        <div className="report">
                            {!props.hideReportButton && msg.profileId !== userProfile.id ?
                                (showReportConfirm || reporting ? (
                                    <>
                                        {!reporting ? <span>Report?</span> : <></>}
                                        <AsyncButton
                                            children={reporting ? "Reporting" : "Yes"}
                                            className="yes"
                                            setIsRunning={setReporting}
                                            action={doReport}
                                        />
                                        {!reporting ? (
                                            <button
                                                title="No, do not report this message"
                                                className="no"
                                                onClick={ev => {
                                                    ev.preventDefault();
                                                    ev.stopPropagation();
                                                    setShowReportConfirm(false);
                                                }}
                                            >
                                                No
                                            </button>
                                        ) : (
                                                <></>
                                            )}
                                    </>
                                ) : (
                                        <button
                                            title="Report this message"
                                            onClick={ev => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                setShowReportConfirm(true);
                                            }}
                                        >
                                            <i className="far fa-flag"></i>
                                            <i className="fas fa-flag"></i>
                                        </button>
                                    )
                                )
                                : <></>
                            }
                        </div>
                    ) : (
                            <></>
                        )}
                    {(isAdmin || isManager || msg.profileId === userProfile.id) &&
                        !props.hideDeleteButton &&
                        !showReportConfirm ? (
                            <div className="delete">
                                {showDeleteConfirm || deleting ? (
                                    <>
                                        {!deleting ? <span>Delete?</span> : <></>}
                                        <AsyncButton
                                            children={deleting ? "Deleting" : "Yes"}
                                            className="yes"
                                            setIsRunning={setDeleting}
                                            action={doDelete}
                                        />
                                        {!deleting ? (
                                            <button
                                                title="No, do not delete this message"
                                                className="no"
                                                onClick={ev => {
                                                    ev.preventDefault();
                                                    ev.stopPropagation();
                                                    setShowDeleteConfirm(false);
                                                }}
                                            >
                                                No
                                            </button>
                                        ) : (
                                                <></>
                                            )}
                                    </>
                                ) : (
                                        <button
                                            title="Delete this message"
                                            onClick={ev => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                setShowDeleteConfirm(true);
                                            }}
                                        >
                                            <i className="far fa-trash-alt"></i>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    )}
                            </div>
                        ) : (
                            <></>
                        )}
                </div>
                {msg.moderation ? (
                    <div className="moderation">
                        <Link className="button go-to" to={`/moderation/${msg.moderation.channel.id}`}>
                            <i className="fas fa-eye"></i> Go to moderation channel (
                            {msg.moderation.channel.name.substr(moderationNamePrefix.length)})
                        </Link>
                    </div>
                ) : (
                        <div className="reactions">
                            <div className="add-reaction">
                                {pickEmojiForMsgSid === msg.sid && emoji?.element ? (
                                    ReactDOM.createPortal(
                                        <EmojiPicker
                                            style={{
                                                zIndex: 999,
                                                position: "absolute",
                                                bottom: `${emojiButtonPosition?.bottom ?? 0}px`,
                                                left: `${emojiButtonPosition?.left ?? 0}px`,
                                            }}
                                            showPreview={false}
                                            useButton={false}
                                            title="Pick a reaction"
                                            onSelect={async ev => {
                                                setPickEmojiForMsgSid(null);
                                                const emojiId = ev.colons ?? ev.id;
                                                assert(emojiId);
                                                try {
                                                    assert((await mChat?.addReaction(msg.chatSid, msg.sid, emojiId))?.ok);
                                                } catch (e) {
                                                    console.error(e);
                                                    addError("Sorry, we could not add your reaction.");
                                                }
                                            }}
                                        />,
                                        emoji.element
                                    )
                                ) : (
                                        <></>
                                    )}
                                <button
                                    className="new"
                                    ref={emojiButton}
                                    onClick={ev => {
                                        getEmojiPickerOffset();
                                        toggleAddReaction(msg.sid);
                                    }}
                                >
                                    <i className="fas fa-smile-beam"></i>+
                            </button>
                            </div>
                            {Object.keys(msg.reactions).map(reaction => {
                                return (
                                    <Tooltip
                                        key={reaction}
                                        title={msg.reactions[reaction].names
                                            .reduce((acc, x) => `${acc}, ${x}`, "")
                                            .substr(2)}
                                        placement="top"
                                    >
                                        <button
                                            onClick={async ev => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                setPickEmojiForMsgSid(null);
                                                if (msg.reactions[reaction].ids.includes(userProfile.id)) {
                                                    try {
                                                        assert(
                                                            (await mChat?.removeReaction(msg.chatSid, msg.sid, reaction))
                                                                ?.ok
                                                        );
                                                    } catch (e) {
                                                        console.error(e);
                                                        addError("Sorry, we could not remove your reaction.");
                                                    }
                                                } else {
                                                    try {
                                                        assert(
                                                            (await mChat?.addReaction(msg.chatSid, msg.sid, reaction))?.ok
                                                        );
                                                    } catch (e) {
                                                        console.error(e);
                                                        addError("Sorry, we could not add your reaction.");
                                                    }
                                                }
                                            }}
                                        >
                                            <span>{doEmojify(reaction.replaceAll("-", "_"))}</span>
                                            <span>{msg.reactions[reaction].ids.length}</span>
                                        </button>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    )}
            </div>
        </div>
    );
}
