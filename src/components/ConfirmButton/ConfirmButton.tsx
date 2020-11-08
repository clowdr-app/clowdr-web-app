import React, { useState } from "react";
import AsyncButton from "../AsyncButton/AsyncButton";
import "./ConfirmButton.scss";

interface Props {
    text: string;
    action?: Handler;
    className?: string;
}

type Handler = () => Promise<void>;

type Status = "normal" | "confirming" | "executing";

export default function ConfirmButton(props: Props) {
    const [status, setStatus] = useState<Status>("normal");

    function setIsRunning(isRunning: boolean) {
        if (isRunning) {
            setStatus("executing");
        } else {
            setStatus("normal");
        }
    }

    return (
        <div className={`confirm-buttons ${props.className}`}>
            {status === "normal" && (
                <button
                    title={props.text}
                    className="yes"
                    onClick={ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setStatus("confirming");
                    }}
                >
                    {props.text}
                </button>
            )}
            {(status === "confirming" || status === "executing") && (
                <AsyncButton
                    children={`Yes - ${props.text}`}
                    className="yes"
                    setIsRunning={setIsRunning}
                    action={props.action}
                />
            )}
            {status === "confirming" && (
                <button
                    title="No, do not continue"
                    className="no"
                    onClick={ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setStatus("normal");
                    }}
                >
                    No
                </button>
            )}
        </div>
    );
}
