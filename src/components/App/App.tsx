import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import './App.sass';

interface IAppProps {
}

interface IAppState {
}

type Props = IAppProps & RouteComponentProps;

function App(props: Props) {
    // const [state, setState] = useState<IAppState>({});

    return <div className="app"></div>;
}

export default withRouter(App);
