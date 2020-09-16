import React, { useEffect, useRef, useState } from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import FooterLinks from '../FooterLinks/FooterLinks';
import { Link } from 'react-router-dom';
import MenuExpander, { ButtonSpec } from "./Menu/MenuExpander";
import MenuGroup from './Menu/MenuGroup';
import Program from './Program';

interface Props {
    open: boolean,
    toggleSidebar?: () => void
    doLogout?: () => void
}

function Sidebar(props: Props) {
    let conf = useConference();
    let mUser = useMaybeUserProfile();
    const burgerButtonRef = useRef<HTMLButtonElement>(null);
    let [chatsIsOpen, setChatsIsOpen] = useState<boolean>(true);
    let [roomsIsOpen, setRoomsIsOpen] = useState<boolean>(true);
    let [programIsOpen, setProgramIsOpen] = useState<boolean>(true);

    useEffect(() => {
        burgerButtonRef.current?.focus();
    }, [burgerButtonRef, props.open]);

    let sideBarButton = <div className="sidebar-button">
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
    </div>;

    if (props.open) {
        let sideBarHeading = <h1 aria-level={1}><Link to="/" aria-label="Conference homepage">{conf.shortName}</Link></h1>;
        let headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>

        let chatsButtons: Array<ButtonSpec> = [
            { type: "search", icon: "fa-search" },
            { type: "link", icon: "fa-globe-europe", url: "/chat" },
            { type: "link", icon: "fa-plus", url: "/chat/new" }
        ];
        let roomsButtons: Array<ButtonSpec> = [
            { type: "search", icon: "fa-search" },
            { type: "link", icon: "fa-globe-europe", url: "/room" },
            { type: "link", icon: "fa-plus", url: "/chat/new" }
        ];
        let programButtons: Array<ButtonSpec> = [
            { type: "search", icon: "fa-search" },
            { type: "link", icon: "fa-globe-europe", url: "/program" },
            // TODO: If admin: { type: "link", icon: "fa-plus", url: "/chat/new" }
        ];

        return <div className="sidebar">
            {headerBar}
            <div className="sidebar-scrollable">
                <div className="menu">
                    <MenuGroup>
                        <></>
                    </MenuGroup>

                    <MenuExpander
                        title="Chats"
                        isOpen={chatsIsOpen}
                        buttons={chatsButtons}
                        onOpenStateChange={() => setChatsIsOpen(!chatsIsOpen)}
                    >
                        <MenuGroup>
                            <>sdfasf  afsdf asdfsda fasf sadf asdf safd asdf asd
                              asdfasd fsa fasf sa fdsa dffdas fsadf asdf sadf 
                            as fsdf asdf asdf asdf sadfas dfsdfas fsdf asdfasdf
                            asdfsdfasdfasdfasdfasdfwertrergetrwhge</>
                        </MenuGroup>
                    </MenuExpander>

                    <MenuExpander
                        title="Rooms"
                        isOpen={roomsIsOpen}
                        buttons={roomsButtons}
                        onOpenStateChange={() => setRoomsIsOpen(!roomsIsOpen)}
                    >
                        <MenuGroup>
                            <></>
                        </MenuGroup>
                    </MenuExpander>

                    <MenuExpander
                        title="Program"
                        isOpen={programIsOpen}
                        buttons={programButtons}
                        onOpenStateChange={() => setProgramIsOpen(!programIsOpen)}
                    >
                        <Program />
                    </MenuExpander>
                </div>
                    
                <FooterLinks doLogout={mUser ? props.doLogout : undefined} />
            </div>
        </div>;
    }
    else {
        return sideBarButton;
    }
}

export default Sidebar;
