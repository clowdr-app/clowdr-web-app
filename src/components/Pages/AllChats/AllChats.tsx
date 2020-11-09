import { Flair } from "@clowdr-app/clowdr-db-schema";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";
import assert from "assert";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useChats from "../../../hooks/useChats";
import useUserProfile from "../../../hooks/useUserProfile";
import useUserProfiles from "../../../hooks/useUserProfiles";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import FlairChip from "../../Profile/FlairChip/FlairChip";
import "./AllChats.scss";
import useOnlineStatus from "../../../hooks/useOnlineStatus";

interface DMData {
    online: boolean;
    profileLink: string;
    flairs: Flair[];
}

export default function AllChats() {
    useHeading("All Chats");

    const currentProfile = useUserProfile();
    const userProfiles = useUserProfiles();
    const allChats = useChats();
    const onlineStatus = useOnlineStatus(userProfiles ?? []);

    const [dmChatItems, setDmChatItems] = useState<ColumnItem<DMData>[] | undefined>();
    const [allOtherUserItems, setAllOtherUserItems] = useState<ColumnItem<DMData>[] | undefined>();
    const [allOtherChatsItems, setAllOtherChatsItems] = useState<ColumnItem[] | undefined>();

    useSafeAsync(
        async () => {
            if (!allChats || !userProfiles || !currentProfile) {
                return undefined;
            }
            const items = allChats
                ?.filter(
                    chat =>
                        chat.isDM &&
                        (chat.member1.profileId === currentProfile.id || chat.member2.profileId === currentProfile.id)
                )
                ?.map(async chat => {
                    assert(chat.isDM);
                    const otherProfileId = [chat.member1.profileId, chat.member2.profileId].find(
                        profileId => profileId !== currentProfile.id
                    );
                    const otherProfile = userProfiles?.find(profile => profile.id === otherProfileId);
                    const online = otherProfileId ? onlineStatus?.get(otherProfileId) ?? false : false;
                    const profileLink = `/profile/${otherProfileId}`;
                    const flairs = (await otherProfile?.flairObjects) ?? [];
                    return otherProfile
                        ? {
                              text: otherProfile.displayName,
                              link: `/chat/${chat.id}`,
                              key: otherProfile.id,
                              renderData: { online, profileLink, flairs },
                          }
                        : null;
                });
            return removeNull(await Promise.all(items ?? []));
        },
        setDmChatItems,
        [allChats, userProfiles, currentProfile.id, onlineStatus],
        "AllChats:setDmChatItems"
    );

    useSafeAsync(
        async () => {
            if (!allChats || !userProfiles || !currentProfile) {
                return undefined;
            }
            const items = userProfiles
                ?.filter(profile => profile.id !== currentProfile.id)
                ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
                ?.map(async profile => {
                    const online = onlineStatus?.get(profile.id) ?? false;
                    const profileLink = `/profile/${profile.id}`;
                    const flairs = await profile.flairObjects;
                    return {
                        text: profile.displayName,
                        link: `/chat/new/${profile.id}`,
                        key: profile.id,
                        renderData: { online, profileLink, flairs },
                    };
                });
            return await Promise.all(items ?? []);
        },
        setAllOtherUserItems,
        [allChats, userProfiles, currentProfile.id, onlineStatus],
        "AllChats:setAllOtherUserItems"
    );

    useEffect(() => {
        if (!allChats) {
            return;
        }
        const items =
            allChats
                ?.filter(chat => !chat.isDM)
                ?.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName))
                ?.map(chat => {
                    return {
                        text: chat.friendlyName,
                        link: `/chat/${chat.id}`,
                        key: chat.id,
                        renderData: undefined,
                    };
                }) ?? [];
        setAllOtherChatsItems(items);
    }, [allChats]);

    function dmRenderer(item: ColumnItem<DMData>): JSX.Element {
        const data = item.renderData;
        return (
            <>
                <Link to={item.link ?? "#"} className="user-info">
                    <i
                        className={`fa${data.online ? "s" : "r"} fa-circle ${
                            data.online ? "online" : ""
                        } online-indicator`}
                    ></i>
                    {item.text}
                    <div className="flair-box">
                        {data.flairs.map((flair, i) => (
                            <div className="flair-container" key={i}>
                                <FlairChip flair={flair} />
                            </div>
                        ))}
                    </div>
                </Link>
            </>
        );
    }

    function userRenderer(item: ColumnItem<DMData>): JSX.Element {
        const data = item.renderData;
        return (
            <>
                <div className="chat-item">
                    <Link to={data.profileLink} className="user-info">
                        <i
                            className={`fa${data.online ? "s" : "r"} fa-circle ${
                                data.online ? "online" : ""
                            } online-indicator`}
                        ></i>
                        {item.text}
                        <div className="flair-box">
                            {data.flairs.map((flair, i) => (
                                <div className="flair-container" key={i}>
                                    <FlairChip flair={flair} />
                                </div>
                            ))}
                        </div>
                    </Link>
                    <Link to={item.link ?? "#"} title="Send message" aria-label="Send message" className="send-message">
                        <i className={`far fa-envelope-open fa-lg`}></i>
                    </Link>
                </div>
            </>
        );
    }

    function isOnlineSorter(x: ColumnItem<DMData>, y: ColumnItem<DMData>) {
        if (x.renderData.online) {
            if (y.renderData.online) {
                return x.text.localeCompare(y.text);
            } else {
                return -1;
            }
        } else {
            if (y.renderData.online) {
                return 1;
            } else {
                return x.text.localeCompare(y.text);
            }
        }
    }

    function groupChatRenderer(item: ColumnItem): JSX.Element {
        return (
            <>
                <Link to={item.link ?? "#"} className="user-info">
                    {item.text}
                </Link>
            </>
        );
    }

    return (
        <Columns className="all-chats">
            <>
                <Column
                    className="col"
                    items={dmChatItems}
                    itemRenderer={{ render: dmRenderer }}
                    loadingMessage="Loading direct messages"
                    emptyMessage="No direct messages."
                >
                    <h2>Direct messages</h2>
                </Column>
                <Column
                    className="col"
                    items={allOtherChatsItems}
                    itemRenderer={{ render: groupChatRenderer }}
                    loadingMessage="Loading chats"
                >
                    <h2>Group chats</h2>
                </Column>
                <Column
                    className="col"
                    items={allOtherUserItems}
                    sort={isOnlineSorter}
                    itemRenderer={{ render: userRenderer }}
                    loadingMessage="Loading users"
                    emptyMessage="No other users available."
                >
                    <h2>
                        Users{" "}
                        {allOtherUserItems && <>({allOtherUserItems.filter(x => x.renderData.online).length} online)</>}
                    </h2>
                </Column>
            </>
        </Columns>
    );
}
