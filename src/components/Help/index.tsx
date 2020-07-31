import * as React from "react";
import {Typography} from "antd";

class Help extends React.Component<{},{}> {
    render() {
        return <div>
            <Typography.Title level={2}>CLOWDR Support</Typography.Title>
            <p>CLOWDR is currently in beta, and in active development. If you find bugs or would like to request a new feature, please&nbsp;
                <a href="https://github.com/clowdr-app/clowdr-web-app/issues">make a request on our issue tracker</a>, and/or email <a href="mailto:jon@jonbell.net">Jonathan Bell</a>. CLOWDR is entirely
            open source, so pull requests are very welcome, as well!</p>
        </div>
    }
}

export default Help;