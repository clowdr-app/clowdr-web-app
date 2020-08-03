import React, { Component } from 'react';

import Landing from './Landing';
class Home extends Component {
    render() {
        // @ts-ignore     TS: @Jon/@Crista TS says that Landing needs an auth property...?
        return <Landing />
    }
}

export default Home;