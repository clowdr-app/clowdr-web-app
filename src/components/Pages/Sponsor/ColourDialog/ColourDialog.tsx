import React from "react";
import { DialogContent, Divider, Dialog, DialogActions, DialogTitle } from "@material-ui/core";
import { ChromePicker, RGBColor } from "react-color";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import { Controller, useForm } from "react-hook-form";
import "./ColourDialog.scss";

interface Props {
    showDialog: boolean;
    colour: string;
    updateColour(colour: string): Promise<void>;
    onClose(): void;
}

interface FormData {
    colour: RGBColor;
}

export default function ColourDialog(props: Props) {
    const { handleSubmit, control, reset } = useForm<FormData>();
    async function onSubmit(data: FormData) {
        await props.updateColour(`rgba(${data.colour.r},${data.colour.g},${data.colour.b},${data.colour.a})`);
        reset();
    }
    return (
        <Dialog open={props.showDialog} onClose={props.onClose} className="colour-dialog">
            <DialogTitle>Choose a colour</DialogTitle>
            <Divider />
            <DialogContent>
                <form className="edit-sponsor" onSubmit={handleSubmit(onSubmit)}>
                    <label htmlFor="colour">Colour</label>
                    <Controller
                        control={control}
                        name="colour"
                        defaultValue={props.colour ?? { r: 0, g: 0, b: 0, a: 1 }}
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
                </form>
            </DialogContent>
            <Divider />
            <DialogActions>
                <div className="form-buttons">
                    <AsyncButton content="Close" action={async () => props.onClose()} />
                    <AsyncButton content="Save" action={handleSubmit(onSubmit)} />
                </div>
            </DialogActions>
        </Dialog>
    );
}
