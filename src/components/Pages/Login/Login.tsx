import React from "react";

export type doLoginF = (id: string, password: string) => Promise<void>;

interface LoginProps {
    doLogin: doLoginF;
}

export default function Login(props: LoginProps) {
    const doLogin = props.doLogin;

    function onSubmit() {
        // TODO
    }

    const heading = <h1>Sign in</h1>;

    const emailBox = <input type="email" name="email" aria-label="Email" defaultValue="Your email" />;
    const passwordBox = <input type="password" name="password" aria-label="Password" defaultValue="Your password" />;
    const loginButton = <input type="submit" aria-label="Sign in" value="Sign in" />;

    const form = <form name="Sign in form" onSubmit={onSubmit}>
        {emailBox}
        {passwordBox}
        {loginButton}
    </form>;

    return <>
        {heading}
        {form}
    </>;
}
