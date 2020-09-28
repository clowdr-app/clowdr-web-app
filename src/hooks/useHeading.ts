import { useContext, useEffect } from 'react';
import HeadingContext, { HeadingState } from '../contexts/HeadingContext';
import assert from 'assert';

export default function useHeading(heading: string | HeadingState): void {
    const _ctx = useContext(HeadingContext);
    assert(_ctx, "Setter for heading state should be defined.");
    const ctx = _ctx;

    useEffect(() => {
        if (typeof heading === "string") {
            ctx({ title: heading });
        }
        else {
            ctx(heading);
        }
    }, [ctx, heading]);
}
