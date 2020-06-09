const LiveVideoSourceMappings = {
    YouTube : {
        url : "https://www.youtube.com/embed/",
        vars : {
            mute : 1,
            autoplay : 1,
            version: 3,
            enablejsapi: 1
        }
    },
    Twitch : {
        url : "https://player.twitch.com/",
        vars : {
            mute : 1,
            autoplay : 1
        }
    },
    iQIYI : {
        url : "http://m3u8live.video.iqiyi.com/tslive/liveugc/",
        vars : {
            pv : 0.2,
            atype : "qiyi",
            qd_tvid: "3104576123",
            qd_vipres: 0,
            qd_scc: "35c08a7820bd1a04d83bc8c8aa1d1003",
            qd_sc: "f3b55e56a4b2b155fed75e00a60c26be",
            qd_src: "01010031010000000000",
            qd_ip: "72603d2c",
            qd_uid: 0,
            qd_tm: "1591621238950",
            qd_vip: 0
        }
    },
}

//http://m3u8live.video.iqiyi.com/tslive/liveugc/rqy_alteuytj/rqy_alteuytj.m3u8?pv=0.2&atype=qiyi&qd_tvid=3104576123&qd_vipres=0&qd_scc=35c08a7820bd1a04d83bc8c8aa1d1003&qd_sc=f3b55e56a4b2b155fed75e00a60c26be&qd_src=01010031010000000000&qd_ip=72603d2c&qd_uid=0&qd_tm=1591621238950&qd_vip=0">


export function videoURLFromData(src, id) {
//    console.log("videoURLFromData " + src + " " + id);
    const queryVars = Object.keys(LiveVideoSourceMappings[src].vars);
    const video_url = LiveVideoSourceMappings[src].url + id + '?' + queryVars.map(k => `${k}=${LiveVideoSourceMappings[src].vars[k]}&`).join('');
    console.log(video_url);
    return video_url;
}

