import React from "react";
import Clowdr from "./Clowdr";
import AuthUserContext from "../../Session/context";
import AdminClowdrProps from "./Clowdr"

const ClowdrAdminArea = (props: AdminClowdrProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :  // @ts-ignore  TS: Can value really be null here?
                <Clowdr {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);

export default ClowdrAdminArea;
