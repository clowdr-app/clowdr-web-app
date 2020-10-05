import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChatDescriptor } from "../../../classes/Chat";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./AllChats.scss";

type Rendered1to1Chat = {
    dmExists: boolean,
    name: string,
    el: JSX.Element
};

export default function ChatView() {
    useHeading("All Chats");

    const conference = useConference();
    const mChat = useMaybeChat();
    const currentProfile = useUserProfile();
    const [allProfiles, setAllProfiles] = useState<Array<UserProfile> | null>(null);
    const [allTwilioChats, setAllChats] = useState<Array<ChatDescriptor> | null>(null);

    useSafeAsync(async () => UserProfile.getAll(conference.id), setAllProfiles, [conference.id]);
    useSafeAsync(async () => mChat ? mChat.listAllChats() : null, setAllChats, [mChat]);

    let profileEl;
    if (allProfiles) {
        const profileEls = allProfiles.flatMap(profile => {
            if (profile.id === currentProfile.id) {
                return [];
            }

            const dmChat = allTwilioChats?.find(x =>
                x.isDM &&
                x.friendlyName.includes(currentProfile.id) &&
                x.friendlyName.includes(profile.id));
            return [{
                dmExists: !!dmChat,
                name: profile.displayName,
                el: <li key={profile.id}>
                    {dmChat
                        ? <Link to={`/chat/${dmChat.sid}`}>{profile.displayName}</Link>
                        : <Link to={`/chat/new/${profile.id}`}>{profile.displayName}</Link>
                    }
                </li>
            }];
        });

        function sortDMs(x: Rendered1to1Chat, y: Rendered1to1Chat): number {
            if (x.dmExists) {
                if (y.dmExists) {
                    return x.name.localeCompare(y.name);
                }
                else {
                    return -1;
                }
            }
            else {
                if (y.dmExists) {
                    return 1;
                }
                else {
                    return x.name.localeCompare(y.name);
                }
            }
        }

        profileEl = <ul>{profileEls.sort(sortDMs).reduce<{
            split: boolean,
            els: Array<JSX.Element>
        }>((acc, x, idx) => {
            if (!x.dmExists) {
                if (!acc.split) {
                    if (idx > 0) {
                        return {
                            split: true,
                            els: [...acc.els, <hr key="dm-split" />, x.el]
                        };
                    }
                }

                return {
                    split: true,
                    els: [...acc.els, x.el]
                };
            }
            else {
                return {
                    split: false, els: [...acc.els, x.el]
                };
            }
        }, {
            split: false,
            els: []
        }).els}</ul>;
    }
    else {
        profileEl = <LoadingSpinner message="Loading users" />;
    }

    let othersEl;
    if (allTwilioChats) {
        const otherEls = allTwilioChats
            .filter(x => !x.isDM)
            .sort((x, y) => x.friendlyName.localeCompare(y.friendlyName))
            .map(x => <li key={x.sid}><Link to={`/chat/${x.sid}`}>{x.friendlyName}</Link></li>);
        othersEl = <ul>
            {otherEls}
        </ul>;
    }
    else {
        othersEl = <LoadingSpinner message="Loading all chats" />;
    }

    return <div className="all-chats">
        <div className="col">
            <h4>All users</h4>
            {profileEl}
        </div>
        <div className="col">
            <h4>All other chats</h4>
            {othersEl}
        </div>
    </div>;
}
