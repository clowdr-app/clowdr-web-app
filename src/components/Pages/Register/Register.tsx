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
                let { promise, cancel } = makeCancelable(Conference.get(props.conferenceId).catch(async (reason) => {
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

    async function doRegister(data: FormData): Promise<boolean> {
        let ok = await Parse.Cloud.run("user-register", {
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

    function registrationForm(conference: Conference) {
        return <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <p>Welcome to Clowdr. Please choose a password to complete your registration for {conference.name}.</p>
                <p>If you have used Clowdr before, enter your existing password.</p>
                <label htmlFor="email">Email</label>
                <input name="email" type="email" value={props.email} disabled />
                <label htmlFor="fullName">Full name</label>
                <input name="fullName" ref={register({ required: true})} />
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
        </>;
    }

    function contents(status: Status, conference: Conference) {
        switch (status.state) {
            case "notwaiting":
                return registrationForm(conference);
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
