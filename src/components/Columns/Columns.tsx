import React from "react";
import "./Columns.scss"

interface Props {
    children: JSX.Element;
    className?: string;
}

export default function Columns(props: Props) {
    return <div className={`columns ${props.className}`}>
        {props.children}
    </div>;
}