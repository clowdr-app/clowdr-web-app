import React from "react";
import { makeStyles, Theme } from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) => ({
    background: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
    },
    container: {
        position: "relative",
        flex: "1",
    },
    innerContainer: {
        display: "block",
        height: "auto",
        width: "calc(100% - 40px)",
        margin: "10px auto",
        maxWidth: "700px",

        borderRadius: "8px",
        border: "1px solid #ccc",
        overflow: "hidden",
        position: "relative",
    },
    content: {
        background: "white",
        width: "100%",
        padding: "2em",
        flex: 1,
    },
    subContentContainer: {
        marginTop: "1em",
        width: "100%",
    },
}));

interface IntroContainerProps {
    children: React.ReactNode;
    subContent?: React.ReactNode;
}

const IntroContainer = (props: IntroContainerProps) => {
    const classes = useStyles();

    return (
        <div className={classes.background}>
            <div className={classes.container}>
                <div className={classes.innerContainer}>
                    <div className={classes.content}>{props.children}</div>
                </div>
                {props.subContent && <div className={classes.subContentContainer}>{props.subContent}</div>}
            </div>
        </div>
    );
};

export default IntroContainer;
