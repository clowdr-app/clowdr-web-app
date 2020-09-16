import React from "react";

export interface MenuGroupItem {
    key: string;
    element: JSX.Element;
}

export type MenuGroupItems = Array<MenuGroupItem>;

interface Props {
    items: Array<MenuGroupItem>;
}

export default function MenuGroup(props: Props) {
    return <ul className="menu-group">
        {props.items.reduce((acc, x) => <>{acc}<li key={x.key}>{x.element}</li></>, <></>)}
    </ul>;
}
