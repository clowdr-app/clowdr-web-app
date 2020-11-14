import { Tooltip } from "@material-ui/core";
import React, { useState } from "react";
import { generateAndDownloadCSV } from "../../../../../classes/Utils";
import AsyncButton from "../../../../AsyncButton/AsyncButton";
import "./EditorTable.scss";

export const NewItemKey = "<<¦¦new¦¦>>";

type FieldFormat<I, K extends keyof I, F> = {
    name: string;
    order: number;
    filter?: {
        value: F;
        apply: (value: F, data: I[K]) => boolean;
        render: () => JSX.Element;
    };
    render: (data: I[K]) => JSX.Element;
    renderEditor: (key: string, data?: I[K]) => JSX.Element;
};

export type FilterTypes<I> = { [K in keyof I]?: any };

export interface TableEditorProps<I, F extends FilterTypes<I>> {
    data: { [K: string]: I };
    sort: (x: I, y: I) => -1 | 0 | 1;
    fields: {
        [K in keyof I]?: FieldFormat<I, K, F[K]>;
    };

    selectedKeys: string[];
    highlightedKeys?: string[];
    toggleSelection: (key: string) => void;
    select: (keys: string[]) => void;

    addRow: {
        beingAdded?: Partial<I>;
        incomplete?: string;
        begin: () => void;
        cancel: () => void;
        complete: () => Promise<void> | void;
    };
    deleteRows?: (keys: Array<string>) => Promise<void> | void;
}

export default function EditorTable<I, F extends FilterTypes<I>>(props: TableEditorProps<I, F>) {
    const [addAtStart, setAddAtStart] = useState<boolean>(false);

    const fieldNames
        = Object
            .keys(props.fields)
            .sort((x, y) => {
                const formatX = props.fields[x];
                const formatY = props.fields[y];
                if (formatX.order < formatY.order) {
                    return -1;
                }
                else if (formatX.order === formatY.order) {
                    return 0;
                }
                else {
                    return 1;
                }
            });

    const itemKeys = Object
        .keys(props.data)
        .filter(itemKey =>
            fieldNames.every(fieldName => {
                const item = props.data[itemKey];
                const field = props.fields[fieldName] as FieldFormat<I, keyof I, F>;
                if (field.filter) {
                    return field.filter.apply(field.filter.value, item[fieldName]);
                }
                return true;
            })
        )
        .sort((keyX, keyY) => {
            const itemX = props.data[keyX];
            const itemY = props.data[keyY];
            return props.sort(itemX, itemY);
        });

    const headings: Array<JSX.Element> = [
        <th key="<<select>>" className="select-heading">
            {!props.addRow?.beingAdded
                ? <>
                    <span>({itemKeys.length})</span>
                    <input
                        className="select-row-box"
                        type="checkbox"
                        checked={itemKeys.every(key => props.selectedKeys.includes(key))}
                        onChange={(ev) => {
                            ev.stopPropagation();
                            if (ev.target.checked) {
                                props.select(itemKeys);
                            }
                            else {
                                props.select([]);
                            }
                        }}
                    />
                </>
                : <></>
            }
        </th>
    ];
    for (const fieldName of fieldNames) {
        const field = props.fields[fieldName] as FieldFormat<I, keyof I, F>;
        headings.push(
            <th key={fieldName}>
                <span>{field.name}</span>
                {field.filter ? <><br />{field.filter.render()}</> : <></>}
            </th>
        );
    }
    headings.push(
        <th key="<<delete>>"></th>
    );

    function renderCell<K extends keyof I>(fieldName: string, key: string, data: I[K], editing: boolean): JSX.Element {
        const fieldFormat = props.fields[fieldName] as FieldFormat<I, keyof I, F>;
        const content = (() => {
            if (editing) {
                return fieldFormat.renderEditor(key, data);
            }
            else {
                return fieldFormat.render(data);
            }
        })();
        return (
            <td key={fieldName}>
                {content}
            </td>
        );
    }

    function renderRow(key: string, item: I, editing: boolean): JSX.Element {
        const cells: Array<JSX.Element> = [];
        for (const fieldName of fieldNames) {
            const field = item[fieldName];
            cells.push(renderCell(fieldName, key, field, editing));
        }
        return (
            <tr
                key={key}
                onDoubleClick={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    props.select([key]);
                }}
                className={props.highlightedKeys?.includes(key) ? "highlight" : ""}
            >
                <td key="<<select>>">
                    {!props.addRow?.beingAdded
                        ? <input
                            className="select-row-box"
                            type="checkbox"
                            checked={props.selectedKeys.includes(key)}
                            onChange={(ev) => {
                                ev.stopPropagation();
                                props.toggleSelection(key);
                            }}
                        />
                        : <></>
                    }
                </td>
                {cells}
                {props.deleteRows
                    ? (
                        <td>
                            <AsyncButton
                                className="delete-item-button"
                                action={async () => {
                                    await props.deleteRows?.([key]);
                                }}
                            >
                                <i className="fas fa-trash-alt" />
                            </AsyncButton>
                        </td>
                    )
                    : <td></td>}
            </tr>
        );
    }

    let rows: Array<JSX.Element> = [];
    for (const itemKey of itemKeys) {
        const item = props.data[itemKey];
        rows.push(renderRow(itemKey, item, props.selectedKeys.length === 1 && props.selectedKeys[0] === itemKey));
    }

    if (props.addRow?.beingAdded) {
        function renderAddRow(item: Partial<I>, noContent: boolean): JSX.Element {
            const addRow = props.addRow;
            const cells: Array<JSX.Element> = [];
            for (const fieldName of fieldNames) {
                const field = item[fieldName];
                if (noContent) {
                    cells.push(<td key={fieldName}></td>);
                }
                else {
                    cells.push(renderCell(fieldName, NewItemKey, field, true));
                }
            }
            const completeButton = (
                <AsyncButton
                    className="complete-add-item-button"
                    action={async () => {
                        await addRow.complete();
                    }}
                    disabled={!!addRow.incomplete}
                >
                    <i className="fas fa-check-circle" />
                </AsyncButton>
            );
            return (
                <tr key={`<<new${noContent ? "-noContent" : ""}>>`}>
                    <td key="<<cancel>>">
                        <button
                            className="cancel-add-item-button"
                            onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                addRow.cancel();
                            }}
                        >
                            <i className="fas fa-times-circle" />
                        </button>
                    </td>
                    {cells}
                    <td key="<<complete>>">
                        {noContent
                            ? <></>
                            : addRow.incomplete
                                ? (
                                    <Tooltip title={addRow.incomplete}>
                                        <span>{completeButton}</span>
                                    </Tooltip>
                                )
                                : completeButton
                        }
                    </td>
                </tr>
            );
        }

        const addRowEl = renderAddRow(props.addRow.beingAdded, false);
        if (addAtStart) {
            rows = [addRowEl, ...rows];
        }
        else {
            if (rows.length > 0) {
                const emptyAddRowEl = renderAddRow(props.addRow.beingAdded, true);
                rows = [emptyAddRowEl, ...rows, addRowEl];
            }
            else {
                rows.push(addRowEl);
            }
        }
    }
    else if (props.addRow) {
        const addRow = props.addRow;
        function renderAddRow(idx: number) {
            return (
                <tr key={`<<add-item-${idx}>>`}>
                    <td key="<<select>>">
                        <button
                            className="start-add-item-button"
                            onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                addRow.begin();
                                setAddAtStart(idx === 0);
                            }}
                        >
                            <i className="fas fa-plus-circle" />
                        </button>
                    </td>
                    {fieldNames.map(name => <td key={name}></td>)}
                </tr>
            );
        }

        rows = [renderAddRow(0), ...rows];
        if (rows.length > 1) {
            rows.push(renderAddRow(1));
        }
    }

    return (
        <>
            <div className="editor-table-controls">
                <button
                    onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();

                        const data: Array<any> = [];
                        for (const itemKey of itemKeys) {
                            data.push(props.data[itemKey]);
                        }
                        generateAndDownloadCSV(data);
                    }}
                >
                    <i className="fas fa-file-download"></i> Download CSV
                </button>
            </div>
            <table className="editor-table">
                <thead>
                    <tr>{headings}</tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </>
    );
}
