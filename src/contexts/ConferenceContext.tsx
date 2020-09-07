import React from 'react';
import { Conference } from '../classes/Data';

const Context = React.createContext<Conference | null>(null);

export default Context;
