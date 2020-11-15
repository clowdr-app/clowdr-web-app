import React, { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import Parse from "parse";
import useHeading from "../../../../hooks/useHeading";
import "./Analytics.scss";
import useConference from "../../../../hooks/useConference";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";

type RawData = {
    time: Date;
    key: string;
    value: number;
};

type RawAnalyticsData = {
    errorsCounts: RawData;
    chatsCounts: RawData;
    roomsCounts: RawData;
    usersCounts: RawData;
    activeRoomMemberCounts: { [K: number]: number };
    messagesCounts: { [K: number]: number };
};

export default function AdminAnalytics() {
    const conference = useConference();

    useHeading("Admin: Analytics");

    const [rawData, setRawData] = useState<RawAnalyticsData>();
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

    useSafeAsync(async () => {
        const data = await Parse.Cloud.run("analytics-summaries", { conference: conference.id });
        console.log(data);
        return data;
    }, setRawData, [conference.id, lastUpdateTime], "AdminAnalytics:setRawData");

    useEffect(() => {
        const i = setInterval(() => {
            setLastUpdateTime(Date.now());
        }, 1000 * 60 * 10);
        return () => {
            clearInterval(i);
        };
    }, []);

    const renderChart = (vals: any[], title: string) => {
        vals = vals
            .map(x => ({
                time: typeof x.time !== "number" ? x.time.getTime() : x.time,
                value: x.value
            }))
            .sort((x, y) => x.time - y.time);
        return (
            <div className="line-chart-wrapper">
                <h3>{title}</h3>
                <LineChart
                    width={400} height={300} data={vals}
                    margin={{ bottom: 20 }}
                >
                    <CartesianGrid />
                    <XAxis dataKey="time" label={{ value: "Date/time", dy: 20 }} tickFormatter={v => new Date(v).toLocaleTimeString()} />
                    <YAxis />
                    <Tooltip
                        wrapperStyle={{
                            borderColor: 'white',
                            boxShadow: '2px 2px 3px 0px rgb(204, 204, 204)',
                        }}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#666666' }}
                        labelFormatter={v => new Date(v).toLocaleTimeString()}
                    />
                    <Line dataKey="value" stroke="#ff7300" dot={false} />
                </LineChart>
            </div>
        );
    };

    const errorVals = rawData ? Object.values(rawData.errorsCounts) : [];
    const chatVals = rawData ? Object.values(rawData.chatsCounts) : [];
    const roomVals = rawData ? Object.values(rawData.roomsCounts) : [];
    const userVals = rawData ? Object.values(rawData.usersCounts) : [];
    const roomMemberVals = rawData ? Object.keys(rawData.activeRoomMemberCounts).reduce((acc, key) => [...acc, {
        time: new Date(parseInt(key, 10)),
        value: rawData.activeRoomMemberCounts[key]
    }], [] as any[]) : [];
    const messagesVals = rawData ? Object.keys(rawData.messagesCounts).reduce((acc, key) => [...acc, {
        time: new Date(parseInt(key, 10)),
        value: rawData.messagesCounts[key]
    }], [] as any[]) : [];
    return (
        <div className="admin-analytics">
            {rawData ? (
                <>
                    {renderChart(userVals, "Users")}
                    {renderChart(messagesVals, "New messages")}
                    {renderChart(roomMemberVals, "Active Users in Breakout Rooms")}
                    {renderChart(chatVals, "Chats")}
                    {renderChart(roomVals, "Rooms")}
                    {renderChart(errorVals, "Errors")}
                </>
            )
                : <LoadingSpinner />
            }
        </div>
    );
}
