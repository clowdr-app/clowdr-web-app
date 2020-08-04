import React from "react";
import Registrations from "./Registrations";
import AuthUserContext from "../../Session/context";

const RegistrationsAdminArea = (props:any) => (  // TS: Can we do better than any?
    <AuthUserContext.Consumer>
        {value => (
            <Registrations {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);

export default RegistrationsAdminArea;
