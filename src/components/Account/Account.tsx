import React from 'react';
import {AutoComplete, Button, Form, Input, Select, Skeleton, Spin, Tag, Tooltip} from "antd";
import Avatar from "./Avatar";
import {AuthUserContext} from "../Session";
import Parse from "parse";
import withLoginRequired from "../Session/withLoginRequired";
import ProgramContext from "../Program/context";
import {ClowdrState} from "../../ClowdrTypes";
import {RuleObject} from "antd/lib/form";

interface Props { //TS: Props from both context (ClowdrState) and AccountFromToken.js. Is that OK?? Cauz we will export all of them.
    auth: ClowdrState;
    onFinish: () => void;
    embedded: boolean;
}

interface State {
    user: Parse.Object|null;
    email: string|undefined;
    tags: Parse.Object[]|undefined;  //TS:@Jon@Crista tags is in no usage  //TS: Flair object??
    flair: Parse.Object|undefined;   //TS: no usage
    selectedFlair: string[]|undefined;
    loading: boolean;
    flairColors: Record<string, FlairColor>|undefined;
    allFlair: FlairItem[]|undefined;
    flairObj: Parse.Object[]|undefined;
    topicColors: Record<string, string>;
    allTopics: FlairItem[]|undefined;  //TS: no usage
    topicObj: Parse.Object[]|undefined;  //TS: no usage
    updating: boolean;
    ProgramPersons: Parse.Object[];
    ProgramItems: Parse.Object[];
    username: string;                  //TS no usage
    error: Error|undefined
}

interface FlairItem {
    value: string;
    id: string;
    color: string
}

interface FlairColor {
    color: string;
    tooltip: string;
}

class Account extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state={  //TS: check if all inti values are correct
            user: null,
            email: undefined,
            tags: undefined,
            flair: undefined,
            selectedFlair: undefined,
            loading: false,
            flairColors: undefined,
            allFlair: undefined,
            flairObj: undefined,
            topicColors: {},
            allTopics: undefined,
            topicObj: undefined,
            updating: false, //TS: Is init val false or true?
            ProgramPersons: [],
            ProgramItems: [],
            username: "",
            error: undefined
        }
    }

    setStateFromUser(){
        let selectedFlairs: string[] = [];
        if (this.props.auth.userProfile.get("tags"))
            this.props.auth.userProfile.get("tags").forEach((tag: Parse.Object) => {
                selectedFlairs.push(tag.get("label"));
            });
        this.setState({
            user: this.props.auth.user,
            email: this.props.auth.user ? this.props.auth.user.getEmail() : undefined,
            tags: this.props.auth.user ? this.props.auth.user.get("tags") : undefined,
            flair: this.props.auth.user ? this.props.auth.user.get("primaryFlair") : undefined,
            selectedFlair: selectedFlairs,
            loading: false
        });
        const Flair = Parse.Object.extend("Flair");
        const flairQ = new Parse.Query(Flair);
        let _this = this;
        flairQ.find().then((u: Parse.Object[])=>{
            //convert to something that the dom will be happier with
            let res: FlairItem[] = [];
            let flairColors: Record<string, FlairColor> = {};
            for(let flair of u){
                flairColors[flair.get("label")] = {color: flair.get("color"), tooltip: flair.get("tooltip")} ;
                res.push({value: flair.get("label"), color: flair.get("color"), id: flair.id})
            }
            _this.setState({
                flairColors: flairColors,
                allFlair: res,
                flairObj: u
            });
        }).catch((err: Error)=>{
            console.log(err)
        });

        const BioTopic = Parse.Object.extend("BioTopic");
        const bioQuery = new Parse.Query(BioTopic);
        bioQuery.find().then((u: Parse.Object[])=>{
            //convert to something that the dom will be happier with
            let res: FlairItem[] = [];
            let topicColors: Record<string, string> = {};
            for(let topic of u){
                topicColors[topic.get("label")] = topic.get("color");  //TS:@Jon @Crista no lable in BioTopic??
                res.push({value: topic.get("label"), color: topic.get("color"), id: topic.id})
            }
            _this.setState({
                topicColors: topicColors,
                allTopics: res,
                topicObj: u
            });
        }).catch((err: Error)=>{
            console.log(err)
        });

    }
    componentDidMount() {
        let _this = this;
        if(!_this.state.user){
            _this.setStateFromUser()
        }
        else{
            this.setStateFromUser();
        }
        this.collectProgramItems();
    }

    async updateUser(values: any) {//TS: Parse.User, but we need to define fields such as password
        this.setState({updating: true});
        if(values.password && this.props.auth.user){
            this.props.auth.user.setPassword(values.password); //TS:@Jon@Crista diff btw serPassword and set("passwordSet",true)?
            this.props.auth.user.set("passwordSet",true);
            await this.props.auth.user.save();
        }
        if (this.state.flairObj) {
            this.props.auth.userProfile.set("tags", this.state.flairObj.filter((item)=>(values.flair.includes(item.get("label")))));
        }
        this.props.auth.userProfile.set("displayName",values.displayName);
        this.props.auth.userProfile.set("affiliation", values.affiliation);
        this.props.auth.userProfile.set("country", values.country);
        this.props.auth.userProfile.set("webpage", values.website);
        this.props.auth.userProfile.set("bio", values.bio);
        this.props.auth.userProfile.set("pronouns", values.pronouns);
        this.props.auth.userProfile.set("position", values.position);

        Promise.all([this.props.auth.userProfile.save(),
            Parse.Cloud.run("program-updatePersons", {
                userProfileID: this.props.auth.userProfile.id,
                programPersonIDs: values.programPersons
            })

    ]).then(() => {
                this.setState({updating: false});
                this.setStateFromUser();
                if(this.props.onFinish)
                    this.props.onFinish();

        });
    }
    async collectProgramItems(){
        let [persons, items] = await Promise.all([
            this.props.auth.programCache.getProgramPersons(this),
            this.props.auth.programCache.getProgramItems(this)]);
        this.setState({
            ProgramPersons: persons,
            ProgramItems: items
        })
    }

    tagRender(props: any) { //TS: how to import CustomTagProps type in antd?
        const { value, label, id, closable, onClose } = props;

        if(!this.state.flairColors)
            return <Tag>{value}</Tag>
        let tag = (
            <Tag key={id} color={this.state.flairColors[value].color} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {value}
            </Tag>
        );
        if(this.state.flairColors[value].tooltip)
            return <Tooltip mouseEnterDelay={0.5} title={this.state.flairColors[value].tooltip}>{tag}</Tooltip>

        return tag;
    }

    // personRenderer(props){
    //
    // }
    topicRender(props: any) {   //TS:@Jon@Crista no usage
        const { value, label, id, closable, onClose } = props;

        if(!this.state.topicColors)
            return <Tag>{value}</Tag>
        return (
            <Tag key={id} color={this.state.topicColors[value]} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {value}
            </Tag>
        );
    }


    render() {
        if(!this.state.user){
            return <Skeleton />
        }

        let _this = this;
        let passwordRequired:boolean = true;  //TS: is the init val True?
        if (this.props.auth.user) {
            passwordRequired = !this.props.auth.user.get("passwordSet");
        }
        let peopleToItems: Record<string, Parse.Object[]> = {};
        let programPersonOptions= [];
        let matchingPersons = [];
        if(this.state.ProgramPersons){
            for(let item of this.state.ProgramItems){
                for(let person of item.get("authors"))
                {
                    if(!peopleToItems[person.id])
                        peopleToItems[person.id] = [];
                    peopleToItems[person.id].push(item);
                }
            }
            programPersonOptions = this.state.ProgramPersons.filter((person: Parse.Object) => (
                (person.get("userProfile") == null || person.get("userProfile").id == this.props.auth.userProfile.id)&&
                peopleToItems[person.id])).map((person: Parse.Object) => (
                    {value: person.id,
                     label: person.get('name') + " (" + peopleToItems[person.id].map((item: Parse.Object) => item.get("title")).join(", ") + ")"})
                );
            matchingPersons = this.state.ProgramPersons.filter((person: Parse.Object) =>
                person.get("userProfile") && person.get("userProfile").id == this.props.auth.userProfile.id
                ).map((person: Parse.Object) => (person.id));
        }
        else{
            return <Spin />
        }

        return (
            <Form onFinish={this.updateUser.bind(this)} labelCol={{
                span: 4,
            }}
                  wrapperCol={{
                      span: 14,
                  }}
                  layout="horizontal"
                  initialValues={{
                      size: 50,
                      displayName: this.props.auth.userProfile.get("displayName"),
                      website: this.props.auth.userProfile.get("webpage"),
                      affiliation: this.props.auth.userProfile.get("affiliation"),
                      country: this.props.auth.userProfile.get("country"),
                      bio: this.props.auth.userProfile.get("bio"),
                      pronouns: this.props.auth.userProfile.get("pronouns"),
                      position: this.props.auth.userProfile.get("position"),
                      flair: this.state.selectedFlair,
                      programPersons: matchingPersons
                  }}
                  size={'small'}>
                <Form.Item
                    label="Display Name"
                    name="displayName"
                    extra="Feel free to customize how your name is displayed, but please use your real name."
                    rules={[
                        {
                            required: true,
                            message: 'Please input your full name',
                        },
                    ]}
                ><Input  /></Form.Item>
                <Form.Item label="Preferred Pronouns"
                name="pronouns" >
                    <AutoComplete
                        style={{ width: 200 }}
                        options={[{ value: "She/her"},
                            {value: "He/him"},
                            {value: "They/them"}]}
                        placeholder="Select or enter your preferred pronouns"
                        filterOption={(inputValue: string, option: any) =>
                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                    />
                </Form.Item>
                <Form.Item label="Author record:"
                           name="programPersons" >
                    {(this.state.ProgramPersons ?
                        <Select mode="multiple"
                                optionFilterProp="label"
                                filterOption={ true}
                                placeholder="Please make sure to match your profile to your publications at this conference"
                                style={{width:'100%'}}
                                options={programPersonOptions}
                        />
                    : <Skeleton.Input />)}
                </Form.Item>
                {this.props.embedded ? <></> :<>
                <Form.Item
                    label="Email Address"
                    extra="Your email address cannot be changed"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your email',
                        },
                    ]}
                >
                    <Input
                        name="email"
                        value={this.state.email}
                        disabled={true}
                        type="text"
                        />
                </Form.Item>

                    <Form.Item label="Password"
                               name="password"
                               // rules={password1Rules}
                               rules={
                                    [{
                                        required: passwordRequired,
                                        message: 'Please input your password!',
                                    }]
                               }
                               hasFeedback
                    >
                        <Input.Password placeholder="input password"
                        />
                    </Form.Item>
                    < Form.Item label="Confirm Password"
                    name="confirm"
                    // rules={password2Rules}
                        rules = {
                            [
                                {
                                    required: passwordRequired,
                                    message: 'Please confirm your password!',
                                },
                                ({ getFieldValue }) => ({ //TS: getFieldValue is a method of Form. Should not be put outside <Form>
                                    validator(rule: RuleObject, value: string) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject('The two passwords that you entered do not match!');
                                    },
                                }),
                            ]
                        }
                    >
                    <Input.Password
                    placeholder="input password"
                    />
                    </Form.Item></>
                }
                <Form.Item
                    name="affiliation"
                    label="Affiliation">
                    <Input
                        disabled={this.state.updating}
                        type="text"
                        />
                </Form.Item>
                <Form.Item label="Position"
                name="position">
                    <AutoComplete
                        style={{ width: 200 }}
                        options={[{ value: "Student"},
                            {value: "Faculty"},
                            {value: "Industry"}
                            ]}
                        placeholder="Select or enter your current position"
                        filterOption={(inputValue: string, option: any) =>
                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                    />
                </Form.Item>
                <Form.Item
                    name="country"
                    label="Country">
                    <Input
                        disabled={this.state.updating}
                        type="text"
                        />
                </Form.Item>
                <Form.Item
                    name="website"
                    label="Website">
                    <Input
                        disabled={this.state.updating}
                        type="text"
                       />
                </Form.Item>
                <Form.Item label="Avatar">
                    {/*// TS2339: Property 'refreshUser' does not exist on type 'ClowdrAppState'.*/}
                    <Avatar userProfile={this.props.auth.userProfile} />
                    {/*<Avatar userProfile={this.props.auth.userProfile} refreshUser={this.props.auth.refreshUser} />*/}
                </Form.Item>

                <Form.Item label="Profile" name="bio">
                    <Input.TextArea placeholder="Write a brief bio that other users will see when they encounter you on CLOWDR" allowClear />
                </Form.Item>
                <Form.Item label="Flair" name="flair" extra="Add tags that will be visible to other attendees when they see your virtual badge. At most one will be visible wherever your name appears on CLOWDR, and the rest will appear when attendees hover over your name.">
                    <Select
                        mode="multiple"

                        tagRender={this.tagRender.bind(this)}
                        style={{ width: '100%' }}
                        options={(this.state.allFlair ? this.state.allFlair: [])}
                    />
                </Form.Item>
                {/*remove disabled={isInvalid} onClick={this.onSubmit}*/}
                <Button type="primary" htmlType="submit"
                        loading={this.state.updating}>
                    Save
                </Button>

                {this.state.error && <p>{this.state.error.message}</p>}
            </Form>);
    }
}

const AuthConsumerAccount = (props: Props) => (
    <ProgramContext.Consumer>
        {({items}) => (
            <AuthUserContext.Consumer>
                {value => (value === null ? <></> : // @ts-ignore  TS: Can value really be null here?
                    <Account {...props} auth={value} programItems={items} />
                )}
            </AuthUserContext.Consumer>
        )}</ProgramContext.Consumer>
);
export default withLoginRequired(AuthConsumerAccount);