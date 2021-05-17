const {Schema, model} = require('mongoose');

const Profile = Schema({
    id: {
        type: String,
        required: true
    },
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