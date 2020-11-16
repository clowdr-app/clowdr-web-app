import { ContentFeed, ProgramItem, ProgramItemAttachment, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import {
    DataUpdatedEventDetails,
    DataDeletedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import SplitterLayout from "react-splitter-layout";
import { ReactMarkdownCustomised } from "../../../../classes/Utils";
import { ActionButton, HeadingState } from "../../../../contexts/HeadingContext";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useUserProfile from "../../../../hooks/useUserProfile";
import useUserRoles from "../../../../hooks/useUserRoles";
import ChatFrame from "../../../Chat/ChatFrame/ChatFrame";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import AuthorsList from "../AuthorsList";
import AttachmentLink from "../Event/AttachmentLink";
import AttachmentUpload from "./Attachment/AttachmentUpload";
import "./ViewItem.scss";

interface Props {
    item: ProgramItem | string;
    heading?: HeadingState;
    textChatFeedOnly?: boolean;
    showFeedName?: boolean;
    videoRoomShutdownWarning?: JSX.Element;
    children?: JSX.Element;
}

export default function ViewItem(props: Props) {
    const conference = useConference();
    const profile = useUserProfile();
    const { isAdmin } = useUserRoles();
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [feed, setFeed] = useState<ContentFeed | "not-present" | null>(null);
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);
    const [attachments, setAttachments] = useState<Array<ProgramItemAttachment> | null>(null);
    const [canUploadAttachments, setCanUploadAttachments] = useState<boolean>(false);
    const [size, setSize] = useState(30);

    useSafeAsync(
        async () => (typeof props.item === "string" ? await ProgramItem.get(props.item, conference.id) : props.item),
        setItem,
        [props.item, conference.id],
        "ViewItem:setItem"
    );
    useSafeAsync(async () => (item ? await item.authorPerons : null), setAuthors, [item], "ViewItem:setAuthors");
    useSafeAsync(async () => (item ? await item.attachments : null), setAttachments, [item], "ViewItem:setAttachments");
    useSafeAsync(async () => (item ? await item.feed ?? "not-present" : null), setFeed, [item], "ViewItem:setFeed");

    useEffect(() => {
        setCanUploadAttachments(authors?.some(author => author.profileId && author.profileId === profile.id) ?? false);
    }, [authors, profile.id]);

    const [textChatId, setTextChatId] = useState<string | null>(null);
    useSafeAsync(
        async () => {
            const itemFeed = feed;
            if (itemFeed && itemFeed !== "not-present") {
                if (itemFeed.textChatId) {
                    return itemFeed.textChatId;
                } else if (itemFeed.videoRoomId) {
                    const itemVideoRoom = await itemFeed.videoRoom;
                    const roomTextChat = await itemVideoRoom?.textChat;
                    if (roomTextChat) {
                        return roomTextChat.id;
                    }
                }
            }
            return null;
        },
        setTextChatId,
        [feed],
        "ViewItem:setTextChatId"
    );

    const onAuthorUpdated = useCallback(
        function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
            const newAuthors = Array.from(authors ?? []);
            let updated = false;
            for (const object of ev.objects) {
                const idx = newAuthors.findIndex(x => x.id === object.id);
                if (idx > -1) {
                    newAuthors.splice(idx, 1, object as ProgramPerson);
                    updated = true;
                }
            }
            if (updated) {
                setAuthors(newAuthors);
            }
        },
        [authors]
    );

    const onAuthorDeleted = useCallback(
        function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
            if (authors) {
                setAuthors(authors.filter(x => x.id !== ev.objectId));
            }
        },
        [authors]
    );

    const onAttachmentUpdated = useCallback(
        function _onAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
            const newAttachments = Array.from(attachments ?? []);
            let updated = false;
            for (const object of ev.objects) {
                const attachment = object as ProgramItemAttachment;
                if (item && attachment.programItemId === item.id) {
                    const idx = newAttachments.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newAttachments.push(attachment);
                        updated = true;
                    } else {
                        newAttachments.splice(idx, 1, attachment);
                        updated = true;
                    }
                }
            }
            if (updated) {
                setAttachments(newAttachments);
            }
        },
        [attachments, item]
    );

    const onAttachmentDeleted = useCallback(
        function _onAttachmentDeleted(ev: DataDeletedEventDetails<"ProgramItemAttachment">) {
            if (attachments) {
                setAttachments(attachments.filter(x => x.id !== ev.objectId));
            }
        },
        [attachments]
    );

    const onContentFeedUpdated = useCallback(
        function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
            for (const object of ev.objects) {
                if (feed && feed !== "not-present" && object.id === feed.id) {
                    setFeed(object as ContentFeed);
                }
            }
        },
        [feed]
    );

    const onContentFeedDeleted = useCallback(
        function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
            if (feed && feed !== "not-present" && ev.objectId === feed.id) {
                setFeed(null);
            }
        },
        [feed]
    );

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);
    useDataSubscription("ProgramItemAttachment", onAttachmentUpdated, onAttachmentDeleted, !attachments, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    const buttons: Array<ActionButton> = [];
    if (item) {
        buttons.push({
            label: "Track",
            action: `/track/${item.trackId}`,
            icon: <i className="fas fa-eye"></i>,
            ariaLabel: "View the track for this item"
        });
    }
    useHeading(props.heading ?? {
        title: item?.title ?? "Program Item",
        buttons
    });

    let attachmentEls: Array<JSX.Element> = [];

    if (attachments) {
        attachmentEls = attachments.map(x => (
            <div className="attachment-items__item" key={x.id}>
                {(canUploadAttachments || isAdmin) && (
                    <button
                        className="attachment-items__item__delete"
                        aria-label="delete attachment"
                        onClick={async () => {
                            await x.delete();
                        }}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                )}
                <AttachmentLink key={x.id} attachment={x} showVideo={true} />
            </div>
        ));
    }

    // TODO: posterImage?
    // TODO: Show all events where this item is presented (optional: Switch off in ViewEvent)

    const contents = item && authors ? (
        <div>
            {props.children}
            {!props.textChatFeedOnly && feed && feed !== "not-present"
                ? (
                    <>
                        {props.showFeedName ? <h2>{feed.name}</h2> : <></>}
                        {feed.videoRoomId && props.videoRoomShutdownWarning ? <p>{props.videoRoomShutdownWarning}</p> : <></>}
                        <ViewContentFeed feed={feed} hideTextChat={true} />
                    </>
                ) : <></>
            }
            <div className="info">
                <ReactMarkdownCustomised className="abstract">
                    {item.abstract}
                </ReactMarkdownCustomised>
                <AuthorsList authors={authors} idOrdering={item.authors} />
            </div>
            <div className="attachments">
                <h3>Attachments</h3>
                <div className="attachment-items">
                    {attachmentEls.length > 0 ? attachmentEls : <p>No attachments uploaded.</p>}
                </div>
                {(canUploadAttachments || isAdmin) && (
                    <div className="attachments__upload">
                        <AttachmentUpload programItem={item} />
                    </div>
                )}
            </div>
        </div>
    ) : <></>;

    const outputEl = (
        <div className="program-item">
            {textChatId
                ? (
                    <SplitterLayout
                        vertical={true}
                        percentage={true}
                        ref={component => {
                            component?.setState({ secondaryPaneSize: size });
                        }}
                        onSecondaryPaneSizeChange={newSize => setSize(newSize)}
                    >
                        <div className="split top-split">
                            {contents}
                            <button onClick={() => setSize(100)}>&#9650;</button>
                        </div>
                        <div className="split bottom-split">
                            <button onClick={() => setSize(0)}>&#9660;</button>
                            <div className="content-feed">
                                <ChatFrame chatId={textChatId} />
                            </div>
                        </div>
                    </SplitterLayout>
                )
                : contents
            }
        </div>
    );

    return item && authors && feed ? outputEl : <LoadingSpinner />;
}
