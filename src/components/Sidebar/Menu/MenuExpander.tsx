import React, { useState } from "react";

export type ButtonSpec = {
    type: "link";
    text: string;
    icon: string;
    url: string;
} | {
    type: "search";
    icon: string;

    onSearch?: (value: string) => Promise<void>;
    onSearchOpen?: () => Promise<void>;
    onSearchClose?: () => Promise<void>;
};

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

    let buttonElems: Array<JSX.Element> = [];
    for (let button of props.buttons) {
        let buttonElem = <></>;
        switch (button.type) {
            case "search":
                buttonElem = <div className="search">
                    <button className="search-button">
                        <i className={"fas " + button.icon}></i>
                    </button>
                </div>;
                break;
            case "link":
                break;
        }
        buttonElems.push(buttonElem);
    }

    return <div className="menu-expander">
        <div className={"expander-controls"}>
            <button className="expansion-control" onClick={toggleExpansion}>
                {isOpen ? <i className="fas fa-caret-down"></i> : <i className="fas fa-caret-right"></i>}
                <span>{props.title}</span>
            </button>
            {buttonElems.reduce((acc, x) => <>{acc}{x}</>, <></>)}
        </div>
        <div className={"expander-contents" + (isOpen ? "" : " closed")}>
            {props.children}
        </div>
    </div>;
}
