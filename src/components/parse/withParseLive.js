import React from 'react';

import ParseLiveContext from './context';
import {Spin} from "antd";
import * as ROUTES from "../../constants/routes";
import Parse from "parse";


const withParseLive = Component => {
    class WithParseLive extends React.Component {
        constructor(props) {
            super(props);

            var client = new Parse.LiveQueryClient({
                applicationId: process.env.REACT_APP_PARSE_APP_ID,
                serverURL: process.env.REACT_APP_PARSE_DOMAIN,
                javascriptKey: process.env.REACT_APP_PARSE_JS_KEY,
            });
            client.open();

            this.state = {
                client: client
            };
        }

        render() {
            // if(this.state.loading)
            //     return <div>    <Spin size="large" />
            //     </div>
            return (
                <ParseLiveContext.Provider value={this.state} >
                    <Component {...this.props}  />
                </ParseLiveContext.Provider>
            );
        }
    }

    return WithParseLive;
};

export default withParseLive;
