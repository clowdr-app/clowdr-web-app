import React, { useState } from "react";
import { _User } from "../../../classes/DataLayer";
import FooterLinks from "../../FooterLinks/FooterLinks";

export type doLoginF = (username: string, password: string) => Promise<boolean>;

interface LoginProps {
    doLogin: doLoginF;
}

export default function Login(props: LoginProps) {
    const doLogin = props.doLogin;
    const [email, setEmail] = useState("Email");
    const [password, setPassword] = useState("Password");

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setEmail("");
        setPassword("");
        let _ok = await doLogin(email, password);
        // TODO: If not ok, display error
    }

    function onChange(
        element: "email" | "password",
        event: React.ChangeEvent<HTMLInputElement>
    ) {
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

    const heading = <h1>Sign in</h1>;

    const emailBox = <input
        type="email"
        name="email"
        aria-label="Email"
        value={email}
        onChange={(e) => onChange("email", e)}
    />;
    const passwordBox = <input
        type="password"
        name="password"
        aria-label="Password"
        value={password}
        onChange={(e) => onChange("password", e)}
    />;
    const loginButton = <input
        type="submit"
        aria-label="Sign in"
        value="Sign in"
    />;

    const form = <form name="Sign in form" onSubmit={onSubmit}>
        {emailBox}
        {passwordBox}
        {loginButton}
    </form>;

    return <>
        {heading}
        {form}
        <FooterLinks />
    </>;
}
