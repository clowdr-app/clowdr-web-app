import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Sidebar.scss";
import useConference from "../../hooks/useConference";
import useMaybeUserProfile from "../../hooks/useMaybeUserProfile";
import FooterLinks from "../FooterLinks/FooterLinks";
import { Link } from "react-router-dom";
import { handleParseFileURLWeirdness, isBelowMediumBreakpoint } from "../../classes/Utils";
import useSafeAsync from "../../hooks/useSafeAsync";
import ChatsGroup from "./Groups/ChatsGroup";
import RoomsGroup from "./Groups/RoomsGroup";
import ProgramGroup from "./Groups/ProgramGroup";
import MainMenuGroup from "./Groups/MainGroup";
import SponsorsGroup from "./Groups/SponsorsGroup";

interface Props {
    open: boolean;
    toggleSidebar?: () => void;
    doLogout?: () => void;
}

const minSearchLength = 3;

export default function Sidebar(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const burgerButtonRef = useRef<HTMLButtonElement>(null);
    const [bgColour, setBgColour] = useState<string>("#761313");

    // TODO: When sidebar is occupying full window (e.g. on mobile), close it
    // when the user clicks a link.

    useSafeAsync(async () => {
        const details = await conf.details;
        return details.find(x => x.key === "SIDEBAR_COLOUR")?.value ?? "#761313";
    }, setBgColour, [conf, mUser], "Sidebar:setBgColour");

    useEffect(() => {
        burgerButtonRef.current?.focus();
    }, [burgerButtonRef, props.open]);

    // TODO: Use 'M' key as a shortcut to open/close menu?
    // TODO: Use 'C/R/P' to jump focus to menu expanders
    // TODO: Document shortcut keys prominently on the /help page

    const sideBarButton = (
        <div className="sidebar-button">
            <button
                aria-label="Open Menu"
                onClick={props.toggleSidebar}
                className={props.open ? " change" : ""}
                ref={burgerButtonRef}
            >
                <div className="bar1"></div>
                <div className="bar2"></div>
                <div className="bar3"></div>
            </button>
        </div>
    );

    const sideBarHeading = (
        <h1 aria-level={1} className={conf.headerImage ? "img" : ""}>
            <Link to="/" aria-label="Conference homepage">
                {conf.headerImage ? (
                    <img src={handleParseFileURLWeirdness(conf.headerImage) ?? undefined} alt={conf.shortName} />
                ) : (
                    conf.shortName
                )}
            </Link>
        </h1>
    );
    const headerBar = (
        <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>
    );

    const onItemClicked = useCallback(() => {
        if (isBelowMediumBreakpoint() && props.toggleSidebar) {
            props.toggleSidebar();
        }
    }, [props]);

    return (
        <>
            {!props.open ? sideBarButton : <></>}
            <div
                className={`sidebar${props.open ? "" : " closed"}`}
                style={{
                    backgroundColor: bgColour,
                }}
            >
                {headerBar}
                <div className="sidebar-scrollable">
                    <div className="menu">
                        {mUser ? (
                            <>
                                <MainMenuGroup onItemClicked={onItemClicked} />
                                <ChatsGroup minSearchLength={minSearchLength} onItemClicked={onItemClicked} />
                                <RoomsGroup minSearchLength={minSearchLength} onItemClicked={onItemClicked} />
                                <ProgramGroup minSearchLength={minSearchLength} onItemClicked={onItemClicked} />
                                <SponsorsGroup minSearchLength={minSearchLength} onItemClicked={onItemClicked} />
                            </>
                        ) : (
                            <></>
                        )}
                    </div>

                    <FooterLinks doLogout={mUser ? props.doLogout : undefined} />
                </div>
            </div>
        </>
    );
}
