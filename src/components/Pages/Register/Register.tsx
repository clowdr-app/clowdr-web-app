import Parse from "parse";
import React, { useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import { useForm } from "react-hook-form";
import { addError } from "../../../classes/Notifications/Notifications";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { Link } from "react-router-dom";
import "./Register.scss";
import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import { Conference } from "@clowdr-app/clowdr-db-schema";

interface Props {
    conferenceId: string;
    registrationId: string;
    email: string;
}

type FormData = {
    password: string;
    fullName: string;
}

type Status = { state: "notwaiting" } | { state: "waiting" } | { state: "registered" };

export default function Register(props: Props) {
    useHeading("Register");
    const { register, handleSubmit, watch, errors } = useForm<FormData>();
    const [status, setStatus] = useState<Status>({ state: "notwaiting" });
    const [conference, setConference] = useState<Conference | null>(null);
    const [loadFailed, setLoadFailed] = useState<boolean>(false);

    useEffect(() => {
        let cancelConferencePromise: () => void = () => { };

        async function getConference() {
            try {
                const { promise, cancel } = makeCancelable(Conference.get(props.conferenceId).catch(async (reason) => {
                    setLoadFailed(true);
                    return null;
                }));
                cancelConferencePromise = cancel;

                const _conference = await promise;
                if (!_conference) {
                    setLoadFailed(true);
                }
                setConference(_conference);
                cancelConferencePromise = () => { };
            }
            catch (e) {
                if (!e || !e.isCanceled) {
                    throw e;
                }
            }
        }

        getConference();

        return function cleanupGetConference() {
            cancelConferencePromise();
        }
    }, [props.conferenceId])

    async function doRegister(data: FormData): Promise<boolean | string> {
        const ok = await Parse.Cloud.run("user-register", {
            registrationId: props.registrationId,
            conferenceId: props.conferenceId,
            password: data.password,
            fullName: data.fullName,
        }) as boolean;
        return ok;
    }

    async function onSubmit(data: FormData) {
        async function _onSubmit() {
            try {
                setStatus({ state: "waiting" });
                const p = makeCancelable(doRegister(data));

                let ok: boolean | string = false;
                try {
                    ok = await p.promise;
                }
                catch (e) {
                    ok = false;
                    console.error("Failed to register", e);
                }

                setStatus(ok && ok !== "Use existing password" ? { state: "registered" } : { state: "notwaiting" });

                if (!ok) {
                    addError("Registration failed.");
                }
                else if (ok === "Use existing password") {
                    addError("You already have a Clowdr account, but you need to register a new profile for this conference. Please use your existing Clowdr password.");
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

    function registrationForm(_conference: Conference) {
        return <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <p>Welcome to Clowdr. Please choose a password to complete your registration for {_conference.name}.</p>
                <p>If you have used Clowdr before, enter your existing password.</p>
                <label htmlFor="email">Email</label>
                <input name="email" type="email" value={props.email} disabled />
                <label htmlFor="email">Repeat your email</label>
                <input name="email-confirm" type="email" ref={register({
                    validate: (value) => value === props.email
                })} />
                {errors["email-confirm"] && "Email addresses do not match. Please ensure you use your registration's email address listed above."}
                <label htmlFor="fullName">Full name</label>
                <input name="fullName" ref={register({
                    required: true
                })} />
                {errors.fullName && "Full name required."}
                <label htmlFor="password">Choose a password</label>
                <input name="password" type="password" ref={register({
                    required: "Password required",
                    minLength: {
                        value: 10,
                        message: "Minimum length of 10 characters"
                    },
                    maxLength: {
                        value: 100,
                        message: "Maximum length of 100 characters"
                    },
                })} />
                {errors.password && "Must be at least 10 characters (maximum 100 characters)."}
                <label htmlFor="password-repeat">Repeat your password</label>
                <input name="password-repeat" type="password" ref={register({
                    validate: (value) => value === watch("password")
                })} />
                {errors["password-repeat"] && "Must match your chosen password."}
                <div className="submit-container">
                    <input type="submit" value="Register" />
                </div>
            </form>
        </>;
    }

    function contents(_status: Status, _conference: Conference) {
        switch (_status.state) {
            case "notwaiting":
                return registrationForm(_conference);
            case "waiting":
                return <LoadingSpinner message="Registering, please wait" />
            case "registered":
                return <>
                    <p>
                        You have successfully registered. Please return to the login
                        page to continue.
                </p>
                    {goToSignInButton}
                </>;
        }
    }

    return <section aria-labelledby="page-title" tabIndex={0} className="register-form">
        {loadFailed
            ? <p> Failed to load conference. </p>
            : conference === null
                ? <LoadingSpinner message="Loading, please wait" />
                : <>
                    <div className="register-section-header">
                        <h1>{conference.name}</h1>
                    </div>
                    {contents(status, conference)}
                </>
        }
    </section>;
}
