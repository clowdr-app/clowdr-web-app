import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { useEffect, useState } from "react";
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
    event: React.FormEvent;
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

    useEffect(() => {
        let cancel: () => void = () => { };

        if (actionState.state === "pending") {
            if (!props.action) {
                setActionState({ state: "notpending" });
            }
            else {
                setActionState({ state: "running" });

                const p = makeCancelable(props.action(actionState.event));
                cancel = p.cancel;

                p.promise
                    .then(() => {
                        setActionState({ state: "notpending" });
                    })
                    .catch(error => {
                        if (!error.isCanceled) {
                            setActionState({ state: "rejected" });
                        }
                    });
            }
        }

        return cancel;
    }, [actionState, props]);

    function handleClick(event: React.FormEvent) {
        setActionState({ state: "pending", event });
    }

    return <button
        disabled={props.disabled || actionState.state === "pending"}
        onClick={event => handleClick(event)}
        className={actionState.state}>
        {actionState.state === "pending" ? <LoadingSpinner /> : props.content}
    </button>;
}
