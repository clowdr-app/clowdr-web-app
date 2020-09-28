import { AttachmentType, ProgramItemAttachment } from "clowdr-db-schema/src/classes/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";

interface Props {
    attachment: ProgramItemAttachment;
}

export default function AttachmentLink(props: Props) {
    const conference = useConference();
    const [attachmentType, setAttachmentType] = useState<AttachmentType | null>(null);

    useSafeAsync(async () => await props.attachment.attachmentType, setAttachmentType, [props.attachment.attachmentType]);

    const onAttachmentTypeUpdated = useCallback(function _onAttachmentTypeUpdated(ev: DataUpdatedEventDetails<"AttachmentType">) {
        if (!attachmentType || ev.object.id === attachmentType.id) {
            setAttachmentType(ev.object as AttachmentType);
        }
    }, [attachmentType]);

    const onAttachmentTypeDeleted = useCallback(function _onAttachmentTypeDeleted(ev: DataDeletedEventDetails<"AttachmentType">) {
        setAttachmentType(null)
    }, []);

    useDataSubscription("AttachmentType", onAttachmentTypeUpdated, onAttachmentTypeDeleted, !attachmentType, conference);

    // TODO: Render the link with a file-/link-type icon and a name

    return <>{attachmentType ? props.attachment.url : <LoadingSpinner />}</>;
}
