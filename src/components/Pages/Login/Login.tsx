import React, { useEffect, useState } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import "./Login.scss";
import useConference from "../../../hooks/useConference";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { CancelablePromise, makeCancelable } from "../../../classes/Util";

export type doLoginF = (username: string, password: string) => Promise<boolean>;
export type clearSelectedConferenceF = () => Promise<void>;

interface LoginProps {
    doLogin: doLoginF;
    clearSelectedConference: clearSelectedConferenceF;
}

export default function Login(props: LoginProps) {
    const doLogin = props.doLogin;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState(null as string | null);
    const [attemptingLogin, setAttemptingLogin] = useState<CancelablePromise<boolean> | null>(null);
    const conference = useConference();

    useDocTitle("Sign in");

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        async function _onSubmit() {
            setEmail("");
            setPassword("");
            setErrorMsg(null);

            try {
                let p = makeCancelable(doLogin(email, password));
                setAttemptingLogin(p);

                let ok = await p.promise;
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

        let value = event.target.value;
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
        className="email-box"
    />;
    const passwordBox = <input
        type="password"
        name="password"
        aria-label="Password"
        value={password}
        placeholder={"Password"}
        required={true}
        onChange={(e) => onChange("password", e)}
        className="password-box"
    />;
    const formButtons = <>
        <input
            className="sign-in"
            type="submit"
            aria-label="Log in"
            value="Log in"
        />
        <button
            className="sign-up"
            aria-label="Sign up"
        >
            Sign up
        </button>
    </>;
    const selectOtherButton = <button
        className="select-another"
        onClick={props.clearSelectedConference}
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
        <div className="form-buttons">
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
                {form}
            </>
        }
    </section>;
}
