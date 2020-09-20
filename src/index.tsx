import Parse from "parse";
import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import App from './components/App/App';
import { BrowserRouter } from 'react-router-dom';
import assert from 'assert';
import dotenv from 'dotenv';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.scss';
import "normalize.css";

dotenv.config();

assert(process.env.REACT_APP_PARSE_APP_ID, "REACT_APP_PARSE_APP_ID not provided.");
assert(process.env.REACT_APP_PARSE_JS_KEY, "REACT_APP_PARSE_JS_KEY not provided.");
assert(process.env.REACT_APP_PARSE_DATABASE_URL, "REACT_APP_PARSE_DATABASE_URL not provided.");
// For LiveQuery
assert(process.env.REACT_APP_PARSE_DOMAIN, "REACT_APP_PARSE_DOMAIN not provided.");

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

ReactDOM.render(
    <React.StrictMode>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
            <ToastContainer limit={3} />
            <App />
        </BrowserRouter>
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
