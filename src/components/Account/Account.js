import React from 'react';
import {Button, Form, Input, Select, Spin, Tag} from "antd";
import Avatar from "./Avatar";
import {AuthUserContext} from "../Session";
import Parse from "parse";

class Account extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loading: 'true'}
    }

    setStateFromUser(){
        let selectedFlair = [];
        if (this.props.auth.user.get("tags"))
            this.props.auth.user.get("tags").forEach((tag) => {
                selectedFlair.push(tag.get("label"));
            });
        this.setState({
            user: this.props.auth.user,
            email: this.props.auth.user.getEmail(),
            affiliation: this.props.auth.user.get("affiliation"),
            displayName: this.props.auth.user.get("displayname"),
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

    }
    componentDidMount() {
        let _this = this;
        if(!_this.state.user){
            this.props.auth.refreshUser(()=>{
                console.log("User refreshed!")
                _this.setStateFromUser()
            }).then(()=>{
                _this.setStateFromUser();
            });
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

    updateUser() {
        this.setState({updating: true});
        this.props.auth.user.set("tags", this.state.flairObj.filter((item)=>(this.state.selectedFlair.includes(item.get("label")))));
        this.props.auth.user.set("displayname",this.state.displayName);
        this.props.auth.user.set("affiliation", this.state.affiliation);
        this.props.auth.user.save().then(() => {
            this.props.auth.refreshUser().then(() => {
                this.setState({updating: false});

                this.setStateFromUser();
            })
        });
    }

    onChange = event => {
        this.setState({[event.target.name]: event.target.value});
    };

    onChangeCheckbox = event => {
        this.setState({[event.target.name]: event.target.checked});
    };
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

    render() {
        if (!this.state.user) {
            return (
                <Spin tip="Loading...">
                </Spin>)
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
        let _this=this;
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
                  }}
                  size={100}>
                <Form.Item
                    label="Full Name"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your full name',
                        },
                    ]}
                ><Input name="displayName" value={this.state.displayName} onChange={this.onChange}/></Form.Item>
                <Form.Item
                    label="Email Address"
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
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item
                    label="Affiliation">
                    <Input
                        name="affiliation"
                        value={this.state.affiliation}
                        disabled={this.state.updating}
                        type="text"
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item label="Profile Photo">
                    <Avatar user={this.state.user} refreshUser={this.props.refreshUser} />
                </Form.Item>
                <Form.Item label="Tags">
                    <Select
                        mode="multiple"
                        tagRender={this.tagRender.bind(this)}
                        style={{ width: '100%' }}
                        defaultValue={this.state.selectedFlair}
                        onChange={(item)=>{
                            _this.setState({selectedFlair: item});
                        }}
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

const AuthConsumerAccount = () => (
    <AuthUserContext.Consumer>
        {value => (
            <Account auth={value} />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumerAccount;