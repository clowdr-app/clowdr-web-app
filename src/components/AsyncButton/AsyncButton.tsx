import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { useEffect, useState } from "react";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import "./AsyncButton.scss";

type Handler = () => Promise<void>;

interface Props {
    disabled?: boolean;
    className?: string;
    action?: Handler;
    ariaLabel?: string;
    title?: string;
    children: string | React.ReactNode | React.ReactNodeArray;
    setIsRunning?(isRunning: boolean): void;
}

type ActionState = "pending" | "running" | "notpending" | "rejected";

export default function AsyncButton(props: Props) {
    const [actionState, setActionState] = useState<ActionState>("notpending");
    const [actionP, setActionP] = useState<CancelablePromise<void> | null>(null);

    const setIsRunning = props.setIsRunning ?? ((b: boolean) => {});
    const action = props.action ?? (async () => {});

    useEffect(() => {
        return actionP?.cancel;
    }, [actionP]);

    useEffect(() => {
        if (actionState === "pending") {
            setActionState("running");

            setIsRunning(true);

            const p = makeCancelable(action());
            setActionP(p);

            p.promise
                .then(() => {
                    setActionState("notpending");
                    setIsRunning(false);
                })
                .catch((error: { isCanceled: any }) => {
                    if (!error.isCanceled) {
                        setActionState("rejected");
                        setIsRunning(false);
                    }
                });
        }
    }, [action, actionState, setIsRunning]);

    function handleClick(event: React.FormEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (actionState === "notpending" && !props.disabled) {
            setActionState("pending");
        }
    }

    function getContents(): React.ReactNode | React.ReactNodeArray | string | undefined {
        switch (actionState) {
            case "pending":
            case "running":
                if (typeof props.children === "string") {
                    return <LoadingSpinner message={props.children ?? "Loading"} />;
                } else {
                    return props.children;
                }
            case "notpending":
                return props.children;
            case "rejected":
                return "Failed";
        }
    }

    return (
        <button
            disabled={props.disabled || actionState !== "notpending"}
            onClick={event => handleClick(event)}
            className={`${actionState} ${props.className ?? ""}`}
            aria-label={props.ariaLabel}
            title={props.title}
            type="button"
        >
            {getContents()}
        </button>
    );
}
