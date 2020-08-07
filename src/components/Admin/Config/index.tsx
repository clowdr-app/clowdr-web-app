import React from "react";
import Configuration from "./Configuration";
import AuthUserContext from "../../Session/context";
import { ClowdrState } from "../../../ClowdrTypes";

interface ConfigurationProps {
    auth: ClowdrState,
}

const ConfigurationAdminArea = (props: ConfigurationProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> : //@ts-ignore
            <Configuration {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ConfigurationAdminArea;
