import Parse from "parse";
import { CancelablePromise, makeCancelable } from "clowdr-db-schema/src/classes/Util";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { clearSelectedConferenceF } from "../Login/Login";
import "./SignUp.scss";

interface SignUpProps {
    clearSelectedConference: clearSelectedConferenceF;
}

export default function SignUp(props: SignUpProps) {
    useDocTitle("Sign Up");

    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState(null as string | null);
    const [signedUp, setSignedUp] = useState(false);
    const [attemptingSignUp, setAttemptingSignUp] = useState<CancelablePromise<boolean> | null>(null);
    const conference = useConference();

    async function doSignUp() {
        // Note: Parse.User.signUp is disabled (on purpose) by the _User table ACLs
        let ok = await Parse.Cloud.run("user-create", {
            fullName: fullName,
            email: email,
            password: password,
            conference: conference.id
        }) as boolean;
        setSignedUp(ok);
        return ok;
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        async function _onSubmit() {
            setPassword("");
            setErrorMsg(null);

            try {
                let p = makeCancelable(doSignUp());
                setAttemptingSignUp(p);

                let ok = false;
                try {
                    ok = await p.promise;
                }
                catch (e) {
                    ok = false;
                    console.error("Failed to sign up", e);
                }

                if (!ok) {
                    setErrorMsg("We were unable to sign you up, please try again later.");
                }
                else {
                    setEmail("");
                    setFullName("");
                }

                setAttemptingSignUp(null);
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
            attemptingSignUp?.cancel();
        };
    }, [attemptingSignUp]);


    let errorMessage = <></>;
    if (errorMsg) {
        errorMessage = <div className="error-message">{errorMsg}</div>;
    }

    function onChange(
        element: "email" | "password" | "full name",
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        setErrorMsg(null);

        let value = event.target.value;
        switch (element) {
            case "email":
                setEmail(value);
                break;
            case "full name":
                setFullName(value);
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
    const fullNameBox = <input
        type="text"
        name="full-name"
        aria-label="Full Name"
        value={fullName}
        placeholder={"Full Name"}
        required={true}
        onChange={(e) => onChange("full name", e)}
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
    const goToSignInButton =
        <Link
            className="button sign-in"
            aria-label="Go to sign in"
            to="/">
            Go to sign in
        </Link>;
    const formButtons = <>
        <input
            className="sign-up"
            type="submit"
            aria-label="Sign up"
            value="Sign up"
        />
        {goToSignInButton}
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
    const form = <form name="Sign up form" onSubmit={onSubmit}>
        {errorMessage}
        {fullNameBox}
        {emailBox}
        {passwordBox}
        <div className={"form-buttons"}>
            {formButtons}
            {selectOtherButton}
        </div>
    </form>;

    return <section aria-labelledby="page-title" tabIndex={0} className="signup">
        <h1>{conference.name}</h1>

        {attemptingSignUp
            ? <LoadingSpinner message="Signing up, please wait" />
            : signedUp
                ? <>
                    <p>
                        You have successfully signed up. Please return to the login
                        page to continue. If you are a new user, please first check
                        your inbox for the account verification email.
                    </p>
                    {goToSignInButton}
                    </>
                : <>
                    <p>Please enter the details below to sign up for this conference.</p>
                    <p className="info">
                        If you have previously used the same email address for another
                        conference, please enter your same password. We will link your
                        account but you will be able to enter separate profile information
                        for this conference.
                    </p>
                    {form}
                </>
        }
    </section>;
}
