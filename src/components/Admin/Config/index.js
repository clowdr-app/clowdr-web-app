import React from "react";
import Configuration from "./Configuration";
import AuthUserContext from "../../Session/context";

const ConfigurationAdminArea = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Configuration {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ConfigurationAdminArea;
