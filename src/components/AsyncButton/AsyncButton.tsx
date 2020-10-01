import React, { useState } from "react";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import "./AsyncButton.scss";

type Handler = (ev: React.FormEvent) => Promise<void>;

interface Props {
    disabled?: boolean;
    action?: Handler;
    content?: string;
}

interface Pending {
    state: "pending";
}
interface NotPending {
    state: "notpending";
}
interface Rejected {
    state: "rejected";
}

type ActionState =
    | Pending
    | NotPending
    | Rejected;

export default function AsyncButton(props: Props) {

    const [actionState, setActionState] = useState<ActionState>({ state: "notpending" } as NotPending)

    function handleClick(event: React.FormEvent) {
        setActionState({ state: "pending" });

        if (!props.action) return;

        props
            .action(event)
            .then(() => {
                setActionState({ state: "notpending" });
            })
            .catch(error => {
                setActionState({ state: "rejected" });
            });
    }

    return <button
        disabled={props.disabled || actionState.state === "pending"}
        onClick={event => handleClick(event)}
        className={actionState.state}>
        {actionState.state === "pending" ? <LoadingSpinner /> : props.content}
    </button>;
}
