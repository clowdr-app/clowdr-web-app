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
    placeholder?: string;

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
    const searchButtonRef = useRef<HTMLButtonElement>(null);
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
        else {
            searchButtonRef.current?.focus();
        }
    }, [isSearchOpen]);

    const buttonElems: Array<JSX.Element> = [];
    let foundSearchButton = false;
    for (const button of props.buttons) {
        let buttonElem = <></>;
        switch (button.type) {
            case "search":
                const searchButtonSpec = button;
                if (!foundSearchButton) {
                    foundSearchButton = true;

                    function openSearch() {
                        setIsSearchOpen(true);
                        searchButtonSpec.onSearchOpen?.();
                    }

                    function closeSearch() {
                        setIsSearchOpen(false);
                        searchButtonSpec.onSearchClose?.();
                    }

                    function changeSearch(event: ChangeEvent<HTMLInputElement>) {
                        if (searchButtonSpec.onSearch) {
                            setSearchBoxValue(searchButtonSpec.onSearch(event));
                        }
                        else {
                            setSearchBoxValue(event.target.value);
                        }
                    }

                    function onSearchBoxKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            closeSearch();
                        }
                    }

                    buttonElem
                        = !isSearchOpen
                            ? <button
                                className="search"
                                onClick={openSearch}
                                ref={searchButtonRef}
                                aria-label={button.label}>
                                <i className={"fas " + button.icon}></i>
                            </button>
                            : <div className="search-wrapper">
                                <input
                                    ref={searchBoxRef}
                                    className="search"
                                    type="text"
                                    aria-label={button.label}
                                    placeholder={button.placeholder ?? "Search..."}
                                    onChange={changeSearch}
                                    value={searchBoxValue}
                                    onKeyDown={(ev) => onSearchBoxKeyDown(ev)}
                                />
                                <button onClick={() => {
                                    closeSearch();
                                }} className="search-close-button">
                                    <i className="fas fa-times-circle"></i>
                                </button>
                            </div>;
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
                        <i className={button.icon}></i>
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
                <h2>{props.title}</h2>
            </button>
            {buttonElems.reduceRight((acc, x) => <>{acc}{x}</>, <></>)}
        </div>
        <div className={"expander-contents" + (props.isOpen ? "" : " closed")}>
            {props.children}
        </div>
    </div>;
}
