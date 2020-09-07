import { useContext } from 'react';
import CacheContext from '../contexts/CacheContext';
import Cache from '../classes/Cache';
import assert from 'assert';

export default function useCache(): Cache {
    let ctx = useContext(CacheContext);
    assert(ctx, "Cache should be defined.");
    return ctx;
}
