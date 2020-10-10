import React, { useState } from "react";
import "./Message.scss";

// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import FlairChip from "../../Profile/FlairChip/FlairChip";
import ReactMarkdown from "react-markdown";
import { Conference, Flair } from "@clowdr-app/clowdr-db-schema";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";

import 'emoji-mart/css/emoji-mart.css';
import { Picker as EmojiPicker } from 'emoji-mart';
import { emojify } from "react-emojione";
import { Tooltip } from "@material-ui/core";
import { Link, useHistory } from "react-router-dom";
import assert from "assert";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useUserProfile from "../../../hooks/useUserProfile";
import IMessage from "../../../classes/Chat/IMessage";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import AsyncButton from "../../AsyncButton/AsyncButton";
import IMember from "../../../classes/Chat/IMember";

export type RenderedMessage = {
    chatSid: string;
    chatName?: string;
    sid: string;
    body: string;
    profileId: string | null;
    profileName: string;
    profilePhotoUrl: string | null;
    profileFlair: Flair | undefined;
    time: string;
    index: number;
    isDM?: boolean;
    reactions: {
        [reaction: string]: {
            ids: Array<string>;
            names: Array<string>
        }
    }
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
    const _member: "system" | IMember = await message.getMember();
    let memberProfileId: string | undefined;
    let profile: UserProfile | null | undefined;
    let member: "System" | "Unknown" | IMember;
    if (typeof _member !== "string") {
        memberProfileId = _member.profileId;
        profile = await UserProfile.get(memberProfileId, conf.id);
        if (!profile) {
            member = "Unknown";
        }
        else {
            member = _member;
        }
    }
    else {
        member = "System";
    }
    const time = message.timestamp;
    const now = Date.now();
    const isOver24HrOld = (now - time.getTime()) > (1000 * 60 * 60 * 24);
    const flair = await profile?.primaryFlair;
    const profilePhotoUrl = handleParseFileURLWeirdness(profile?.profilePhoto);
    const reactorIds = (message.attributes as any)?.reactions ?? {};
    const reactions: { [reaction: string]: { ids: Array<string>; names: Array<string> } } = {};
    for (const reaction in reactorIds) {
        if (reaction in reactorIds) {
            reactions[reaction] = {
                ids: reactorIds[reaction],
                names: await Promise.all(reactorIds[reaction].map(async (aProfileId: string) => {
                    const aProfile = await UserProfile.get(aProfileId, conf.id);
                    return aProfile?.id === userProfile.id ? "You" : aProfile?.displayName ?? `<Unknown>`;
                }))
            };
        }
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
        time: (isOver24HrOld ? time.toLocaleDateString() : "") + time.toLocaleTimeString().split(":").slice(0, 2).join(":"),
        index: message.index,
        reactions
    };
    return result;
}

export default function Message(props: {
    msg: RenderedMessage;
    hideReportButton?: boolean;
}): JSX.Element {
    const history = useHistory();
    const mChat = useMaybeChat();
    const userProfile = useUserProfile();
    const msg = props.msg;
    const [pickEmojiForMsgSid, setPickEmojiForMsgSid] = useState<string | null>(null);
    const [showReportConfirm, setShowReportConfirm] = useState<boolean>(false);
    const [reporting, setReporting] = useState<boolean>(false);

    function toggleAddReaction(msgSid: string) {
        if (pickEmojiForMsgSid) {
            setPickEmojiForMsgSid(null);
        }
        else {
            setPickEmojiForMsgSid(msgSid);
        }
    }

    const doEmojify = (val: any) => <>{emojify(val, { output: 'unicode' })}</>;
    const renderEmoji = (text: any) => doEmojify(text.value);

    async function doReport() {
        if (!mChat) {
            const errMsg = "Sorry, we were unable to report this message. The chat service is currently unavailable.";
            addError(errMsg);
            throw new Error(errMsg);
        }
        try {
            const newModChat = await mChat.createModerationChat([], `${msg.chatSid}:${msg.sid}`);
            if (!newModChat) {
                const errMsg = "Sorry, we were unable to report this message. It may have been removed from the channel but cached in your browser.";
                addError(errMsg);
                throw new Error(errMsg);
            }
            history.push(`/moderation/${newModChat.id}`);
        }
        catch (e) {
            const errMsg = `Sorry, we were unable to report this message. ${e}.`;
            addError(errMsg);
            throw new Error(errMsg);
        }
    }

    return <div className={`chat-message${showReportConfirm ? " highlight" : ""}`} key={msg.index}>
        <div className="profile" onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            if (msg.profileId) {
                history.push(`/profile/${msg.profileId}`);
            }
            else {
                addNotification("User is not known - they may have been deleted.");
            }
        }}>
            {msg.profilePhotoUrl
                ? <img src={msg.profilePhotoUrl} alt={`${msg.profileName}'s avatar`} />
                : <img src={defaultProfilePic} alt="default avatar" />
            }
            {msg.profileFlair ? <FlairChip flair={msg.profileFlair} small /> : <></>}
        </div>
        <div className="content">
            <div className="content-inner">
                {msg.chatName
                    ? <div className="goto-overlay">
                        <Link className="button" to={`/chat/${msg.chatSid}`}>Go to chat</Link>
                    </div>
                    : ""}
                <div className="name">{msg.chatName ? (msg.isDM ? `DM: ` : `#${msg.chatName} / `) : ""}{msg.profileName ?? "<Unknown>"}</div>
                <div className="time">{msg.time}</div>
                <ReactMarkdown
                    className="body"
                    renderers={{
                        text: renderEmoji
                    }}
                >
                    {msg.body}
                </ReactMarkdown>
                {!props.hideReportButton
                    ? <div className="report">
                        {showReportConfirm || reporting
                            ? <>
                                {!reporting ? <span>Report?</span> : <></>}
                                <AsyncButton
                                    content={reporting ? "Reporting" : "Yes"}
                                    className="yes"
                                    setIsRunning={setReporting}
                                    action={doReport}
                                />
                                {!reporting
                                    ? <button
                                        title="No, do not report this message"
                                        className="no"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            setShowReportConfirm(false);
                                        }}
                                    >
                                        No
                            </button>
                                    : <></>
                                }
                            </>
                            : <button
                                title="Report this message"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    setShowReportConfirm(true);
                                }}
                            >
                                <i className="far fa-flag"></i>
                                <i className="fas fa-flag"></i>
                            </button>
                        }
                    </div>
                    : <></>
                }
            </div>
            <div className="reactions">
                <div className="add-reaction">
                    {pickEmojiForMsgSid === msg.sid
                        ? <EmojiPicker
                            showPreview={false}
                            useButton={false}
                            title="Pick a reaction"
                            onSelect={async (ev) => {
                                setPickEmojiForMsgSid(null);
                                const emojiId = ev.colons ?? ev.id;
                                assert(emojiId);
                                try {
                                    assert((await mChat?.addReaction(msg.chatSid, msg.sid, emojiId))?.ok);
                                }
                                catch (e) {
                                    console.error(e);
                                    addError("Sorry, we could not add your reaction.");
                                }
                            }}
                        />
                        : <></>}
                    <button
                        className="new"
                        onClick={(ev) => toggleAddReaction(msg.sid)}
                    >
                        <i className="fas fa-smile-beam"></i>+
                    </button>
                </div>
                {Object.keys(msg.reactions).map(reaction => {
                    return <Tooltip
                        key={reaction}
                        title={msg.reactions[reaction].names.reduce((acc, x) => `${acc}, ${x}`, "").substr(2)}
                        placement="top"
                    >
                        <button
                            onClick={async (ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setPickEmojiForMsgSid(null);
                                if (msg.reactions[reaction].ids.includes(userProfile.id)) {
                                    try {
                                        assert((await mChat?.removeReaction(msg.chatSid, msg.sid, reaction))?.ok);
                                    }
                                    catch (e) {
                                        console.error(e);
                                        addError("Sorry, we could not remove your reaction.");
                                    }
                                }
                                else {
                                    try {
                                        assert((await mChat?.addReaction(msg.chatSid, msg.sid, reaction))?.ok);
                                    }
                                    catch (e) {
                                        console.error(e);
                                        addError("Sorry, we could not add your reaction.");
                                    }
                                }
                            }}
                        >
                            <span>{doEmojify(reaction)}</span>
                            <span>{msg.reactions[reaction].ids.length}</span>
                        </button>
                    </Tooltip>;
                })}
            </div>
        </div>
    </div>;
}
