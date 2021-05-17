const {Schema, model} = require('mongoose');

const Profile = Schema({
    userName: {
        type: String,
        required: true
    },
    interests: {
        type: Array,
        required: true
    },
    freeTime:{
        type: Array,
        required: true
    }
});

module.exports = model("Profile", Profile);