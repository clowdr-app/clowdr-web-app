import { AttachmentType, ProgramItem, ProgramItemAttachment } from "@clowdr-app/clowdr-db-schema";
import Parse from "parse";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { addError } from "../../../../../classes/Notifications/Notifications";
import useConference from "../../../../../hooks/useConference";
import useSafeAsync from "../../../../../hooks/useSafeAsync";
import "./AttachmentUpload.scss";

interface Props {
    programItem: ProgramItem;
}

type FormData =
    | {
          type: "url";
          url: string;
      }
    | {
          type: "file";
      };

export default function AttachmentUpload(props: Props) {
    const conference = useConference();

    const [attachmentTypes, setAttachmentTypes] = useState<AttachmentType[] | null>(null);
    const [attachmentType, setAttachmentType] = useState<AttachmentType | null>(null);
    const { handleSubmit, register, formState, reset } = useForm<FormData>({ mode: "all" });
    const fileRef = useRef<HTMLInputElement>(null);

    useSafeAsync(
        () => AttachmentType.getAll(conference.id),
        setAttachmentTypes,
        [conference.id],
        "AttachmentUpload:AttachmentType.getAll"
    );

    const typeSelector = (
        <select
            value={attachmentType?.id ?? ""}
            onChange={ev => {
                setAttachmentType(attachmentTypes?.find(x => x.id === ev.target.value) ?? null);
            }}
        >
            <option key={null} value="">
                Select an attachment type
            </option>
            {attachmentTypes?.map(t => (
                <option key={t.id} value={t.id}>
                    {t.name}
                </option>
            ))}
        </select>
    );

    const uploadFile = useCallback(
        async (file: File) => {
            if (file && attachmentType) {
                const attachmentId = await Parse.Cloud.run("itemAttachment-create", {
                    attachmentType: attachmentType.id,
                    conference: conference.id,
                    programItem: props.programItem.id,
                });

                const data = new Uint8Array(await file.arrayBuffer());
                const parseFile = new Parse.File("attachment-" + props.programItem.id + "-" + file.name, [...data]);
                await parseFile.save();

                const attachment = await ProgramItemAttachment.get(attachmentId, conference.id);
                if (attachment) {
                    attachment.file = parseFile;
                    await attachment.save();
                }
            }
        },
        [attachmentType, conference.id, props.programItem.id]
    );

    const onSubmit = useCallback(
        async (data: FormData) => {
            if (attachmentType) {
                if (data.type === "url") {
                    await Parse.Cloud.run("itemAttachment-create", {
                        attachmentType: attachmentType.id,
                        conference: conference.id,
                        programItem: props.programItem.id,
                        url: data.url,
                    });
                    reset();
                } else if (data.type === "file") {
                    if (fileRef.current && fileRef.current.files && fileRef.current.files.length > 0) {
                        await uploadFile(fileRef.current.files[0]);
                        reset();
                    } else {
                        addError("No file selected");
                    }
                }
            }
        },
        [attachmentType, conference.id, props.programItem.id, reset, uploadFile]
    );

    const form = useMemo(() => {
        if (attachmentType === null) {
            return <></>;
        } else if (attachmentType.supportsFile) {
            return (
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input name="type" type="text" value="file" readOnly hidden ref={register} />
                    <label htmlFor="photo">File</label>
                    <input
                        name="photo"
                        id="photo"
                        type="file"
                        className="photo-input"
                        disabled={formState.isSubmitting}
                        ref={fileRef}
                    />
                    <div className="submit-container">
                        <input type="submit" disabled={formState.isSubmitting} value="Upload" />
                    </div>
                </form>
            );
        } else {
            return (
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input name="type" type="text" value="url" readOnly hidden ref={register} />
                    <label htmlFor="url">URL</label>
                    <input name="url" type="url" disabled={formState.isSubmitting} ref={register({ required: true })} />
                    <div className="submit-container">
                        <input type="submit" disabled={formState.isSubmitting || !formState.isValid} value="Add" />
                    </div>
                </form>
            );
        }
    }, [attachmentType, formState.isSubmitting, formState.isValid, handleSubmit, onSubmit, register]);

    return (
        <div className="attachment-upload">
            <p>
                <i className="fas fa-paperclip"></i> Upload attachment
            </p>
            {typeSelector}
            {form}
        </div>
    );
}
