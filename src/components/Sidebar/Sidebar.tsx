import React, { useEffect, useRef, useState } from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import FooterLinks from '../FooterLinks/FooterLinks';
import { Link } from 'react-router-dom';
import MenuExpander, { ButtonSpec } from "./Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from './Menu/MenuGroup';
import Program from './Program';
import MenuItem from './Menu/MenuItem';
import { ProgramSession, ProgramSessionEvent } from '../../classes/DataLayer';

interface Props {
    open: boolean,
    toggleSidebar?: () => void
    doLogout?: () => void
}

function Sidebar(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const burgerButtonRef = useRef<HTMLButtonElement>(null);
    const [chatsIsOpen, setChatsIsOpen] = useState<boolean>(true);
    const [roomsIsOpen, setRoomsIsOpen] = useState<boolean>(true);
    const [programIsOpen, setProgramIsOpen] = useState<boolean>(true);
    const [chatSearch, setChatSearch] = useState<string | null>(null);
    const [roomSearch, setRoomSearch] = useState<string | null>(null);
    const [programSearch, setProgramSearch] = useState<string | null>(null);
    const [programSessions, setProgramSessions] = useState<Array<ProgramSession>>([]);
    const [programEvents, setProgramEvents] = useState<Array<ProgramSessionEvent>>([]);

    // TODO: When sidebar is occupying full window (e.g. on mobile), close it
    // when the user clicks a link.

    useEffect(() => {
        burgerButtonRef.current?.focus();
    }, [burgerButtonRef, props.open]);

    // TODO: Use 'M' key as a shortcut to open/close menu?
    // TODO: Use 'C/R/P' to jump focus to menu expanders
    // TODO: Document shortcut keys prominently on the /help page

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

    // TODO: Introduce a setInterval which refreshes the program view every minute or so
    useEffect(() => {
        async function updateSessionsAndEvents() {
            const now = Date.now();
            const sixtySecs = 60 * 1000;
            const twoHours = 2 * 60 * 60 * 1000;
            const endLimit = now;// - sixtySecs;
            const startLimit = now + twoHours;

            const sessionsP = ProgramSession.getAll(conf.id);
            const eventsP = ProgramSessionEvent.getAll(conf.id);
            const allSessions = await sessionsP;
            const allEvents = await eventsP;

            let sessions = allSessions
                .filter(x => x.endTime.getTime() >= endLimit
                    && x.startTime.getTime() <= startLimit);

            let events = allEvents
                .filter(x => x.endTime.getTime() >= endLimit
                    && x.startTime.getTime() <= startLimit);
            
            let eventsSessionIds = [...new Set(events.map(x => x.sessionId))];
            
            sessions = sessions.filter(x => !eventsSessionIds.includes(x.id));
            
            setProgramSessions(sessions);
            setProgramEvents(events);
        }

        updateSessionsAndEvents();
    }, [programSearch, conf.id]);

    if (props.open) {
        let sideBarHeading = <h1 aria-level={1}><Link to="/" aria-label="Conference homepage">{conf.shortName}</Link></h1>;
        let headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>

        let chatsButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search all chats", icon: "fa-search",
                onSearch: (event) => {
                    setChatSearch(event.target.value);
                    return event.target.value;
                },
                onSearchClose: () => {
                    setChatSearch(null);
                }
            },
            { type: "link", label: "Show all chats", icon: "fa-globe-europe", url: "/chat" },
            { type: "link", label: "Create new chat", icon: "fa-plus", url: "/chat/new" }
        ];
        let roomsButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search all rooms", icon: "fa-search",
                onSearch: (event) => {
                    setRoomSearch(event.target.value);
                    return event.target.value;
                },
                onSearchClose: () => {
                    setRoomSearch(null);
                }
            },
            { type: "link", label: "Show all rooms", icon: "fa-globe-europe", url: "/room" },
            { type: "link", label: "Create new room", icon: "fa-plus", url: "/chat/new" }
        ];
        let programButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search whole program", icon: "fa-search",
                onSearch: (event) => {
                    setProgramSearch(event.target.value);
                    return event.target.value;
                },
                onSearchClose: () => {
                    setProgramSearch(null);
                }
            },
            { type: "link", label: "Show whole program", icon: "fa-globe-europe", url: "/program" },
            // TODO: If admin: { type: "link", label: "Create new program event", icon: "fa-plus", url: "/chat/new" }
        ];

        let mainMenuItems: MenuGroupItems = [
            { key: "watched-items", element: <MenuItem title="Watched items" label="Watched items" action="/watched" /> },
            { key: "profile", element: <MenuItem title="Profile" label="Profile" action="/profile" /> },
            { key: "contact-moderators", element: <MenuItem title="Contact moderators" label="Contact moderators" action="/moderators" /> },
            // TODO: If admin: { key: "admin", element: <MenuItem title="Admin tools" label="Admin tools" action="/admin"><></></MenuItem> }
        ];

        // TODO: Generate chat items from database (inc. any current search)
        // TODO: "New messages in this chat" boldification
        // TODO: For DMs, user presence (hollow/solid-green dot)
        let chatMenuItems: MenuGroupItems = [
            {
                key: "chat-1",
                element:
                    <MenuItem title="Lobby" label="Lobby chat" icon={<i className="fas fa-hashtag"></i>} action="/chat/1" bold={true} />
            },
            {
                key: "chat-2",
                element:
                    <MenuItem title="Haskell Symposium" label="Haskell Symposium chat" icon={<i className="fas fa-hashtag"></i>} action="/chat/2" />
            },
            {
                key: "chat-3",
                element:
                    <MenuItem title="Benjamin Pierce" label="Chat with Benjamin Pierce" icon={<i className="fas fa-circle" style={{ color: "green" }}></i>} action="/chat/3" />
            },
            {
                key: "chat-4",
                element:
                    <MenuItem title="Crista Lopes" label="Chat with Crista Lopes" icon={<i className="far fa-circle"></i>} action="/chat/4" bold={true} />
            },
        ];

        // TODO: Generate room items from database (inc. any current search)
        let roomMenuItems: MenuGroupItems = [
            {
                key: "room-1",
                element:
                    <MenuItem title="Breakout room 1" label="Breakout room 1" icon={<i className="fas fa-video"></i>} action="/room/1">
                        <ul>
                            <li>Benjamin Pierce</li>
                            <li>Crista Lopes</li>
                            <li>Jonathan Bell</li>
                        </ul>
                    </MenuItem>
            },
            {
                key: "room-2",
                element:
                    <MenuItem title="Breakout room 2" label="Breakout room 2" icon={<i className="fas fa-video"></i>} action="/room/2">
                        <ul>
                            <li>Ed Nutting</li>
                            <li>Harry Goldstein</li>
                            <li>Alan Turing</li>
                            <li>The one and only SPJ</li>
                            <li>Stephanie Weirich</li>
                        </ul>
                    </MenuItem>
            },
            {
                key: "room-3",
                element:
                    <MenuItem title="Large room" label="Large room" icon={<i className="fas fa-video"></i>} action="/room/3">
                        <ul>
                            <li>Alonzo Church</li>
                            <li>Ada Lovelace</li>
                            <li className="plus-bullet">11 more people...</li>
                        </ul>
                    </MenuItem>
            },
        ];

        // TODO: Fetch either ongoing and upcoming items or search whole program
        // TODO: Include events from sessions, only include session if it has no events

        const programTimeBoundaries: Array<number> = [
            0, 15, 30, 60, 120
        ];
        let program = <Program
            sessions={programSessions}
            events={programEvents}
            timeBoundaries={programTimeBoundaries} />;

        return <div className="sidebar">
            {headerBar}
            <div className="sidebar-scrollable">
                <div className="menu">
                    <MenuGroup items={mainMenuItems} />

                    <MenuExpander
                        title="Chats"
                        isOpen={chatsIsOpen}
                        buttons={chatsButtons}
                        onOpenStateChange={() => setChatsIsOpen(!chatsIsOpen)}
                    >
                        <MenuGroup items={chatMenuItems} />
                    </MenuExpander>

                    <MenuExpander
                        title="Rooms"
                        isOpen={roomsIsOpen}
                        buttons={roomsButtons}
                        onOpenStateChange={() => setRoomsIsOpen(!roomsIsOpen)}
                    >
                        <MenuGroup items={roomMenuItems} />
                    </MenuExpander>

                    <MenuExpander
                        title="Program"
                        isOpen={programIsOpen}
                        buttons={programButtons}
                        onOpenStateChange={() => setProgramIsOpen(!programIsOpen)}
                    >
                        {program}
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
