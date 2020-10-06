import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useHeading from "../../../../hooks/useHeading";
import "./ForgotPassword.scss";

interface ForgotPasswordProps {
    initialEmail?: string;
}

export default function ForgotPassword(props: ForgotPasswordProps) {
    const [email, setEmail] = useState<string | undefined>();
    const [submitted, setSubmitted] = useState<boolean>(false);

    useHeading("Reset your password");

    useEffect(() => {
        setEmail(props.initialEmail);
    }, [props.initialEmail]);

    const emailInput = <input
        type="email"
        name="email"
        aria-label="Email"
        value={email}
        placeholder={"Email"}
        required={true}
    />

    const formButtons = <div className="form-buttons">
        <input
            className="reset-password"
            type="submit"
            aria-label="Reset password"
            value="Reset password" />
        <Link className="back-to-sign-in" to="/">Back to sign in</Link>
    </div>;

    const form = <>
        <p>Forgotten your password? Enter your email address to receive an email containing a link to reset your password.</p>
        <form onSubmit={onSubmit}>
            {emailInput}
            {formButtons}
        </form>
    </>

    const afterSubmit = <>
        <p>
            A password reset message has been sent to {email} if that email is registered.
        </p>
        <Link className="back-to-sign-in" to="/">Back to sign in</Link>
    </>

    async function onSubmit() {
        setSubmitted(true);
    }

    const page = <section aria-labelledby="page-title" tabIndex={0} className="forgot-password">
        <h1>Reset your password</h1>
        { submitted ? afterSubmit : form }

    </section>

    return <>{page}</>;
}