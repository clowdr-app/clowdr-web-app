import React from "react";
import { Link, Redirect } from "react-router-dom";
import useHeading from "../../../hooks/useHeading";
import useUserRoles from "../../../hooks/useUserRoles";

export default function Tools() {
  const { isAdmin } = useUserRoles();

  useHeading("Admin tools");

    return !isAdmin
        ? <Redirect to="/notfound" />
        : <>
            <p>Please use the links below to access the available administration tools.</p>
            <ul>
                <li><Link to="/admin/program/upload/researchr">Program: Upload from Researchr</Link></li>
                <li><Link to="/admin/registration">Registrations</Link></li>
                <li><Link to="/admin/sidebar">Sidebar (logo &amp; theme)</Link></li>
                <li><Link to="/admin/sponsors">Sponsors</Link></li>
                <li><Link to="/admin/welcome">Welcome (/landing) page</Link></li>
            </ul>
        </>;
}
