
import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";

export default function BreakoutRoom() {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Breakout Room Y");
    }, [docTitle]);
    return <></>;
}