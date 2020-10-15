import React, { useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import "./Login.scss";
import useConference from "../../../hooks/useConference";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import { Link } from "react-router-dom";

export type doLoginF = (username: string, password: string) => Promise<boolean>;
export type clearSelectedConferenceF = () => Promise<void>;

interface LoginProps {
    doLogin: doLoginF;
    clearSelectedConference: clearSelectedConferenceF;
    showSignUp: boolean;
}

export default function Login(props: LoginProps) {
    const doLogin = props.doLogin;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState(null as string | null);
    const [attemptingLogin, setAttemptingLogin] = useState<CancelablePromise<boolean> | null>(null);
    const conference = useConference();

    useHeading("Sign in");

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        async function _onSubmit() {
            setEmail("");
            setPassword("");
            setErrorMsg(null);

            try {
                const p = makeCancelable(doLogin(email, password));
                setAttemptingLogin(p);

                const ok = await p.promise;
                if (!ok) {
                    setErrorMsg("We were unable to log you in, please try again.");
                }

                setAttemptingLogin(null);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        _onSubmit();
    }

    useEffect(() => {
        return () => {
            attemptingLogin?.cancel();
        };
    }, [attemptingLogin]);

    function onChange(
        element: "email" | "password",
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        setErrorMsg(null);

        const value = event.target.value;
        switch (element) {
            case "email":
                setEmail(value);
                break;
            case "password":
                setPassword(value);
                break;
        }
    }

    const emailBox = <input
        type="email"
        name="email"
        aria-label="Email"
        value={email}
        placeholder={"Email"}
        required={true}
        onChange={(e) => onChange("email", e)}
    />;
    const passwordBox = <input
        type="password"
        name="password"
        aria-label="Password"
        value={password}
        placeholder={"Password"}
        required={true}
        onChange={(e) => onChange("password", e)}
    />;
    const formButtons = <>
        <input
            className="sign-in"
            type="submit"
            aria-label="Log in"
            value="Log in"
        />
        {props.showSignUp
            ? <Link className="sign-up"
                aria-label="Sign up"
                to="/signup"
            >
                Sign up
            </Link>
            : <></>
        }
    </>;
    const selectOtherButton = <button
        className="select-another"
        onClick={(ev) => {
            ev.preventDefault();
            props.clearSelectedConference();
        }}
        aria-label="Select another conference">
        Select another conference
    </button>;
    let errorMessage = <></>;
    if (errorMsg) {
        errorMessage = <div className="error-message">{errorMsg}</div>;
    }

    const form = <form name="Sign in form" onSubmit={onSubmit}>
        {errorMessage}
        {emailBox}
        {passwordBox}
        <div className={"form-buttons" + (props.showSignUp ? "" : " no-signup")}>
            {formButtons}
            {selectOtherButton}
        </div>
    </form>;

    return <section aria-labelledby="page-title" tabIndex={0} className="login">
        <h1>{conference.name}</h1>

        {attemptingLogin
            ? <LoadingSpinner message="Signing in, please wait" />
            : <>
                <p>Please log in or sign up to join the conference</p>
                <p>Clowdr requires the use of the Firefox, Chrome or Edge browsers. Safari and Opera are not supported at this time. Most features will also work in Firefox and Chrome mobile.</p>
                {form}
                <p><Link to={`/forgotPassword/${email}`}>Forgotten your password?</Link></p>
            </>
        }
    </section>;
}
