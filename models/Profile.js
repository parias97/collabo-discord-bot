const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

let profile = mongoose.model('profile', profile);
module.exports = profile;