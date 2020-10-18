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
    showVideo?: boolean;
}

export default function AttachmentLink(props: Props) {
    const conference = useConference();
    const [attachmentType, setAttachmentType] = useState<AttachmentType | null>(null);
    const [showVideo, setShowVideo] = useState<boolean>(!!props.showVideo);

    useSafeAsync(async () => await props.attachment.attachmentType, setAttachmentType, [props.attachment.attachmentType]);

    const onAttachmentTypeUpdated = useCallback(function _onAttachmentTypeUpdated(ev: DataUpdatedEventDetails<"AttachmentType">) {
        for (const object of ev.objects) {
            if (attachmentType && object.id === attachmentType.id) {
                setAttachmentType(object as AttachmentType);
            }
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
                return showVideo
                    ? <ReactPlayer className="video-player" width="" height="" playsinline controls={true} muted={false} volume={1} url={url} />
                    : <button onClick={() => { setShowVideo(true); }}>Reveal Video</button>;
            }
            else {
                displayAsLink = true;
            }
        }

        if (displayAsLink) {
            if (url) {
                // TODO: Display a file/link type icon?
                return <a className="button" href={url} target="_blank" rel="noopener noreferrer">Visit Link</a>
            }
        }
    }
    else {
        return <LoadingSpinner />;
    }

    return <span>[An attachment has not been configured correctly.]</span>;
}
