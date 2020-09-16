import React, { useState } from "react";

interface ButtonSpec {
    type: "click" | "search";
    text: string;
    icon: JSX.Element;
    onClick?: () => void;
}

interface Props {
    children: JSX.Element;
    title: string;
    buttons: Array<ButtonSpec>;
    defaultIsOpen: boolean;
}

export default function MenuExpander(props: Props) {
    const [isOpen, setIsOpen] = useState<boolean>(props.defaultIsOpen);

    function toggleExpansion() {
        setIsOpen(!isOpen);
    }

    return <div className="menu-expander">
        <div className={"expander-controls"}>
            <button className="expansion-control" onClick={toggleExpansion}>
                {isOpen ? <i className="fas fa-caret-down"></i> : <i className="fas fa-caret-right"></i>}
                <span>{props.title}</span>
            </button>
        </div>
        <div className={"expander-contents" + (isOpen ? "" : " closed")}>
            {props.children}
        </div>
    </div>;
}
