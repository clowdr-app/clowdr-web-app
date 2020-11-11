import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import "./Column.scss";

export interface Item<RenderData = undefined> {
    key: string;
    text: string;
    searchText?: string[];
    link?: string;
    renderData: RenderData;
}

interface Props<RenderData> {
    className?: string;
    loadingMessage?: string;
    emptyMessage?: string;
    items?: Item<RenderData>[];
    sort?(a: Item<RenderData>, b: Item<RenderData>): number;
    itemRenderer: ItemRenderer<RenderData>;
    children?: JSX.Element;
    windowWithItemHeight?: number;
}

export default function Column<RenderData = undefined>(props: Props<RenderData>) {
    const [searchString, setSearchString] = useState<string>("");

    const search = (
        <div className="column__search">
            <i className="fas fa-search column__search__icon"></i>
            <input
                className="column__search__input"
                defaultValue={searchString}
                onChange={e => setSearchString(e.target.value)}
                type="search"
                aria-label="Items in list"
            />
        </div>
    );

    const items = useMemo(() => {
        return (props.items ?? [])
            .filter(item =>
                searchString.length >= 3
                    ? item.searchText
                        ? item.searchText.some(t => t.toLowerCase().includes(searchString.toLowerCase()))
                        : item.text.toLowerCase().includes(searchString.toLowerCase())
                    : true
            )
            .sort(props.sort ? props.sort : (a, b) => a.text.localeCompare(b.text));
    }, [props.items, props.sort, searchString]);

    function renderListItem(data: ListChildComponentProps | { index: number }): JSX.Element {
        if (items && items.length > data.index) {
            return (
                <div
                    key={items[data.index].key}
                    className="column-item"
                    style={"style" in data ? data.style : undefined}
                >
                    {props.itemRenderer.render(items[data.index])}
                </div>
            );
        }
        return <></>;
    }

    return (
        <div className={`column ${props.className}`}>
            {props.children}
            {props.items && props.items.length > 0 && search}
            {props.items ? (
                <div className="column__contents">
                    {items.length > 0 ? (
                        props.windowWithItemHeight !== undefined ? (
                            <AutoSizer>
                                {({ height, width }) => (
                                    <List
                                        height={height}
                                        width={width}
                                        itemCount={items.length ?? 0}
                                        itemSize={props.windowWithItemHeight ?? 0}
                                    >
                                        {renderListItem}
                                    </List>
                                )}
                            </AutoSizer>
                        ) : (
                            items.map((_item, i) => renderListItem({ index: i }))
                        )
                    ) : (
                        <p>{props.emptyMessage ?? "No items"}</p>
                    )}
                </div>
            ) : (
                <LoadingSpinner />
            )}
        </div>
    );
}

export interface ItemRenderer<RenderData> {
    render(item: Item<RenderData>): JSX.Element;
}

export class DefaultItemRenderer implements ItemRenderer<undefined> {
    render(item: Item<undefined>): JSX.Element {
        return item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>;
    }
}
