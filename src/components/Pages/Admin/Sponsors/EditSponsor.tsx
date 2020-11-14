import React from "react";
import Parse from "parse";
import { ChromePicker, RGBColor } from "react-color";
import { Controller, useForm } from "react-hook-form";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import "./EditSponsor.scss";
import useHeading from "../../../../hooks/useHeading";
import ProfileSelector from "./ProfileSelector";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import { Sponsor } from "@clowdr-app/clowdr-db-schema";
import ConfirmButton from "../../../ConfirmButton/ConfirmButton";

export interface SponsorData {
    name: string;
    description?: string;
    logo?: Parse.File;
    colour: string;
    level: number;
    representativeProfileIds: string[];
}

interface FormData {
    name: string;
    description?: string;
    logo: FileList | null;
    colour: RGBColor;
    level: string;
    representativeProfileIds: string[];
}

interface Props {
    existingSponsor?: Sponsor | undefined;
    updateSponsor(data: SponsorData): Promise<void>;
}

export default function EditSponsor(props: Props) {
    const { register, handleSubmit, errors, control, formState, reset } = useForm<FormData>();

    async function uploadFile(file: File): Promise<Parse.File | undefined> {
        if (file) {
            const data = new Uint8Array(await file.arrayBuffer());
            const parseFile = new Parse.File(`logo-${file.name}`, [...data]);
            await parseFile.save();

            return parseFile;
        }
        return undefined;
    }

    async function onSubmit(data: FormData) {
        let logo: Parse.File | undefined = undefined;
        if (data.logo && data.logo.length > 0) {
            logo = await uploadFile(data.logo[0]);
        }

        const requestData: SponsorData = {
            name: data.name,
            description: data.description,
            logo,
            level: parseInt(data.level, 10),
            colour: `rgba(${data.colour.r},${data.colour.g},${data.colour.b},${data.colour.a})`,
            representativeProfileIds: data.representativeProfileIds,
        };

        try {
            await props.updateSponsor(requestData);
            addNotification(`Saved sponsor '${data.name}'`);
            reset();
        } catch (e) {
            addError(`Failed to save sponsor. Error: ${e}`, 20000);
        } finally {
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
                    disabled={formState.isSubmitting}
                    ref={register({ required: true })}
                />
                {errors.name && "Choose a name for the sponsor"}

                <label htmlFor="description">Description</label>
                <input
                    name="description"
                    placeholder="Description"
                    defaultValue={props?.existingSponsor?.description}
                    type="text"
                    disabled={formState.isSubmitting}
                    ref={register}
                />
                {errors.description?.message}

                <label htmlFor="logo">Logo</label>
                <input disabled={formState.isSubmitting} name="logo" type="file" ref={register} />

                <label htmlFor="colour">Colour</label>
                <Controller
                    control={control}
                    name="colour"
                    defaultValue={props?.existingSponsor?.colour ?? { r: 0, g: 0, b: 0, a: 1 }}
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
                    disabled={formState.isSubmitting}
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
                            disabled={formState.isSubmitting}
                        />
                    )}
                />

                <div className="form-buttons">
                    <AsyncButton children="Save" action={handleSubmit(onSubmit)} />
                    {props.existingSponsor && (
                        <ConfirmButton
                            text="Delete sponsor"
                            action={async () => {
                                const room = await props.existingSponsor?.videoRoom;
                                await props.existingSponsor?.delete();
                                await room?.delete();
                            }}
                        />
                    )}
                </div>
            </form>
        </>
    );

    return <section className="edit-sponsor">{form}</section>;
}
