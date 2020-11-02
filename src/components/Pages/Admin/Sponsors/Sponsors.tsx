import React from "react";
import { Redirect } from "react-router-dom";
import useUserRoles from "../../../../hooks/useUserRoles";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import CreateSponsor from "./CreateSponsor";
import "./Sponsors.scss";

interface Props {}

export default function Sponsors() {
    const { isAdmin } = useUserRoles();

    const contents = (
        <>
            <CreateSponsor />
        </>
    );

    return isAdmin === null ? (
        <LoadingSpinner />
    ) : isAdmin ? (
        contents
    ) : (
        <Redirect to="/notfound" />
    );
}
