const {Schema, model, Types} = require('mongoose');

const schema = new Schema({
    email: {type: String, required: true, unique: true},
    userName: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    collections: [{type: Types.ObjectId, ref: 'Collection'}],
    comments: [{type: Types.ObjectId, ref: 'Comment'}],
    items: [{type: Types.ObjectId, ref: 'Item'}],
    likes: [{type: Types.ObjectId, ref: 'Item'}],
    admin: {type: Boolean},
    blocked: {type: Boolean},
})

module.exports = model('User', schema);