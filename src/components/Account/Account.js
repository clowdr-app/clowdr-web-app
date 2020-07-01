import React from 'react';
import {Button, Form, Input, Select, Skeleton, Tag} from "antd";
import Avatar from "./Avatar";
import {AuthUserContext} from "../Session";
import Parse from "parse";
import withLoginRequired from "../Session/withLoginRequired";

class Account extends React.Component {
    constructor(props) {
        super(props);
        this.state={}
    }

    setStateFromUser(){
        let selectedFlair = [];
        if (this.props.auth.userProfile.get("tags"))
            this.props.auth.userProfile.get("tags").forEach((tag) => {
                selectedFlair.push(tag.get("label"));
            });
        this.setState({
            user: this.props.auth.user,
            email: this.props.auth.user.getEmail(),
            tags: this.props.auth.user.get("tags"),
            flair: this.props.auth.user.get("primaryFlair"),
            selectedFlair: selectedFlair,
            loading: false
        });
        const Flair = Parse.Object.extend("Flair");
        const query = new Parse.Query(Flair);
        let _this = this;
        query.find().then((u)=>{
            //convert to something that the dom will be happier with
            let res = [];
            let flairColors = {};
            for(let flair of u){
                flairColors[flair.get("label")] = flair.get("color");
                res.push({value: flair.get("label"), color: flair.get("color"), id: flair.id})
            }
            _this.setState({
                flairColors: flairColors,
                allFlair: res,
                flairObj: u
            });
        }).catch((err)=>{

        });

        const BioTopic = Parse.Object.extend("BioTopic");
        const bioquery = new Parse.Query(BioTopic);
        bioquery.find().then((u)=>{
            //convert to something that the dom will be happier with
            let res = [];
            let topicColors = {};
            for(let topic of u){
                topicColors[topic.get("label")] = topic.get("color");
                res.push({value: topic.get("label"), color: topic.get("color"), id: topic.id})
            }
            _this.setState({
                topicColors: topicColors,
                allTopics: res,
                topicObj: u
            });
        }).catch((err)=>{

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
        // this.userRef.once("value").then((val) => {
        //     let data = val.val();
        //     this.setState({
        //         loading: false,
        //         username: data.username,
        //         email: data.email,
        //         affiliation: data.affiliation
        //     });
        // });

    }

    async updateUser(values) {
        this.setState({updating: true});
        if(values.password){
            this.props.auth.user.setPassword(values.password);
            this.props.auth.user.set("passwordSet",true);
            await this.props.auth.user.save();
        }
        this.props.auth.userProfile.set("tags", this.state.flairObj.filter((item)=>(values.flair.includes(item.get("label")))));
        this.props.auth.userProfile.set("displayName",values.displayName);
        this.props.auth.userProfile.set("affiliation", values.affiliation);
        this.props.auth.userProfile.set("country", values.country);
        this.props.auth.userProfile.set("webpage", values.website);
        this.props.auth.userProfile.set("bio", values.bio);
        this.props.auth.userProfile.save().then(() => {
                this.setState({updating: false});
                this.setStateFromUser();
                if(this.props.onFinish)
                    this.props.onFinish();

        });
    }

    tagRender(props) {
        const { value, label, id, closable, onClose } = props;

        if(!this.state.flairColors)
            return <Tag>{value}</Tag>
        return (
            <Tag key={id} color={this.state.flairColors[value]} closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
                {value}
            </Tag>
        );
    }

    topicRender(props) {
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
        const {
            username,
            email,
            passwordOne,
            passwordTwo,
            isAdmin,
            error,
        } = this.state;

        const isInvalid =
            passwordOne !== passwordTwo ||
            passwordOne === '' ||
            email === '' ||
            username === '';
        let _this = this;

        let passwordRequired = !this.props.auth.user.get("passwordSet");
        let password1Rules = [
            {
                required: passwordRequired,
                message: 'Please input your password!',
            }
        ];
        let password2Rules = [
            {
                required: passwordRequired,
                message: 'Please confirm your password!',
            },
            ({ getFieldValue }) => ({
                validator(rule, value) {
                    if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                    }
                    return Promise.reject('The two passwords that you entered do not match!');
                },
            }),
        ];

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
                      flair: this.state.selectedFlair

                  }}
                  size={100}>
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
                               rules={password1Rules}
                               hasFeedback
                    >
                        <Input.Password placeholder="input password"
                        />
                    </Form.Item>
                    < Form.Item label="Confirm Password"
                    name="confirm"
                    rules={password2Rules}
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
                    <Avatar userProfile={this.props.auth.userProfile} refreshUser={this.props.auth.refreshUser} />
                </Form.Item>

                <Form.Item label="Profile" name="bio">
                    <Input.TextArea placeholder="Write a brief bio that other users will see when they encounter you on CLOWDR" allowClear />
                </Form.Item>
                {/*<Form.Item label="Topics of Interest">*/}
                {/*    <Select*/}
                {/*        mode="multiple"*/}
                {/*        tagRender={this.topicRender.bind(this)}*/}
                {/*        style={{ width: '100%' }}*/}
                {/*        onChange={(item)=>{*/}
                {/*            _this.setState({selectedTopics: item});*/}
                {/*        }}*/}
                {/*        options={(this.state.allTopics ? this.state.allTopics: [])}*/}
                {/*    />*/}
                {/*</Form.Item>*/}

                <Form.Item label="Flair" name="flair" extra="Add tags that will be visible to other attendees when they see your virtual badge">
                    <Select
                        mode="multiple"
                        tagRender={this.tagRender.bind(this)}
                        style={{ width: '100%' }}
                        options={(this.state.allFlair ? this.state.allFlair: [])}
                    />
                </Form.Item>
                <Button type="primary" htmlType="submit" disabled={isInvalid} onClick={this.onSubmit}
                        loading={this.state.updating}>
                    Save
                </Button>

                {error && <p>{error.message}</p>}
            </Form>);
    }
}

const AuthConsumerAccount = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Account auth={value} {...props} />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumerAccount);