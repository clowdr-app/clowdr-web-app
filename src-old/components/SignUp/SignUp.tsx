import React, { Component } from 'react';
// import { Button, Form, Input } from 'antd';

import Parse from "parse";
import { RouteComponentProps } from 'react-router';
// import { SizeType } from 'antd/lib/config-provider/SizeContext';
import { Store } from 'antd/lib/form/interface';
import { PropertyNames } from '../../Util';

interface SignUpProps extends RouteComponentProps {
}

interface SignUpState {
    username: string;
    email: string;
    passwordOne: string;
    passwordTwo: string;
    isAdmin: boolean;
    error: Error | null;
}

const INITIAL_STATE = {
    username: '',
    email: '',
    passwordOne: '',
    passwordTwo: '',
    isAdmin: false,
    error: null,
};

class SignUp extends Component<SignUpProps, SignUpState> {
    constructor(props: SignUpProps) {
        super(props);

        this.state = { ...INITIAL_STATE };
    }

    async componentDidMount() {
        let user = await Parse.User.currentAsync();
        if (user) {
            Parse.User.logOut();
        }
    }

    // TODO
    onFinish(values: Store) {
        const { username, email, passwordOne } = this.state;

        let user = new Parse.User();
        user.set("username", email);
        user.set("displayName", username);
        user.set("password", passwordOne);
        user.set("email", email);

        user.signUp().then(() => {
            this.props.history.push("/account" /* TODO: Lookup from route match */);
        }).catch((error) => {
            // Show the error message somewhere and let the user try again.
            alert("Error: " + error.code + " " + error.message);
            this.setState({ error });
        });
    };

    onChange(
        k: PropertyNames<SignUpState, string>,
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        // `Pick<SignUpState, any>` expresses the fact that we can add any new
        // key we like to the state. But, our choice of `k` is constrained to
        // fields of SignUpState, so we're safe. We are also constrained to
        // only picking fields of `SignUpState` whose type extends `string`, so
        // again we're safe.
        let st: Pick<SignUpState, any> = { [k]: event.target.value };
        this.setState(st);
    };

    onChangeCheckbox(
        k: PropertyNames<SignUpState, boolean>,
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        let st: Pick<SignUpState, any> = { [k]: event.target.checked };
        this.setState(st);
    };

    render() {
        // const {
        //     username,
        //     email,
        //     passwordOne,
        //     passwordTwo,
        //     error,
        // } = this.state;

        // const isInvalid =
        //     passwordOne !== passwordTwo ||
        //     passwordOne === '' ||
        //     email === '' ||
        //     username === '';
        
        return <div>This page needs to be corrected to make a user profile, enroll user, etc. before it is used again.</div>
        // return (
        //     <Form onFinish={this.onFinish} labelCol={{
        //         span: 4,
        //     }}
        //         wrapperCol={{
        //             span: 14,
        //         }}
        //         layout="horizontal"
        //         initialValues={{
        //             size: "middle" as SizeType,
        //         }}
        //         size={"large"}>
        //         <Form.Item
        //             label="Full Name"
        //             rules={[
        //                 {
        //                     required: true,
        //                     message: 'Please input your full name',
        //                 },
        //             ]}
        //         ><Input name="username" value={username} onChange={this.onChange.bind(this, "username")} /></Form.Item>
        //         <Form.Item
        //             label="Email Address"
        //             rules={[
        //                 {
        //                     required: true,
        //                     message: 'Please input your email',
        //                 },
        //             ]}
        //         >
        //             <Input
        //                 name="email"
        //                 value={email}
        //                 type="text"
        //                 onChange={this.onChange.bind(this, "email")} />
        //         </Form.Item>
        //         <Form.Item
        //             label="Password"
        //             rules={[
        //                 {
        //                     required: true,
        //                     message: 'Please enter a password',
        //                 },
        //             ]}
        //         >
        //             <Input.Password

        //                 name="passwordOne"
        //                 value={passwordOne}
        //                 onChange={this.onChange.bind(this, "passwordOne")} />
        //         </Form.Item>
        //         <Form.Item
        //             label="Confirm Password"
        //             rules={[
        //                 {
        //                     required: true,
        //                     message: 'Please enter a password',
        //                 },
        //             ]}
        //         >
        //             <Input.Password

        //                 name="passwordTwo"
        //                 value={passwordTwo}
        //                 onChange={this.onChange.bind(this, "passwordTwo")}
        //             />
        //         </Form.Item>

        //         <Button type="primary" htmlType="submit" disabled={isInvalid}>
        //             Sign Up
        //         </Button>

        //         {error && <p>{error.message}</p>}
        //     </Form>
        // );
    }
}

export default SignUp
