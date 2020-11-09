import React from "react";
import "./Columns.scss";

interface Props {
    children: React.ReactNode | React.ReactNodeArray;
    className?: string;
}

export default function Columns(props: Props) {
    return <div className={`columns ${props.className}`}>{props.children}</div>;
}
