import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { addError } from "../../../../classes/Notifications/Notifications";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import "./ButtonItem.scss";

interface Props {
    editing: boolean;
    text: string;
    link: string;
    updateButton(text: string, link: string): Promise<void>;
    sponsorColour: string;
}

interface FormData {
    text: string;
    link: string;
}

type State = "notpending" | "pending";

export default function ButtonItem(props: Props) {
    const { register, handleSubmit, errors } = useForm<FormData>();
    const [state, setState] = useState<State>("notpending");

    async function onSubmit(data: FormData) {
        setState("pending");

        try {
            await props.updateButton(data.text, data.link);
        } catch (e) {
            addError(`Failed to edit button. Error ${e}`, 20000);
        } finally {
            setState("notpending");
        }
    }

    const form = (
        <form className="edit-button-item" onSubmit={handleSubmit(onSubmit)}>
            <label htmlFor="text">Text</label>
            <input
                name="text"
                type="text"
                placeholder="Our website"
                disabled={state === "pending"}
                defaultValue={props.text}
                ref={register({ required: true })}
            />
            {errors.text && <p>Enter some button text</p>}
            <label htmlFor="link">Link</label>
            <input
                name="link"
                type="url"
                placeholder="https://www.example.org/"
                disabled={state === "pending"}
                defaultValue={props.link}
                ref={register({ required: true })}
            />
            {errors.text && <p>Enter a link for the button</p>}

            <div className="form-buttons">
                <AsyncButton content="Save" action={handleSubmit(onSubmit)} />
            </div>
        </form>
    );

    return (
        <div className="text-item">
            {props.editing ? (
                form
            ) : (
                <div className="content-item__button">
                    <a
                        href={props.link}
                        style={{
                            backgroundColor: props.sponsorColour,
                        }}
                    >
                        {props.text}
                    </a>
                </div>
            )}
        </div>
    );
}
