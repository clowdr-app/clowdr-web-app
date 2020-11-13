import React from "react";
import ParticipantList from "../ParticipantList/ParticipantList";
import { makeStyles, Theme } from "@material-ui/core/styles";
import MainParticipant from "../MainParticipant/MainParticipant";
import usePresenting from "../VideoProvider/usePresenting/usePresenting";
import { useAppState } from "../../state";
import clsx from "clsx";

type StyleProps = {
    preferredMode: "sidebar" | "fullwidth";
    presenting: "presenting" | "not presenting";
};

const useStyles = makeStyles<Theme, StyleProps>(theme => ({
    container: props => ({
        position: "relative",
        height: "100%",
        display: "grid",
        gridTemplateColumns:
            props.preferredMode === "sidebar" && props.presenting === "not presenting"
                ? "1fr"
                : `1fr ${theme.sidebarWidth}px`,
        gridTemplateRows: "100%",
        [theme.breakpoints.down("sm")]: {
            gridTemplateColumns: `100%`,
            gridTemplateRows: `1fr ${theme.sidebarMobileHeight + 26}px`,
            overflow: "auto",
        },
    }),
}));

export default function Room() {
    const { preferredMode } = useAppState();
    const presenting = usePresenting();
    const classes = useStyles({ preferredMode, presenting });

    return (
        <div className={clsx(classes.container)}>
            {presenting === "presenting" ? <MainParticipant /> : <></>}
            <ParticipantList gridView={presenting === "not presenting"} />
        </div>
    );
}
