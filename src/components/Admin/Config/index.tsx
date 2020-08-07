import React from "react";
import Configuration from "./Configuration";
import AuthUserContext from "../../Session/context";
import { ClowdrAppState } from "../../../ClowdrTypes";

interface ConfigurationProps {
    auth: ClowdrAppState,
}

const ConfigurationAdminArea = (props: ConfigurationProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> : //@ts-ignore
            <Configuration {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ConfigurationAdminArea;
