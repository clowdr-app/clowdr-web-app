import React from "react";
import { Link } from "react-router-dom";
import useHeading from "../../../hooks/useHeading";

export default function Tools() {
    useHeading("Admin tools");

    return (
        <>
            <p>Please use the links below to access the available administration tools.</p>
            <ul>
                <li>
                    <Link to="/admin/analytics">Analytics</Link>
                </li>
                <li>
                    <Link to="/admin/authors">Authors</Link>
                </li>
                {/*<li>
                    <Link to="/admin/program">Program</Link>
                </li>*/}
                <li>
                    <Link to="/admin/registration">Registrations</Link>
                </li>
                <li>
                    <Link to="/admin/sidebar">Sidebar (logo &amp; theme)</Link>
                </li>
                <li>
                    <Link to="/admin/sponsors">Sponsors</Link>
                </li>
                <li>
                    <Link to="/admin/welcome">Welcome (/landing) page</Link>
                </li>
            </ul>
        </>
    );
}
