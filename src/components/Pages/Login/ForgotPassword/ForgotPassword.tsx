import React, { useState } from "react";
import Parse from "parse";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { addError } from "../../../../classes/Notifications/Notifications";
import useHeading from "../../../../hooks/useHeading";
import "./ForgotPassword.scss";
import useConference from "../../../../hooks/useConference";

interface ForgotPasswordProps {
    initialEmail?: string;
}

interface FormData {
    email: string;
}

type State = "unsubmitted" | "submitted" | "finished";

export default function ForgotPassword(props: ForgotPasswordProps) {
    const { register, handleSubmit } = useForm<FormData>();
    const [state, setState] = useState<State>("unsubmitted");
    const conference = useConference();

    useHeading("Reset your password");

    async function onSubmit(data: FormData) {
        setState("submitted");

        try {
            await Parse.Cloud.run("user-start-reset-password", { email: data.email, conference: conference.id });
            setState("finished");
        } catch (e) {
            addError("Could not start password reset.");
            setState("unsubmitted");
        }
    }

    const emailInput = <>
    <label htmlFor="email" hidden={true}>Email</label>
    <input
        type="email"
        name="email"
        aria-label="Email"
        defaultValue={props.initialEmail}
        placeholder={"Email"}
        required={true}
        ref={register({ required: true })} />
    </>

    const formButtons = <div className="form-buttons">
        <input
            type="submit"
            value="Reset password" />
        <Link className="back-to-sign-in" to="/">Back to sign in</Link>
    </div>;

    const form = <>
        <p>Forgotten your password? Enter your email address to receive an email containing a link to reset your password.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
            {emailInput}
            {formButtons}
        </form>
    </>

    const afterSubmit = <>
        <p>
            A password reset message has been sent.
        </p>
        <Link className="back-to-sign-in" to="/">Back to sign in</Link>
    </>

    function contents() {
        switch (state) {
            case "unsubmitted":
            case "submitted":
                return form;
            case "finished":
                return afterSubmit;
        }
    }

    const page = <section aria-labelledby="page-title" tabIndex={0} className="forgot-password">
        <h1>Reset your password</h1>
        {contents()}

    </section>

    return <>{page}</>;
}