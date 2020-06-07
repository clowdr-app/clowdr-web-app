import React from 'react';
import Parse from "parse";
import ParseLiveContext from "../parse/context";

class VideoWatchers extends React.Component {
    constructor(props) {
        // props.video and props.expanded available here
        super(props);
        this.state = {
            count: 0,
            addme: false
        };
        this._isMounted = false;
    }

    componentDidUpdate(prevProps, prevState) {
    }

    async getWatchersRecord() {
        const name = this.props.video.get("title");
        const WatchersCount = Parse.Object.extend("LiveVideoWatchers");
        let q = new Parse.Query(WatchersCount);
        q.equalTo("name", name);
        console.log("Getting count for " + name);
        const record = await q.first();
        return record;
    }

    componentDidMount() {
        console.log("videoWatchers mounted. Subscription? " + this.sub);
        this._isMounted = true;

        this.getWatchersRecord().then(record => {
            console.log(JSON.stringify(record));
            this.setState({count: record.get("count")});
            if (this.props.expanded && !this.state.addme) {
                console.log("Incrementing " + JSON.stringify(record));
                record.increment("count");
                record.save();
            }    
        });

        let q = new Parse.Query("LiveVideoWatchers");
        const name = this.props.video.get("title");
        q.equalTo("name", name);
//        this.sub = this.props.parseLive.subscribe(q);
        q.subscribe().then(subscription => {
            this.sub = subscription;
            this.sub.on('update', watchRecord => {
                console.log("Update received: watchers count for " + watchRecord.get("name") + " is now " + watchRecord.get("count") + ". Local count=" + this.state.count);
                // const adjustedCount = watchRecord.get("count"); // adjust when it's our update
                if (this._isMounted) {
                    const myOwnUpdate = this.props.expanded && !this.state.addme;
                    console.log("My own update? " + myOwnUpdate);
                    const adjustedCount = (myOwnUpdate ? -1 : 0)
                    this.setState({ count: watchRecord.get("count") + adjustedCount });
                    if (myOwnUpdate)
                        this.setState({addme: true})
                }
                else
                    console.log("VideoWatchers is unmounted");
            });
    
        });

    }

    componentWillUnmount() {
        console.log("VideoWatchers unmounted");

        if (this.props.expanded) {
            this.getWatchersRecord().then(record => {
                console.log("Decrementing " + JSON.stringify(record));
                record.decrement("count");
                record.save();
            });
            this.setState({addme: false});
        }

        if (this.sub) {
            this.sub.unsubscribe();
            console.log("Unsubscribed");
        }

        this._isMounted = false;
    }

    render() {
        return (
            <div>{"Watching now: " + this.state.count}
            </div>
        )
    }
}

const LiveVideoWatchers = (props) => (
    <ParseLiveContext.Consumer>
        {value => (
            <VideoWatchers {...props} parseLive={value}/>
        )}
    </ParseLiveContext.Consumer>
);

export default LiveVideoWatchers;