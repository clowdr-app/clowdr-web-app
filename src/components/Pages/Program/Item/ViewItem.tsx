import { ContentFeed, ProgramItem, ProgramItemAttachment, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import { HeadingState } from "../../../../contexts/HeadingContext";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import ChatFrame from "../../../Chat/ChatFrame/ChatFrame";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import AuthorsList from "../AuthorsList";
import AttachmentLink from "../Event/AttachmentLink";
import "./ViewItem.scss";

interface Props {
    item: ProgramItem | string;
    heading?: HeadingState;
    textChatFeedOnly?: boolean;
    showFeedName?: boolean;
}

export default function ViewItem(props: Props) {
    const conference = useConference();
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);
    const [attachments, setAttachments] = useState<Array<ProgramItemAttachment> | null>(null);

    useSafeAsync(
        async () => typeof props.item === "string"
            ? await ProgramItem.get(props.item, conference.id)
            : props.item,
        setItem,
        [props.item, conference.id]);
    useSafeAsync(async () => item ? await item.authorPerons : null, setAuthors, [item]);
    useSafeAsync(async () => item ? await item.attachments : null, setAttachments, [item]);
    useSafeAsync(async () => (await item?.feed) ?? null, setFeed, [item]);

    const [textChatId, setTextChatId] = useState<string | null>(null);
    useSafeAsync(async () => {
        const itemFeed = await item?.feed;
        if (itemFeed) {
            if (itemFeed.textChatId) {
                return itemFeed.textChatId;
            }
            else if (itemFeed.videoRoomId) {
                const itemVideoRoom = await itemFeed.videoRoom;
                const roomTextChat = await itemVideoRoom?.textChat;
                if (roomTextChat) {
                    return roomTextChat.id;
                }
            }
        }
        return null;
    }, setTextChatId, [item]);

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        const newAuthors = Array.from(authors ?? []);
        const idx = newAuthors.findIndex(x => x.id === ev.object.id);
        if (idx > -1) {
            newAuthors.splice(idx, 1, ev.object as ProgramPerson)
            setAuthors(newAuthors);
        }
    }, [authors]);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        if (authors) {
            setAuthors(authors.filter(x => x.id !== ev.objectId));
        }
    }, [authors]);

    const onAttachmentUpdated = useCallback(function _onAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
        const newAttachments = Array.from(attachments ?? []);
        const idx = newAttachments.findIndex(x => x.id === ev.object.id);
        if (idx > -1) {
            newAttachments.splice(idx, 1, ev.object as ProgramItemAttachment)
            setAttachments(newAttachments);
        }
    }, [attachments]);

    const onAttachmentDeleted = useCallback(function _onAttachmentDeleted(ev: DataDeletedEventDetails<"ProgramItemAttachment">) {
        if (attachments) {
            setAttachments(attachments.filter(x => x.id !== ev.objectId));
        }
    }, [attachments]);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        if (feed && ev.object.id === feed.id) {
            setFeed(ev.object as ContentFeed);
        }
    }, [feed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (feed && ev.objectId === feed.id) {
            setFeed(null);
        }
    }, [feed]);

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);
    useDataSubscription("ProgramItemAttachment", onAttachmentUpdated, onAttachmentDeleted, !attachments, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    useHeading(props.heading ?? item?.title ?? "Program Item");

    let attachmentEls: Array<JSX.Element> = [];

    if (attachments) {
        attachmentEls = attachments.map(x => <AttachmentLink key={x.id} attachment={x} />);
    }

    // TODO: posterImage?
    // TODO: Show all events where this item is presented (optional: Switch off in ViewEvent)

    return <div className="program-item">
        {item && authors
            ? <>
                {props.textChatFeedOnly ?
                    (textChatId
                        ? <>
                            <div className="content-feed">
                                <ChatFrame chatId={textChatId} />
                            </div>
                            <hr />
                        </>
                        : <></>
                    )
                    : (feed
                        ? <>
                            {props.showFeedName ? <h2>{feed.name}</h2> : <></>}
                            <ViewContentFeed feed={feed} hideZoomOrVideo={false} />
                            <hr />
                        </>
                        : <></>)}
                <div className="info">
                    <ReactMarkdown
                        linkTarget="_blank"
                        escapeHtml={true}
                        className="abstract"
                    >
                        {item.abstract}
                    </ReactMarkdown>
                    <AuthorsList authors={authors} />
                </div>
                {attachmentEls.length > 0
                    ? <>
                        <hr />
                        <div className="attachments">
                            <h3>Attachments</h3>
                            {attachmentEls}
                        </div>
                    </>
                    : <></>}
            </>
            : <LoadingSpinner />}
    </div>;
}
