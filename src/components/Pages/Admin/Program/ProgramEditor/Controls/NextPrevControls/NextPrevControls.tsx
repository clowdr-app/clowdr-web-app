import { Tooltip } from "@material-ui/core";
import React from "react";
import "./NextPrevControls.scss";

interface Props {
    prevIdx?: number;
    nextIdx?: number;

    nextEnabled?: boolean;
    nextTooltip?: string;

    setCurrentTab: (idx: number) => void;
}

export default function NextPrevControls(props: Props) {
    let backButton = <></>;
    if (props.prevIdx !== undefined) {
        const idx = props.prevIdx;
        backButton = (
            <button
                className="prev-button"
                onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    props.setCurrentTab(idx);
                }}
            >
                Back
            </button>
        );
    };
    let nextButton = <></>;
    if (props.nextIdx !== undefined) {
        const idx = props.nextIdx;
        nextButton = (
            <button
                className="next-button"
                onClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    props.setCurrentTab(idx)
                }}
                disabled={!props.nextEnabled}
            >
                Next
            </button>
        );

        if (props.nextTooltip) {
            const tooltip = props.nextTooltip;
            nextButton = (
                <Tooltip title={tooltip} className="next-button-wrapper">
                    <span>{nextButton}</span>
                </Tooltip>
            );
        }
    };
    return (
        <>
            {backButton}
            {nextButton}
        </>
    );
}
