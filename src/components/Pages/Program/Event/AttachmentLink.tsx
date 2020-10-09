import { AttachmentType, ProgramItemAttachment } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { handleParseFileURLWeirdness } from "../../../../classes/Utils";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import ReactPlayer from "react-player";
import "./AttachmentLink.scss";

interface Props {
    attachment: ProgramItemAttachment;
}

export default function AttachmentLink(props: Props) {
    const conference = useConference();
    const [attachmentType, setAttachmentType] = useState<AttachmentType | null>(null);

    useSafeAsync(async () => await props.attachment.attachmentType, setAttachmentType, [props.attachment.attachmentType]);

    const onAttachmentTypeUpdated = useCallback(function _onAttachmentTypeUpdated(ev: DataUpdatedEventDetails<"AttachmentType">) {
        if (attachmentType && ev.object.id === attachmentType.id) {
            setAttachmentType(ev.object as AttachmentType);
        }
    }, [attachmentType]);

    const onAttachmentTypeDeleted = useCallback(function _onAttachmentTypeDeleted(ev: DataDeletedEventDetails<"AttachmentType">) {
        if (attachmentType && attachmentType.id === ev.objectId) {
            setAttachmentType(null)
        }
    }, [attachmentType]);

    useDataSubscription("AttachmentType", onAttachmentTypeUpdated, onAttachmentTypeDeleted, !attachmentType, conference);

    if (attachmentType) {
        const url
            = attachmentType.supportsFile
                ? handleParseFileURLWeirdness(props.attachment.file) ?? props.attachment.url
                : props.attachment.url;

        let displayAsLink = attachmentType.displayAsLink;
        if (!displayAsLink) {
            if (attachmentType.fileTypes.includes("image/png")
                || attachmentType.fileTypes.includes("image/jpeg")) {
                // Display as an image
                return <img className="attachment-link__image" src={url} alt={attachmentType.name} />;
            }
            else if (attachmentType.fileTypes.includes("video")) {
                // Display as an embedded video
                return <ReactPlayer className="video-player" width="" height="" playsinline controls={true} muted={false} volume={1} url={url} />;
            }
            else {
                displayAsLink = true;
            }
        }

        if (displayAsLink) {
            if (url) {
                // TODO: Display a file/link type icon?
                return <a href={url}>{attachmentType.name}</a>
            }
        }
    }
    else {
        return <LoadingSpinner />;
    }

    return <span>[An attachment has not been configured correctly.]</span>;
}
