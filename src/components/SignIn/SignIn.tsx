import React, { Component, ChangeEvent } from 'react';
import { Button, message, Form, Input, Tooltip } from 'antd';
import Parse from "parse";
import { AuthUserContext } from "../Session";
import { ClowdrState } from "../../ClowdrTypes";
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { PropertyNames } from '../../Util';

interface SignInState {
    email: string;
    password: string;
    error: Error | null;
}

interface SignInProps extends RouteComponentProps {
    dontBounce: boolean;
    clowdrAppState: ClowdrState;
}

const INITIAL_STATE = {
    email: '',
    password: '',
    error: null,
};

const layout = {
    labelCol: {
        span: 8,
    },
    wrapperCol: {
        span: 16,
    },
};
const tailLayout = {
    wrapperCol: {
        offset: 8,
        span: 16,
    },
};
class SignIn extends Component<SignInProps, SignInState> {
    constructor(props: SignInProps) {
        super(props);
        this.state = { ...INITIAL_STATE };
    }

    async onFinish() {
        const { email, password } = this.state;
        try {
            let user = await Parse.User.logIn(email, password);
            console.log("[SignIn]: User=" + JSON.stringify(user));
            await this.props.clowdrAppState.refreshUser();
            this.props.history.push("/");
            this.props.history.go(0);
        } catch (e) {
            alert(e.message);
        }

    }

    componentDidMount() {
        if (process.env.REACT_APP_IS_MINIMAL_UI && !this.props.dontBounce) {
            this.props.clowdrAppState.helpers.setGlobalState({ showingLanding: true });
        }
    }

    onChange(
        k: PropertyNames<SignInState, string>,
        event: ChangeEvent<HTMLInputElement>
    ) {
        let st: Pick<SignInState, any> = { [k]: event.target.value };
        this.setState(st);
    }

    async forgotPassword() {
        console.log(process.env)
        let res = await Parse.Cloud.run("reset-password", {
            email: this.state.email,
            confID: this.props.clowdrAppState.helpers.getDefaultConferenceName()
        });
        if (res.status === "error")
            message.error(res.message);
        else
            message.success(res.message, 0);

    }
    render() {
        if (process.env.REACT_APP_IS_MINIMAL_UI && !this.props.dontBounce) {
            return <div></div>;
        }
        const { email, password, error } = this.state;

        const isInvalid = password === '' || email === '';

        return (
            <Form {...layout} onFinish={() => this.onFinish()}>
                <Form.Item label={"Email Address"}>
                    <Input
                        name="email"
                        value={email}
                        onChange={(e) => this.onChange("email", e)}
                        type="text"
                    />
                </Form.Item>
                <Form.Item label={"Password"}>
                    <Input.Password
                        name="password"
                        value={password}
                        onChange={(e) => this.onChange("password", e)}
                        type="password"
                    /></Form.Item>
                <Form.Item {...tailLayout}>
                    <Button type="primary" disabled={isInvalid} htmlType="submit">
                        Sign In
                    </Button> <Tooltip mouseEnterDelay={0.5} title="If you have forgotten your password, please enter your email address and click this button to receive a link to reset it."><Button disabled={email === ''} onClick={this.forgotPassword.bind(this)}>
                        Forgot Password
                </Button></Tooltip></Form.Item>

                {error && <p>{error.message}</p>}
            </Form>
        );
    }
}

const AuthConsumer = withRouter((props: SignInProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <span>TODO: SignIn page when clowdrState is null.</span> :
            <SignIn {...props} clowdrAppState={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
