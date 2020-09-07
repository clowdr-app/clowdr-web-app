import React from 'react';

import GeoLocationContext from './context';

const GEOIP_API = 'https://geolocation-db.com/json/redux';
var geoLocation = undefined;

const withGeoLocation = Component => {
    class GeoLocation extends React.Component {
        constructor(props) {
            super(props);

            this.state = {
                geoloc: geoLocation
            };

            if (typeof geoLocation === 'undefined') {

                fetch(GEOIP_API)
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            console.log("Unable to obtain geo-location information!");
                            return { country_code: "US" }; // default
                        }
                    })
                    .then(data => {
                        console.log(JSON.stringify(data));
                        geoLocation = data;
                        this.setState({ geoloc: geoLocation });
                    })
            }
        }

        render() {
            return (
                <GeoLocationContext.Provider value={this.state.geoloc} >
                    <Component {...this.props} />
                </GeoLocationContext.Provider>
            );
        }
    }

    return GeoLocation;
};

export default withGeoLocation;
