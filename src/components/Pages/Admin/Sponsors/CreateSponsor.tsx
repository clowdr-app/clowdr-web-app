import React, { useState } from "react";
import Parse from "parse";
import { ChromePicker, RGBColor } from "react-color";
import { Controller, useForm } from "react-hook-form";
import useConference from "../../../../hooks/useConference";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import "./CreateSponsor.scss";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import ProfileSelector from "./ProfileSelector";
import {
    addError,
    addNotification,
} from "../../../../classes/Notifications/Notifications";

interface FormData {
    name: string;
    description?: string;
    colour: RGBColor;
    level: string;
    representativeProfileIds: string[];
}

type State = "notpending" | "pending";

interface Props {
    existingSponsor?: FormData | undefined;
}

export default function CreateSponsor(props: Props) {
    const conference = useConference();
    const { register, handleSubmit, watch, errors, control } = useForm<
        FormData
    >();
    const [state, setState] = useState<State>("notpending");
    useHeading("Sponsors");

    async function onSubmit(data: FormData) {
        setState("pending");

        const requestData: any = data;
        requestData.level = parseInt(data.level);
        requestData.colour = `rgba(${data.colour.r},${data.colour.g},${data.colour.b},${data.colour.a})`;
        requestData.conference = conference.id;

        try {
            await Parse.Cloud.run("create-sponsor", requestData);
            addNotification(`Created sponsor '${data.name}'`);
        } catch (e) {
            addError(`Failed to promote user. Error: ${e}`, 20000);
        } finally {
            setState("notpending");
        }
    }

    const form = (
        <>
            <form className="create-sponsor" onSubmit={handleSubmit(onSubmit)}>
                <label htmlFor="name">Sponsor name</label>
                <input
                    name="name"
                    placeholder="Sponsor name"
                    type="text"
                    disabled={state === "pending"}
                    ref={register({ required: true })}
                />
                {errors.name && "Choose a name for the sponsor"}

                <label htmlFor="description">Description</label>
                <input
                    name="description"
                    placeholder="Description"
                    type="text"
                    disabled={state === "pending"}
                    ref={register}
                />
                {errors.description?.message}

                <label htmlFor="colour">Colour</label>
                <Controller
                    control={control}
                    name="colour"
                    defaultValue={{ r: 0, g: 0, b: 0, a: 0 }}
                    render={({ onChange, value }) => (
                        <ChromePicker
                            className="colour-input"
                            color={value}
                            onChange={colour => {
                                onChange(colour.rgb);
                            }}
                            onChangeComplete={(colour, event) => {
                                onChange(colour.rgb);
                            }}
                            disableAlpha={false}
                        />
                    )}
                />
                <label htmlFor="level">Sponsorship level</label>
                <select
                    name="level"
                    ref={register}
                    defaultValue={0}
                    disabled={state === "pending"}
                >
                    <option value={0}>Gold</option>
                    <option value={1}>Silver</option>
                    <option value={2}>Bronze</option>
                </select>

                <label htmlFor="representativeProfileIds">
                    Representatives
                </label>
                <Controller
                    control={control}
                    name="representativeProfileIds"
                    defaultValue={[]}
                    render={({ onChange, value }) => (
                        <ProfileSelector
                            userProfiles={value}
                            setUserProfiles={onChange}
                            disabled={state === "pending"}
                        />
                    )}
                />

                <div className="form-buttons">
                    <AsyncButton
                        content="Create"
                        action={handleSubmit(onSubmit)}
                    />
                </div>
            </form>
        </>
    );

    return <section className="create-sponsor">{form}</section>;
}
