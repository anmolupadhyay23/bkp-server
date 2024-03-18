const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        required: true,
        trim: true,
        type: String,
        validate: {
            validator: (value) => {
                const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
                return value.match(re);
            },
            message: 'Please enter a valid email address',
        }
    },
    password: {
        required: true,
        type: String,
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: Number,
        default: null
    },
    verified: {
        type: Boolean
    }

})

const User=mongoose.model('User', userSchema);
module.exports=User;