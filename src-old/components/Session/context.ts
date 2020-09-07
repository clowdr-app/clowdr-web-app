import React from 'react';
import { ClowdrState } from '../../ClowdrTypes';

const ClowdrContext = React.createContext<ClowdrState | null>(null);

export default ClowdrContext;
