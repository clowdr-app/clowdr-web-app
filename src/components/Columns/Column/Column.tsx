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
    items?: Item<RenderData>[];
    itemRenderer: ItemRenderer<RenderData>;
    children?: JSX.Element;
}

export default function Column<RenderData = undefined>(props: Props<RenderData>) {

    let [searchString, setSearchString] = useState<string>("");

    const search = <div className="column__search">
        <i className="fas fa-search column__search__icon"></i>
        <input className="column__search__input" defaultValue={searchString} onChange={e => setSearchString(e.target.value)} type="search" />
    </div>

    const items = props.items
        ? props.items
            .filter(item => item.text.toLowerCase().includes(searchString.toLowerCase()))
            .map(item => {
                return <li key={item.key} className="column-item">
                    {props.itemRenderer.render(item)}
                </li>;
            })
        : <LoadingSpinner message={props.loadingMessage} />;

    return <div className={`column ${props.className}`}>
        {props.children}
        {search}
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

export class FontAwesomeIconItemRenderer implements ItemRenderer<{ icon?: string }> {
    render(item: Item<{ icon?: string }>): JSX.Element {
        return <>
            <i className={`${item.renderData.icon} column-item__icon`}></i>
            {item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>}
        </>
    }
}