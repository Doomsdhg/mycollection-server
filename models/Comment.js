const {Schema, model, Types} = require('mongoose');

const schema = new Schema({
    text: {type: String, required: true},
    userName: {type: String, required: true},
    userId: {type: Types.ObjectId, ref: 'User'},
    itemId: {type: Types.ObjectId, ref: 'Item'},
})

schema.index({
    text: "text"
})

module.exports = model('Comment', schema);