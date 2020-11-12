import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { addError } from "../../../../classes/Notifications/Notifications";
import { ReactMarkdownCustomised } from "../../../../classes/Utils";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import "./TextItem.scss";

interface Props {
    editing: boolean;
    markdown: string;
    updateText(markdown: string): Promise<void>;
    sponsorColour: string;
}

interface FormData {
    markdown: string;
}

type State = "notpending" | "pending";

export default function TextItem(props: Props) {
    const { register, handleSubmit, errors } = useForm<FormData>();
    const [state, setState] = useState<State>("notpending");

    async function onSubmit(data: FormData) {
        setState("pending");

        try {
            await props.updateText(data.markdown);
        } catch (e) {
            addError(`Failed to edit text. Error ${e}`, 20000);
        } finally {
            setState("notpending");
        }
    }

    const form = (
        <form className="edit-text-item" onSubmit={handleSubmit(onSubmit)}>
            <label htmlFor="markdown">Text</label>
            <p>Tip: you can use markdown formatting here.</p>
            <textarea
                name="markdown"
                placeholder="# Our careers"
                disabled={state === "pending"}
                defaultValue={props.markdown}
                ref={register({ required: true })}
            />
            {errors.markdown && <p>Enter some text</p>}

            <div className="form-buttons">
                <AsyncButton children="Save" action={handleSubmit(onSubmit)} />
            </div>
        </form>
    );

    return (
        <div className="text-item">
            {props.editing ? (
                form
            ) : (
                    <ReactMarkdownCustomised
                        linkColour={props.sponsorColour}
                    >
                        {props.markdown}
                    </ReactMarkdownCustomised>
            )}
        </div>
    );
}
