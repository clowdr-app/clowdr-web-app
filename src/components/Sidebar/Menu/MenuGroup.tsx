import React from "react";

export interface MenuGroupItem {
    key: string;
    element: JSX.Element;
}

export type MenuGroupItems = Array<MenuGroupItem>;

interface Props {
    items: Array<MenuGroupItem>;
    title?: string;
}

export default function MenuGroup(props: Props) {
    return <ul
        className="menu-group"
        aria-label={props.title}
        role={props.title ? "menubar" : undefined}
    >
        {props.items.reduce((acc, x) => <>{acc}<li key={x.key}>{x.element}</li></>, <></>)}
    </ul>;
}
