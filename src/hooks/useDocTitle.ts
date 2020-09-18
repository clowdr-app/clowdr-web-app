import { useContext, useEffect } from 'react';
import DocTitleContext from '../contexts/DocTitleContext';
import assert from 'assert';

export default function useDocTitle(title: string): void {
    const _ctx = useContext(DocTitleContext);
    assert(_ctx, "Setter for document title should be defined.");
    const ctx = _ctx;

    useEffect(() => {
        ctx(title);
    }, [ctx, title]);
}
