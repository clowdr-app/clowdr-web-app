import React from 'react';
import { AutoComplete, Button, Form, Input, Select, Skeleton, Spin, Tag, Tooltip, Typography } from "antd";
import Avatar from "./Avatar";
import { AuthUserContext } from "../Session";
import Parse from "parse";
import withLoginRequired from "../Session/withLoginRequired";
import { ClowdrState } from "../../ClowdrTypes";
import { RuleObject } from "antd/lib/form";
import { Store } from 'antd/lib/form/interface';
import UserProfile from '../../classes/UserProfile';

interface Props { //TS: Props from both context (ClowdrState) and AccountFromToken.js. Is that OK?? Cauz we will export all of them.
    auth: ClowdrState;
    onFinish: () => void;
    embedded: boolean;
    user: Parse.User;
    userProfile: UserProfile;
}

interface State {
    user: Parse.Object | null;
    email: string | undefined;
    tags: Parse.Object[] | undefined;  //TS:@Jon@Crista tags is in no usage  //TS: Flair object??
    flair: Parse.Object | undefined;   //TS: no usage
    selectedFlair: string[] | undefined;
    loading: boolean;
    flairColors: Record<string, FlairColor> | undefined;
    allFlair: FlairItem[] | undefined;
    flairObj: Parse.Object[] | undefined;
    topicColors: Record<string, string>;
    allTopics: FlairItem[] | undefined;  //TS: no usage
    topicObj: Parse.Object[] | undefined;  //TS: no usage
    updating: boolean;
    authorRecords: string[];
    username: string;                  //TS no usage
    error: Error | undefined
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
    ProgramPersons: Parse.Object[];
    ProgramItems: Parse.Object[];
    programPersonOptions: { value: string, label: string }[];

    constructor(props: Props) {
        super(props);
        this.state = {  //TS: check if all inti values are correct
            user: null,
            email: undefined,
            tags: undefined,
            flair: undefined,
            selectedFlair: undefined,
            loading: true,
            flairColors: undefined,
            allFlair: undefined,
            flairObj: undefined,
            topicColors: {},
            allTopics: undefined,
            topicObj: undefined,
            updating: false,
            authorRecords: [],
            username: "",
            error: undefined
        }
        this.ProgramPersons = [];
        this.ProgramItems = [];
        this.programPersonOptions = [];
    }

    setStateFromUser() {
        let selectedFlairs: string[] = [];
        if (this.props.userProfile.get("tags"))
            this.props.userProfile.get("tags").forEach((tag: Parse.Object) => {
                selectedFlairs.push(tag.get("label"));
            });
        this.setState({
            user: this.props.user,
            email: this.props.user.getEmail(),
            tags: this.props.user.get("tags"),
            flair: this.props.user.get("primaryFlair"),
            selectedFlair: selectedFlairs
        });
        const Flair = Parse.Object.extend("Flair");
        const flairQ = new Parse.Query(Flair);
        let _this = this;
        flairQ.find().then((u: Parse.Object[]) => {
            //convert to something that the dom will be happier with
            let res: FlairItem[] = [];
            let flairColors: Record<string, FlairColor> = {};
            for (let flair of u) {
                flairColors[flair.get("label")] = { color: flair.get("color"), tooltip: flair.get("tooltip") };
                res.push({ value: flair.get("label"), color: flair.get("color"), id: flair.id })
            }
            _this.setState({
                flairColors: flairColors,
                allFlair: res,
                flairObj: u
            });
        }).catch((err: Error) => {
            console.error(err)
        });

        const BioTopic = Parse.Object.extend("BioTopic");
        const bioQuery = new Parse.Query(BioTopic);
        bioQuery.find().then((u: Parse.Object[]) => {
            //convert to something that the dom will be happier with
            let res: FlairItem[] = [];
            let topicColors: Record<string, string> = {};
            for (let topic of u) {
                topicColors[topic.get("label")] = topic.get("color");  //TS:@Jon @Crista no lable in BioTopic??
                res.push({ value: topic.get("label"), color: topic.get("color"), id: topic.id })
            }
            _this.setState({
                topicColors: topicColors,
                allTopics: res,
                topicObj: u
            });
        }).catch((err: Error) => {
            console.error(err)
        });

    }

    componentDidMount() {
        let _this = this;
        if (!_this.state.user) {
            _this.setStateFromUser()
        }
        else {
            this.setStateFromUser();
        }
        this.collectProgramItems();
    }

    async updateUser(values: Store) {
        this.setState({ updating: true });
        if (values.password) {
            // Set the user's password to the provided value
            this.props.user.setPassword(values.password);
            // Set the boolean field indicating that the user has configured their password
            this.props.user.set("passwordSet", true);
            await this.props.user.save();
        }
        if (this.state.flairObj) {
            this.props.userProfile.set("tags", this.state.flairObj.filter((item) => (values.flair.includes(item.get("label")))));
        }
        this.props.userProfile.set("displayName", values.displayName);
        this.props.userProfile.set("affiliation", values.affiliation);
        this.props.userProfile.set("country", values.country);
        this.props.userProfile.set("webpage", values.website);
        this.props.userProfile.set("bio", values.bio);
        this.props.userProfile.set("pronouns", values.pronouns);
        this.props.userProfile.set("position", values.position);

        Promise.all([this.props.userProfile.save(),
        Parse.Cloud.run("program-updatePersons", {
            userProfileID: this.props.userProfile.id,
            programPersonIDs: values.programPersons
        })

        ]).then(() => {
            this.setState({ updating: false });
            this.setStateFromUser();
            if (this.props.onFinish)
                this.props.onFinish();

        });
    }

    async collectProgramItems() {
        let [persons, items] = await Promise.all([
            this.props.auth.programCache.getProgramPersons(),
            this.props.auth.programCache.getProgramItems()]);

        this.ProgramPersons = persons;
        this.ProgramItems = items;

        let peopleToItems: Record<string, Parse.Object[]> = {};
        let matchingPersons = [];

        for (let item of this.ProgramItems) {
            for (let person of item.get("authors")) {
                if (!peopleToItems[person.id])
                    peopleToItems[person.id] = [];
                peopleToItems[person.id].push(item);
            }
        }
        this.programPersonOptions = this.ProgramPersons.filter((person: Parse.Object) => (
            (person.get("userProfile") == null || person.get("userProfile").id === this.props.userProfile.id) &&
            peopleToItems[person.id])).map((person: Parse.Object) => (
                {
                    value: person.id,
                    label: person.get('name') + " (" + peopleToItems[person.id].map((item: Parse.Object) => item.get("title")).join(", ") + ")"
                })
            );
        matchingPersons = this.ProgramPersons.filter((person: Parse.Object) =>
            person.get("userProfile") && person.get("userProfile").id === this.props.userProfile.id
        ).map((person: Parse.Object) => (person.id));

        this.setState({
            authorRecords: matchingPersons,
            loading: false
        })
    }

    tagRender(props: any) { //TS: how to import CustomTagProps type in antd?
        const { value, id, closable, onClose } = props;

        if (!this.state.flairColors)
            return <Tag>{value}</Tag>
        let tag = (
            <Tag key={id} color={this.state.flairColors[value].color} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {value}
            </Tag>
        );
        if (this.state.flairColors[value].tooltip)
            return <Tooltip mouseEnterDelay={0.5} title={this.state.flairColors[value].tooltip}>{tag}</Tooltip>

        return tag;
    }

    topicRender(props: any) {   //TS:@Jon@Crista no usage
        const { value, id, closable, onClose } = props;

        if (!this.state.topicColors)
            return <Tag>{value}</Tag>
        return (
            <Tag key={id} color={this.state.topicColors[value]} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {value}
            </Tag>
        );
    }


    render() {
        if (!this.state.user) {
            return <Skeleton />
        }

        let passwordRequired: boolean = !this.props.user.get("passwordSet");
        if (this.state.loading) {
            return <Spin />
        }

        return <>
            <Typography.Title level={2}>My Account</Typography.Title>
            <Form onFinish={this.updateUser.bind(this)} labelCol={{
                span: 4,
            }}
                wrapperCol={{
                    span: 14,
                }}
                layout="horizontal"
                initialValues={{
                    size: 50,
                    displayName: this.props.userProfile.get("displayName"),
                    website: this.props.userProfile.get("webpage"),
                    affiliation: this.props.userProfile.get("affiliation"),
                    country: this.props.userProfile.get("country"),
                    bio: this.props.userProfile.get("bio"),
                    pronouns: this.props.userProfile.get("pronouns"),
                    position: this.props.userProfile.get("position"),
                    flair: this.state.selectedFlair,
                    programPersons: this.state.authorRecords
                }}
                size={'small'}>
                <Form.Item
                    label="Display Name"
                    name="displayName"
                    extra="Feel free to customize how your name is displayed, but please use your professional name."
                    rules={[
                        {
                            required: true,
                            message: 'Please input your full name',
                        },
                    ]}
                ><Input /></Form.Item>
                <Form.Item label="Pronouns"
                    name="pronouns"
                    extra="Select from the list or enter your own.">
                    <AutoComplete
                        options={[{ value: "She/her" },
                        { value: "He/him" },
                        { value: "They/them" }]}
                        placeholder="Select or type your preferred pronouns"
                        filterOption={(inputValue: string, option: any) =>
                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                    />
                </Form.Item>
                <Form.Item label="Author records:"
                    name="programPersons"
                    extra="Start typing your name to identify and select your conference records (if any)." >
                    {(this.ProgramPersons ?
                        <Select mode="multiple"
                            optionFilterProp="label"
                            filterOption={true}
                            placeholder="Connect your profile to your activities at this conference"
                            style={{ width: '100%' }}
                            options={this.programPersonOptions}
                        />
                        : <Skeleton.Input />)}
                </Form.Item>
                {this.props.embedded ? <></> : <>
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
                    < Form.Item label="Confirm Pwd"
                        name="confirm"
                        // rules={password2Rules}
                        rules={
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
                <Form.Item label="Role"
                    name="position">
                    <AutoComplete
                        options={[{ value: "Student" },
                        { value: "Academic Researcher" },
                        { value: "Industry Researcher" },
                        { value: "Professional Developer" },
                        { value: "Other Computer Industry" }
                        ]}
                        placeholder="Select or type your current role"
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
                    <Avatar userProfile={this.props.userProfile} />
                </Form.Item>

                <Form.Item label="Profile" name="bio" extra="Include anything else you want people to know about you -- e.g., a brief CV, current projects, links to some papers, hobbies, ...">
                    <Input.TextArea placeholder="Write a brief bio that other users will see when they encounter you on CLOWDR" allowClear
                    />
                </Form.Item>
                <Form.Item label="Flair" name="flair" extra="Add tags as appropriate that will be visible to other attendees when they see your virtual badge. A limited number will be visible wherever your name appears on CLOWDR, and the rest will appear when attendees hover over your name.  OC = Organizing Committee, PC = Program Committee, SV = Student Volunteer.">
                    <Select
                        mode="multiple"

                        tagRender={this.tagRender.bind(this)}
                        style={{ width: '100%' }}
                        options={(this.state.allFlair ? this.state.allFlair : [])}
                    />
                </Form.Item>
                {/*remove disabled={isInvalid} onClick={this.onSubmit}*/}
                <Button type="primary" htmlType="submit"
                    loading={this.state.updating}>
                    Save
                </Button>

                {this.state.error && <p>{this.state.error.message}</p>}
            </Form>
        </>;
    }
}

const AuthConsumer = withLoginRequired((props: Props) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <span>TODO: Account page when clowdrState is null.</span> :
            (!value.userProfile || !value.user ? <span>Error: Account page: Either user or userProfile does not exist?!</span> :
                <Account {...props} auth={value} user={value.user} userProfile={value.userProfile} />)
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
