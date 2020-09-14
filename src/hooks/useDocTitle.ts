import { useContext } from 'react';
import DocTitleContext, { DocTitleState } from '../contexts/DocTitleContext';
import assert from 'assert';

export default function useDocTitle(): DocTitleState {
    let ctx = useContext(DocTitleContext);
    assert(ctx, "Document title control should be defined.");
    return ctx;
}
