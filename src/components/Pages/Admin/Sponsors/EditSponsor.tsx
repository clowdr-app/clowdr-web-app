import React, { useState } from "react";
import { ChromePicker, RGBColor } from "react-color";
import { Controller, useForm } from "react-hook-form";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import "./EditSponsor.scss";
import useHeading from "../../../../hooks/useHeading";
import ProfileSelector from "./ProfileSelector";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import { Sponsor } from "@clowdr-app/clowdr-db-schema";

export interface SponsorData {
    name: string;
    description?: string;
    colour: string;
    level: number;
    representativeProfileIds: string[];
}

interface FormData {
    name: string;
    description?: string;
    colour: RGBColor;
    level: string;
    representativeProfileIds: string[];
}

type State = "notpending" | "pending";

interface Props {
    existingSponsor?: Sponsor | undefined;
    updateSponsor(data: SponsorData): Promise<void>;
}

export default function EditSponsor(props: Props) {
    const { register, handleSubmit, errors, control } = useForm<FormData>();
    const [state, setState] = useState<State>("notpending");
    useHeading("Sponsors");

    async function onSubmit(data: FormData) {
        setState("pending");

        const requestData: SponsorData = {
            name: data.name,
            description: data.description,
            level: parseInt(data.level, 10),
            colour: `rgba(${data.colour.r},${data.colour.g},${data.colour.b},${data.colour.a})`,
            representativeProfileIds: data.representativeProfileIds,
        };

        try {
            await props.updateSponsor(requestData);
            addNotification(`Saved sponsor '${data.name}'`);
        } catch (e) {
            addError(`Failed to save sponsor. Error: ${e}`, 20000);
        } finally {
            setState("notpending");
        }
    }

    const form = (
        <>
            <form className="edit-sponsor" onSubmit={handleSubmit(onSubmit)}>
                <label htmlFor="name">Sponsor name</label>
                <input
                    name="name"
                    placeholder="Sponsor name"
                    defaultValue={props?.existingSponsor?.name}
                    type="text"
                    disabled={state === "pending"}
                    ref={register({ required: true })}
                />
                {errors.name && "Choose a name for the sponsor"}

                <label htmlFor="description">Description</label>
                <input
                    name="description"
                    placeholder="Description"
                    defaultValue={props?.existingSponsor?.description}
                    type="text"
                    disabled={state === "pending"}
                    ref={register}
                />
                {errors.description?.message}

                <label htmlFor="colour">Colour</label>
                <Controller
                    control={control}
                    name="colour"
                    defaultValue={props?.existingSponsor?.colour ?? { r: 0, g: 0, b: 0, a: 0 }}
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
                    defaultValue={props?.existingSponsor?.level ?? 0}
                    disabled={state === "pending"}
                >
                    <option value={0}>Gold</option>
                    <option value={1}>Silver</option>
                    <option value={2}>Bronze</option>
                </select>

                <label htmlFor="representativeProfileIds">Representatives</label>
                <Controller
                    control={control}
                    name="representativeProfileIds"
                    defaultValue={props?.existingSponsor?.representativeProfileIds ?? []}
                    render={({ onChange, value }) => (
                        <ProfileSelector
                            userProfiles={value}
                            setUserProfiles={onChange}
                            disabled={state === "pending"}
                        />
                    )}
                />

                <div className="form-buttons">
                    <AsyncButton content="Save" action={handleSubmit(onSubmit)} />
                </div>
            </form>
        </>
    );

    return <section className="edit-sponsor">{form}</section>;
}
