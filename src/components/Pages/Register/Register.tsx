import React from "react";
import useHeading from "../../../hooks/useHeading";

interface Props {
    token: string;
    greeting: string;
}

export default function Register(props: Props) {
    useHeading("Register");

    return <p>{props.greeting}</p>;
}