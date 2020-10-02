import Parse from "parse";
import React, { useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useConference from "../../../hooks/useConference";
import { useForm } from "react-hook-form";
import { addError } from "../../../classes/Notifications/Notifications";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { Link } from "react-router-dom";
import "./Register.scss";
import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";

interface Props {
    registrationId: string;
    email: string;
}

type FormData = {
    registrationId: string;
    password: string;
}

type Status = NotWaiting | Waiting | Finished;

interface NotWaiting {
    state: "notwaiting";
}

interface Waiting {
    state: "waiting";
}

interface Finished {
    state: "registered";
}

export default function Register(props: Props) {
    useHeading("Register");
    const { register, handleSubmit, watch, errors } = useForm();
    const [status, setStatus] = useState({ state: "notwaiting" } as Status);
    const conference = useConference();

    async function doRegister(data: FormData): Promise<boolean> {
        let ok = await Parse.Cloud.run("user-register", {
            registrationId: props.registrationId,
            password: data.password,
        }) as boolean;
        return ok;
    }

    async function onSubmit(data: FormData) {
        async function _onSubmit() {
            try {
                setStatus({ state: "waiting" });
                let p = makeCancelable(doRegister(data));

                let ok = false;
                try {
                    ok = await p.promise;
                }
                catch (e) {
                    ok = false;
                    console.error("Failed to register", e);
                }

                setStatus(ok ? { state: "registered" } : { state: "notwaiting" });

                if (!ok) {
                    addError("Registration failed.");
                }
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        _onSubmit();
    }

    const goToSignInButton =
        <Link
            className="button sign-in"
            aria-label="Go to sign in"
            to="/">
            Go to sign in
        </Link>;

    const registrationForm = <>
        <form onSubmit={handleSubmit(onSubmit)}>
            <p>Welcome to Clowdr. Please choose a password to complete your registration for {conference.name}.</p>
            <label htmlFor="email">Email</label>
            <input name="email" type="email" value={props.email} disabled />
            <label htmlFor="password">Choose a password</label>
            <input name="password" type="password" ref={register({ required: true, minLength: 10, maxLength: 100 })} />
            {errors.password && "Must be at least 10 characters."}
            <label htmlFor="password-repeat">Repeat your password</label>
            <input name="password-repeat" type="password" ref={register({
                validate: (value) => value === watch("password")
            })} />
            {errors["password-repeat"] && "Must match your chosen password."}
            <div className="submit-container">
                <input type="submit" value="Register" />
            </div>
        </form>
    </>

    function contents(status: Status) {
        switch (status.state) {
            case "notwaiting":
                return registrationForm;
            case "waiting":
                return <LoadingSpinner message="Registering, please wait" />
            case "registered":
                return <>
                    <p>
                        You have successfully registered. Please return to the login
                        page to continue. If you are a new user, please first check
                        your inbox for the account verification email.
                </p>
                    {goToSignInButton}
                </>
        }
    }

    return <section aria-labelledby="page-title" tabIndex={0} className="register-form">
        <div className="register-section-header">
            <h1>{conference.name}</h1>
        </div>
        {contents(status)}
    </section>;
}