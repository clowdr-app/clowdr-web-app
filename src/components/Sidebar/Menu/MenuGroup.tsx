import React from "react";

interface Props {
    children: JSX.Element;
}

export default function MenuGroup(props: Props) {
    return <>{props.children}</>;
}
