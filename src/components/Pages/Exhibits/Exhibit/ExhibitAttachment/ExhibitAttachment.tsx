import { AttachmentType, ProgramItemAttachment } from "@clowdr-app/clowdr-db-schema";
import {
    DataUpdatedEventDetails,
    DataDeletedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import useConference from "../../../../../hooks/useConference";
import useDataSubscription from "../../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../../hooks/useSafeAsync";
import AttachmentLink from "../../../Program/Event/AttachmentLink";
import "./ExhibitAttachment.scss";

interface Props {
    attachments?: ProgramItemAttachment[];
}

export default function ExhibitAttachment(props: Props) {
    const conference = useConference();
    const [attachmentTypes, setAttachmentTypes] = useState<AttachmentType[] | undefined>();
    const [bestAttachment, setBestAttachment] = useState<ProgramItemAttachment | undefined>();

    useSafeAsync(
        async () => await AttachmentType.getAll(conference.id),
        setAttachmentTypes,
        [conference],
        "ExhibitAttachment:setAttachmentTypes"
    );

    const onAttachmentTypeUpdated = useCallback(
        function _onAttachmentTypeUpdated(ev: DataUpdatedEventDetails<"AttachmentType">) {
            const newAttachmentTypes = Array.from(attachmentTypes ?? []);
            let updated = false;
            for (const object of ev.objects) {
                const idx = newAttachmentTypes.findIndex(x => x.id === object.id);
                if (idx > -1) {
                    newAttachmentTypes.splice(idx, 1, object as AttachmentType);
                    updated = true;
                }
            }
            if (updated) {
                setAttachmentTypes(newAttachmentTypes);
            }
        },
        [attachmentTypes]
    );

    const onAttachmentTypeDeleted = useCallback(
        function _onAttachmentTypeDeleted(ev: DataDeletedEventDetails<"AttachmentType">) {
            if (attachmentTypes) {
                setAttachmentTypes(attachmentTypes.filter(x => x.id !== ev.objectId));
            }
        },
        [attachmentTypes]
    );

    useDataSubscription(
        "AttachmentType",
        onAttachmentTypeUpdated,
        onAttachmentTypeDeleted,
        !attachmentTypes,
        conference
    );

    useEffect(() => {
        if (!props.attachments) {
            setBestAttachment(undefined);
            return;
        }

        const videoTypeIds = attachmentTypes
            ?.filter(attachmentType => attachmentType.name === "Video")
            .map(attachmentType => attachmentType.id);
        const posterTypeIds = attachmentTypes
            ?.filter(attachmentType => attachmentType.name === "Poster")
            .map(attachmentType => attachmentType.id);
        const paperTypeIds = attachmentTypes
            ?.filter(attachmentType => attachmentType.name === "Paper")
            .map(attachmentType => attachmentType.id);

        const posterAttachments = props.attachments.filter(attachment =>
            posterTypeIds?.includes(attachment.attachmentTypeId)
        );
        if (posterAttachments.length > 0) {
            setBestAttachment(posterAttachments[0]);
            return;
        }

        const videoAttachments = props.attachments.filter(attachment =>
            videoTypeIds?.includes(attachment.attachmentTypeId)
        );
        if (videoAttachments.length > 0) {
            setBestAttachment(videoAttachments[0]);
            return;
        }

        const paperAttachments = props.attachments.filter(attachment =>
            paperTypeIds?.includes(attachment.attachmentTypeId)
        );
        if (paperAttachments.length > 0) {
            setBestAttachment(paperAttachments[0]);
            return;
        }

        setBestAttachment(undefined);
    }, [attachmentTypes, props.attachments]);

    return (
        <>
            {" "}
            {bestAttachment ? (
                <div className="exhibit-attachment">
                    <AttachmentLink key={bestAttachment.id} attachment={bestAttachment} />
                </div>
            ) : (
                <></>
            )}
        </>
    );
}
