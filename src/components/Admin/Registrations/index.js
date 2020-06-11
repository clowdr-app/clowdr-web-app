import React from "react";
import Registrations from "./Registrations";
import AuthUserContext from "../../Session/context";

const RegistrationsAdminArea = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Registrations {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default RegistrationsAdminArea;
