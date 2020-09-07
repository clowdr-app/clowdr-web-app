import React from 'react';
import { User } from '../classes/Data';

const Context = React.createContext<User | null>(null);

export default Context;
