import React, { useState } from "react";
import DocumentTitle from "react-document-title";
import FooterLinks from "../../FooterLinks/FooterLinks";

export type doLoginF = (username: string, password: string) => Promise<boolean>;

interface LoginProps {
    doLogin: doLoginF;
}

export default function Login(props: LoginProps) {
    const doLogin = props.doLogin;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState(null as string | null);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setEmail("");
        setPassword("");
        setErrorMsg(null);

        let ok = await doLogin(email, password);
        if (!ok) {
            setErrorMsg("We were unable to log you in, please try again.");
        }
    }

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

    const heading = <h1 id="page-title" aria-level={1}>Sign in</h1>;

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
    const loginButton = <input
        type="submit"
        aria-label="Sign in"
        value="Sign in"
    />;
    let errorMessage = <></>;
    if (errorMsg) {
        errorMessage = <div className="errorMessage">{errorMsg}</div>;
    }

    const form = <form name="Sign in form" onSubmit={onSubmit}>
        {errorMessage}
        {emailBox}
        {passwordBox}
        {loginButton}
    </form>;

    return <DocumentTitle title="Clowdr Login">
        <section aria-labelledby="page-title" tabIndex={0}>
            {heading}
            {form}
            <FooterLinks />
        </section>
    </DocumentTitle>;
}
