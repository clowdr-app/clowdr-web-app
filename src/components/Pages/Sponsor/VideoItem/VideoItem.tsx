import React, { useState } from "react";
import { useForm } from "react-hook-form";
import ReactPlayer from "react-player";
import { addError } from "../../../../classes/Notifications/Notifications";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import "./VideoItem.scss";

interface Props {
    editing: boolean;
    videoURL: string;
    updateVideoURL(newURL: string): Promise<void>;
}

interface FormData {
    url: string;
}

type State = "notpending" | "pending";

export default function VideoItem(props: Props) {
    const { register, handleSubmit, errors } = useForm<FormData>();
    const [state, setState] = useState<State>("notpending");

    async function onSubmit(data: FormData) {
        setState("pending");

        try {
            await props.updateVideoURL(data.url);
        } catch (e) {
            addError(`Failed to edit video URL. Error ${e}`, 20000);
        } finally {
            setState("notpending");
        }
    }

    const form = (
        <form className="edit-video-item" onSubmit={handleSubmit(onSubmit)}>
            <label htmlFor="url">Video URL</label>
            <input
                name="url"
                placeholder="e.g. https://www.youtube.com/watch?v=l69Vi5IDc0g"
                type="url"
                disabled={state === "pending"}
                defaultValue={props.videoURL}
                ref={register({ required: true })}
            />
            {errors.url && <p>Choose a valid url</p>}

            <div className="form-buttons">
                <AsyncButton content="Save" action={handleSubmit(onSubmit)} />
            </div>
        </form>
    );

    return (
        <div className="video-item">
            {props.editing ? (
                form
            ) : (
                <ReactPlayer
                    className="video-player"
                    width=""
                    height=""
                    playsinline
                    controls={true}
                    muted={false}
                    volume={1}
                    url={props.videoURL}
                />
            )}
        </div>
    );
}
