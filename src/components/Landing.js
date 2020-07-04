import React, {Component} from "react";
import {NavLink} from "react-router-dom";
import LiveStreaming from "./LiveStreaming";
import {PageHeader} from "antd";

class Landing extends Component {
    render() {
        return <div>
            <h2>ICSE 2020 LIVE @ CLOWDR</h2>
            <p><strong>Welcome to Virtual ICSE 2020!</strong> We are using two main tools to connect everyone:
            </p>
            <div> 
                <ul>
                    <li>This Web app, CLOWDR, where you can view all the <NavLink to="/live/now">live</NavLink> and <NavLink to ="/live/past">past</NavLink> sessions,
                        ask questions during the live talks, engage in session-specific and paper-specific chats, view the <NavLink to="/exhibits/icse-2020-poster/grid">posters</NavLink>,
                        the <NavLink to="/exhibits/icse-2020-ACM-Student-Research-Competition/grid">Student Research Competition</NavLink>, and the <NavLink to="/exhibits/Demonstrations/grid">demos</NavLink>,
                        and talk to their authors, and meet up with peers in the <NavLink to="/lobby">Video Chat</NavLink> rooms.</li>
                    <li>The ICSE 2020 Slack channel, where you can get <a href="https://icse-2020.slack.com/app_redirect?channel=help" rel="noopener noreferrer" target="_blank">#help</a>,
                        volunteer for <a href="https://icse-2020.slack.com/app_redirect?channel=mentoring" rel="noopener noreferrer" target="_blank">#mentoring</a>, and organize your own
                        coffee breaks or BYOB in <a href="https://icse-2020.slack.com/app_redirect?channel=coffee-lounge" rel="noopener noreferrer" target="_blank">#coffee-lounge</a>.
                        If you are a presenter, you will also use Slack for meeting up with the live streaming team before the session, so pay
                        attention to them calling you there!</li>
                </ul>
            </div>
            <div><strong>What to do during virtual ICSE:</strong> Besides attending the live sessions, you can interact with other participants in many ways!
            <ul>
                <li>Chat and ask questions during the talks in the live rooms, and upvote existing questions. Questions will be answered, live, at the end of each talk.
                    Don't be shy about chatting during the talks: not only it will not be disruptive, but it will make the presenters feel the presence of the audience!
                </li>
                <li>Continue the conversation with the presenters by locating the papers in the Exhibit Hall, and using the paper-specific text channels.</li>
                <li>If you are a presenter, consider starting a video chat right after your session, so others can talk to you.</li>
                <li>If you are a senior member of the ICSE community, consider volunteering for one-on-one or small group mentoring sessions. Post your availability in
                    the <a href="https://icse-2020.slack.com/app_redirect?channel=mentoring" rel="noopener noreferrer" target="_blank">#mentoring</a> channel in Slack,
                    and meet up with younger people either in one of the existing video chat rooms or in your own video room.
                </li>
                <li>If you'd like to organize an informal public gathering, create one using the New Breakout Room button (please give it a meaningful name!), and announce it in 
                    the <a href="https://icse-2020.slack.com/app_redirect?channel=coffee-lounge" rel="noopener noreferrer" target="_blank">#coffee-lounge</a>.</li>
            <li> If you're just looking for casual conversation, feel free to drop into one of the hallway track rooms (Hallway 1, Hallway 2, ...) anytime. Or head to an empty Hallway room and see who else shows up.  You can also set your status to let people know what you're up to. A user-manual-under-contruction can be found <a href="https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm">here</a>.  </li>
            </ul>
            </div>
            <div><strong>Code of Conduct</strong>: Remember to adhere to
            the <a href="https://www.acm.org/special-interest-groups/volunteer-resources/officers-manual/policy-against-discrimination-and-harassment" rel="noopener noreferrer" target="_blank">
                ACM Policy Against Harassment</a> at all times. If you observe or are subject to innapropriate conduct, call it out:
                <ul>
                    <li>Use the red "report" icon in video chats</li>
                    <li>Send a direct Slack message to @Crista Lopes</li>
                </ul>
            </div>
            <p><b><a href="https://www.clowdr.org/" target="_blank">CLOWDR</a></b> is a community-driven effort to create a new platform to
                support <b>C</b>onferences <b>L</b>ocated <b>O</b>nline <b>W</b>ith <b>D</b>igital <b>R</b>esources. (Also, a clowder
                is <a href="https://www.merriam-webster.com/dictionary/clowder" rel="noopener noreferrer" target="_blank">a group of cats</a> &#128049;).
                CLOWDR is created by <a href="https://jonbell.net" rel="noopener noreferrer" target="_blank">Jonathan Bell</a>, <a href="https://www.ics.uci.edu/~lopes/" rel="noopener noreferrer" target="_blank">Crista Lopes</a> and <a href="https://www.cis.upenn.edu/~bcpierce/" rel="noopener noreferrer" target="_blank">Benjamin Pierce</a>.
                If you are interested in helping <a href="https://github.com/clowdr-app/clowdr-web-app"  rel="noopener noreferrer" target="_blank">develop CLOWDR</a> or using it for your live event, please <a href="mailto:hello@clowdr.org">email us</a>.
                We have built this tool extremely quickly (starting on May 19, just some 7 weeks before ICSE...), so please
                be gentle - there are a lot more features that we plan to add, and rough corners to polish.
            </p>
            <h3>THANK YOU TO OUR SPONSORS!</h3>
<center> <font size={6}> Sponsors </font> </center>

<center>
<a href="https://www.acm.org/" target="_blank">
<img src="https://conf.researchr.org/getLogo/036e8246-6b79-4da5-a41d-b2548815d79f?1523626085000" width={300} /> 
</a>
  <a href="http://www.sigsoft.org/index.html" taget="_blank">
  <img src="https://conf.researchr.org/getLogo/ebbb2b60-9730-42f4-9d46-4125ba39cb8f?1573234724000" width={200} />
</a>
  <a href="https://www.computer.org/" target="_blank">
<img src="https://conf.researchr.org/getLogo/8006ac99-8c6b-4ccc-b72e-c1edde8a3d69?1581694289000" width={250} />
</a>&nbsp;&nbsp;
  <a href="http://www.cs-tcse.org/" target="_blank">
  <img src="https://conf.researchr.org/getLogo/1cffa2e5-761e-49d8-b4b1-3274de2a712c?1523626456000" width={200} />
</a>&nbsp;
  <a href="http://www.kiise.or.kr/academyEng/main/main.faEng" target="_blank">
  <img src="https://conf.researchr.org/getLogo/585d2505-b77a-4ea9-be85-f4d0d79c5f26?1523626420000" width={200} />
</a>
</center>

<center> <font size={6}> Supporters </font> 

<center> <font size={4}> Platinum level </font> </center>
<a href="http://www.ncsu.edu">
<img src="https://conf.researchr.org/getLogo/f95c124b-8bda-456b-80f9-dd39014a58c9?1573044383000" width={175}/>
</a>&nbsp;&nbsp;&nbsp;

   <a href="http://www.kaist.edu"> <img src="https://conf.researchr.org/getLogo/96dba9e4-4cd6-40dd-aa43-215ca315ab46?1582528167000"
  width={200}/> </a>

<a href="https://facebook.com">
  <img src="https://conf.researchr.org/getLogo/ddf029d5-e0c0-4f66-8f23-9514d7bdaa48?1579136760000" width={250} /> </a>

<a href="https://www.nsf.gov">
  <img src="https://conf.researchr.org/getImage/icse-2020/orig/nsf1.gif" width={130} /> </a>
</center>

<center> <font size={4}> Gold level </font> 
  <a href="https://microsoft.com">  <img src="https://conf.researchr.org/getImage/icse-2020/orig/microsoft.png" width={200} /> </a>

  <a href="https://samsung.com">  
  <img src="https://conf.researchr.org/getLogo/b15ba186-a38b-49c9-b9d5-f375495e7761?1570543885000" width={200} /> 
  </a>
<center> <font size={4}> Silver level </font> </center>
  <a href="https://lg.com">
  <img src="https://conf.researchr.org/getImage/icse-2020/orig/lgelectronics.jpg" width={250} /> </a>

  <a href="https://www.skhynix.com">
  <img src="https://conf.researchr.org/getLogo/b920db4a-ced6-439b-be92-94c67bfc0eba?1576480901000" width={150} /> </a>

<a href="https://www.sol-link.com/neo/eng/main/index.php">
  <img src="https://conf.researchr.org/getLogo/1c08b0f0-66fa-4542-b33d-a2a53ecd317e?1581900941000" width={150} /> </a>
  </center>

<center> <font size={4}> Bronze level </font> </center>
<center>
<a href="http://www.naver.com/">
<img src="https://conf.researchr.org/getLogo/c9a1a424-3007-4f74-b206-8aac2f4bba05?1576480808000" width={200}/></a>&nbsp;&nbsp;
<a href="http://www.hitachi.com/">
<img src="https://conf.researchr.org/getLogo/c5793109-b7d6-4b1d-bb48-c229cdf7f39b?1577152682000" width={200}/></a>
<a href="http://www.google.com/">
  <img src="https://conf.researchr.org/getLogo/02b35697-aec5-490c-bc35-642c55bd2728?1582528578000" width={150} /> </a>
<a href="https://www.suresofttech.com/en/main/index.php">
<img src="https://conf.researchr.org/getLogo/b93c740b-2256-4458-81ba-4e800238db11?1581689394000" width={175}/></a>
</center>


        </div>
    }
}

export default Landing;
