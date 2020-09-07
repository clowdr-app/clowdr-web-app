import React from 'react';
import Cache from '../classes/Cache';

const Context = React.createContext<Cache | null>(null);

export default Context;
