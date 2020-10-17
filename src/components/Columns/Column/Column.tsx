import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./Column.scss";

export interface Item<RenderData = undefined> {
    key: string;
    text: string;
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
}

export default function Column<RenderData = undefined>(props: Props<RenderData>) {

    const [searchString, setSearchString] = useState<string>("");

    const search = <div className="column__search">
        <i className="fas fa-search column__search__icon"></i>
        <input className="column__search__input" defaultValue={searchString} onChange={e => setSearchString(e.target.value)} type="search" />
    </div>

    const items = props.items
        ? props.items.length > 0
            ? (searchString.length >= 3 ?
                props.items
                    .filter(item => item.text.toLowerCase().includes(searchString.toLowerCase()))
                : props.items
            ).sort(props.sort ? props.sort : (a, b) => a.text.localeCompare(b.text))
                .map(item => {
                    return <li key={item.key} className="column-item">
                        {props.itemRenderer.render(item)}
                    </li>;
                })
            : <p>{props.emptyMessage}</p>
        : <LoadingSpinner message={props.loadingMessage} />;

    return <div className={`column ${props.className}`}>
        {props.children}
        {props.items && props.items.length > 0 && search}
        <ul className="column__items" >
            {items}
        </ul>
    </div>
}

export interface ItemRenderer<RenderData> {
    render(item: Item<RenderData>): JSX.Element;
}

export class DefaultItemRenderer implements ItemRenderer<undefined> {
    render(item: Item<undefined>): JSX.Element {
        return item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>;
    }
}
