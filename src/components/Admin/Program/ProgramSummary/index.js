import React from "react";
import ProgramSummary from "./ProgramSummary";
import AuthUserContext from "../../../Session/context";

const ProgramAdminArea = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramSummary {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ProgramAdminArea;
