import React from 'react';
import 'antd/dist/antd.css';
import {message, Upload} from 'antd';
import {LoadingOutlined, PlusOutlined} from '@ant-design/icons';

function getBase64(img, callback) {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result));
    reader.readAsDataURL(img);
}

function beforeUpload(file) {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
        message.error('Image must smaller than 2MB!');
    }
    return isJpgOrPng && isLt2M;
}

class Avatar extends React.Component {
    state = {
        loading: false,
        imageUrl: this.props.imageURL
    };

    handleChange = info => {
        if (info.file.status === 'uploading') {
            this.setState({loading: true});
            return;
        }
        if (info.file.status === 'done') {
            // Get this url from response in real world.
            getBase64(info.file.originFileObj, imageUrl =>
                this.setState({
                    imageUrl,
                    loading: false,
                }),
            );
        }
    };

    upload(req) {
        const storage = this.props.firebase.storage;
        const metadata = {
            contentType: req.file.type
        }
        let name;
        let _this = this;
        if (req.file.type == 'image/jpeg')
            name = "profilePicture.jpg";
        else
            name = "profilePicture.png";
        const storageRef = storage.ref(this.props.user.uid + "/" + name);
        const task = storageRef.put(req.file);

        _this.setState({loading: true});
        task.on("state_changed", snapshot => {
        }, error => {
            req.onError(error);
        }, function () {
            task.snapshot.ref.getDownloadURL().then(ret => {
                _this.props.firebase.auth.currentUser.updateProfile(
                    {photoURL: ret}
                ).then(() => {
                    _this.props.firebase.db.ref("/users").child(_this.props.user.uid).child("photoURL").set(ret).then(()=>{
                        console.log("Saved");
                    });
                }).catch
                (error => {
                    console.log(error);
                });
                req.onSuccess();
            });
        });
    }

    render() {
        const uploadButton = (
            <div>
                {this.state.loading ? <LoadingOutlined/> : <PlusOutlined/>}
                <div className="ant-upload-text">Upload</div>
            </div>
        );
        const {imageUrl} = this.state;
        return (
            <Upload
                name="avatar"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                customRequest={this.upload.bind(this)}
                beforeUpload={beforeUpload}
                onChange={this.handleChange}
            >
                {imageUrl ? <img src={imageUrl} alt="avatar" style={{width: '100%'}}/> : uploadButton}
            </Upload>
        );
    }
}

export default Avatar;