import React from "react";
import Clowdr from "./Clowdr";
import AuthUserContext from "../../Session/context";

const ClowdrAdminArea = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Clowdr {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default ClowdrAdminArea;
