import assert from "assert";
import React from "react";
import "./Editor.scss";
import EditorTable, { FilterTypes, NewItemKey, TableEditorProps } from "./EditorTable";

export type EditorProps<I, F extends FilterTypes<I>> = TableEditorProps<I, F> & {
    renderSingleEditor?: (key: string) => JSX.Element;
    renderMultiEditor: (keys: string[]) => JSX.Element;
};

export default function Editor<I, F extends FilterTypes<I>>(props: EditorProps<I, F>) {
    const selectedKeys = props.addRow?.beingAdded ? [] : props.selectedKeys;
    return (
        <div className="editor">
            <div className="table">
                <EditorTable {...props} selectedKeys={selectedKeys} />
            </div>
            {selectedKeys.length > 1 || ((selectedKeys.length === 1 || props.addRow?.beingAdded) && props.renderSingleEditor)
                ? (
                    <div className="details">
                        {selectedKeys.length === 0
                            ? props.renderSingleEditor ? props.renderSingleEditor(NewItemKey) : <></>
                            : selectedKeys.length === 1
                                ? props.renderSingleEditor ? props.renderSingleEditor(selectedKeys[0]) : <></>
                                : (
                                    <>
                                        <h3>Edit many</h3>
                                        {props.deleteRows
                                            ? (
                                                <div>
                                                    <label>Delete all selected?</label>
                                                    <button
                                                        className="delete-many-button"
                                                        onClick={(ev) => {
                                                            ev.preventDefault();
                                                            ev.stopPropagation();
                                                            assert(props.deleteRows);
                                                            props.deleteRows(props.selectedKeys);
                                                        }}
                                                    >
                                                        <i className="fas fa-trash-alt" />
                                                    </button>
                                                </div>
                                            )
                                            : <></>
                                        }
                                        {props.renderMultiEditor(selectedKeys)}
                                    </>
                                )
                        }
                    </div>
                )
                : <></>
            }
        </div>
    );
}
