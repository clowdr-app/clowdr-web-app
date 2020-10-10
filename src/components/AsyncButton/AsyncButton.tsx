import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { ReactElement, useEffect, useState } from "react";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import "./AsyncButton.scss";

type Handler = () => Promise<void>;

interface Props {
    disabled?: boolean;
    className?: string;
    action?: Handler;
    content?: string | JSX.Element;
    setIsRunning?(isRunning: boolean): void;
}

interface Pending {
    state: "pending";
}
interface Running {
    state: "running";
}
interface NotPending {
    state: "notpending";
}
interface Rejected {
    state: "rejected";
}

type ActionState =
    | Pending
    | Running
    | NotPending
    | Rejected;

export default function AsyncButton(props: Props) {

    const [actionState, setActionState] = useState<ActionState>({ state: "notpending" } as NotPending);
    const [actionP, setActionP] = useState<CancelablePromise<void> | null>(null);

    const setIsRunning = props.setIsRunning ?? ((b: boolean) => { });
    const action = props.action ?? (async () => { });

    useEffect(() => {
        return actionP?.cancel;
    }, [actionP]);

    useEffect(() => {
        if (actionState.state === "pending") {
            setActionState({ state: "running" });

            setIsRunning(true);

            const p = makeCancelable(action());
            setActionP(p);

            p.promise
                .then(() => {
                    setActionState({ state: "notpending" });
                    setIsRunning(false);
                })
                .catch(error => {
                    if (!error.isCanceled) {
                        setActionState({ state: "rejected" });
                        setIsRunning(false);
                    }
                });
        }
    }, [action, actionState.state, setIsRunning]);

    function handleClick(event: React.FormEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (actionState.state === "notpending" && !props.disabled) {
            setActionState({ state: "pending" });
        }
    }

    function getContents(): ReactElement | string | undefined {
        switch (actionState.state) {
            case "pending":
            case "running":
                if (typeof props.content === "string") {
                    return <LoadingSpinner message={props.content ?? "Loading"} />;
                }
                else {
                    return props.content;
                }
            case "notpending":
                return props.content;
            case "rejected":
                return "Failed";

        }
    }

    return <button
        disabled={props.disabled || actionState.state !== "notpending"}
        onClick={event => handleClick(event)}
        className={`${actionState.state} ${props.className ?? ""}`}
        type="button">
        {getContents()}
    </button>;
}
