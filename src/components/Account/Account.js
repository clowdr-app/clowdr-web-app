import React from 'react';
import {Button, Form, Input, Spin} from "antd";
import Avatar from "./Avatar";
import {AuthUserContext} from "../Session";

class Account extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loading: 'true'}
    }

    setStateFromUser(){
        console.log(this.props.user);
        this.setState({
            user: this.props.user,
            email: this.props.user.getEmail(),
            affiliation: this.props.user.get("affiliation"),
            displayName: this.props.user.get("displayname"),
            loading: false
        });
    }
    componentDidMount() {
        let _this = this;
        if(!_this.state.user){
            this.props.refreshUser().then(()=>{
                console.log("Refreshed user")
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
        this.props.user.set("displayname",this.state.displayName);
        this.props.user.set("affiliation", this.state.affiliation);
        this.props.user.save().then(() => {
            this.props.refreshUser().then(() => {
                this.setState({updating: false});

                this.setStateFromUser();
            })
        });
    }

    onChange = event => {
        console.log(event.target.name)
        console.log(event.target.value);
        this.setState({[event.target.name]: event.target.value});
    };

    onChangeCheckbox = event => {
        this.setState({[event.target.name]: event.target.checked});
    };

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
            <Account user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumerAccount;