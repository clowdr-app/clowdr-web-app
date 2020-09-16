import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export type ButtonSpec = {
    type: "link";
    label: string;
    icon: string;

    text?: string;
    url: string;
} | {
    type: "search";
    label: string;
    icon: string;

    onSearch?: (event: ChangeEvent<HTMLInputElement>) => string;
    onSearchOpen?: () => void;
    onSearchClose?: () => void;
};

interface Props {
    children: JSX.Element;
    title: string;
    buttons: Array<ButtonSpec>;
    isOpen: boolean;
    onOpenStateChange?: () => void;
}

export default function MenuExpander(props: Props) {
    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const searchBoxRef = useRef<HTMLInputElement>(null);
    const [searchBoxValue, setSearchBoxValue] = useState("");

    function toggleExpansion() {
        if (props.onOpenStateChange) {
            props.onOpenStateChange();
        }
    }

    useEffect(() => {
        if (isSearchOpen) {
            searchBoxRef.current?.focus();
        }
    });

    // TODO: 'X' button to close search
    // <i class="fas fa-times-circle"></i>

    let buttonElems: Array<JSX.Element> = [];
    let foundSearchButton = false;
    for (let button of props.buttons) {
        let buttonElem = <></>;
        switch (button.type) {
            case "search":
                let searchButtonSpec = button;
                if (!foundSearchButton) {
                    foundSearchButton = true;

                    function openSearch() {
                        setIsSearchOpen(true);
                        if (searchButtonSpec.onSearchOpen) {
                            searchButtonSpec.onSearchOpen();
                        }
                    }

                    function closeSearch() {
                        setIsSearchOpen(false);
                        if (searchButtonSpec.onSearchClose) {
                            searchButtonSpec.onSearchClose();
                        }
                    }

                    function changeSearch(event: ChangeEvent<HTMLInputElement>) {
                        if (searchButtonSpec.onSearch) {
                            setSearchBoxValue(searchButtonSpec.onSearch(event));
                        }
                        else {
                            setSearchBoxValue(event.target.value);
                        }
                    }

                    buttonElem
                        = !isSearchOpen
                            ? <button
                                className="search"
                                onClick={openSearch}
                                aria-label={button.label}>
                                <i className={"fas " + button.icon}></i>
                            </button>
                            : <input
                                ref={searchBoxRef}
                                className="search"
                                type="text"
                                aria-label={button.label}
                                placeholder="Search..."
                                onChange={changeSearch}
                                value={searchBoxValue}
                            />;
                }
                else {
                    throw new Error("At most one search button per expander group.");
                }
                break;
            case "link":
                if (!isSearchOpen) {
                    buttonElem = <Link
                        className="action-link"
                        to={button.url}
                        aria-label={button.label}>
                        <i className={"fas " + button.icon}></i>
                        {button.text ? <span className="text">{button.text}</span> : <></>}
                    </Link>;
                }
                break;
        }
        buttonElems.push(buttonElem);
    }

    return <div className="menu-expander">
        <div className={"expander-controls"}>
            <button className="expansion-control" onClick={toggleExpansion}>
                {props.isOpen ? <i className="fas fa-caret-down"></i> : <i className="fas fa-caret-right"></i>}
                <span>{props.title}</span>
            </button>
            {buttonElems.reduceRight((acc, x) => <>{acc}{x}</>, <></>)}
        </div>
        <div className={"expander-contents" + (props.isOpen ? "" : " closed")}>
            {props.children}
        </div>
    </div>;
}
