import React from "react";
import ProgramSummary from "./ProgramSummary";
import AuthUserContext from "../../../Session/context";
import { ClowdrAppState } from "../../../../ClowdrTypes";

interface ProgramSummaryProps {
    auth: ClowdrAppState,
}

const ProgramAdminArea = (props: ProgramSummaryProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> : //@ts-ignore
            <ProgramSummary {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ProgramAdminArea;
