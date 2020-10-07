import React, { useState } from "react";
import Parse from "parse";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { addError } from "../../../../classes/Notifications/Notifications";
import useHeading from "../../../../hooks/useHeading";
import "./ResetPassword.scss";

interface ResetPasswordProps {
    email: string;
    token: string;
}

interface FormData {
    password: string;
}

type State = "unsubmitted" | "submitted" | "finished";

export default function ResetPassword(props: ResetPasswordProps) {
    const { register, handleSubmit, watch, errors } = useForm<FormData>();
    const [state, setState] = useState<State>("unsubmitted");

    useHeading("Choose a new password");

    async function onSubmit(data: FormData) {
        setState("submitted");

        try {
            await Parse.Cloud.run("user-reset-password", { email: props.email, token: props.token, password: data.password });
            setState("finished");
        } catch (e) {
            addError("Could not set a new password.");
            setState("unsubmitted");
        }
    }

    const passwordInput = <>
    <label htmlFor="password" hidden={true}>Choose a password</label>
    <input name="password" placeholder="New password" type="password" ref={register({ required: true, minLength: 10, maxLength: 100 })} />
    {errors.password && "Must be at least 10 characters."}
    <label htmlFor="password-repeat" hidden={true}>Repeat your password</label>
    <input name="password-repeat" placeholder="Repeat password" type="password" ref={register({
        validate: (value) => value === watch("password")
    })} />
    {errors["password-repeat"] && "Must match your chosen password."}
    </>

    const formButtons = <div className="form-buttons">
        <input
            type="submit"
            value="Set password" />
        <Link className="back-to-sign-in" to="/">Back to sign in</Link>
    </div>;

    const form = <>
        <p>Choose a new password for your account {props.email}.</p>
        <form onSubmit={handleSubmit(onSubmit)}>
            {passwordInput}
            {formButtons}
        </form>
    </>

    const afterSubmit = <>
        <p>
            Your password has been reset.
        </p>
        <Link className="back-to-sign-in" to="/">Sign in</Link>
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

    const page = <section aria-labelledby="page-title" tabIndex={0} className="reset-password">
        <h1>Choose a new password</h1>
        {contents()}

    </section>

    return <>{page}</>;
}
