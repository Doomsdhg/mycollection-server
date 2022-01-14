const {Schema, model, Types} = require('mongoose');

const schema = new Schema({
    name: {type: String},
    tags: {type: String},
    numberField1: {type: String},
    numberField2: {type: String},
    numberField3: {type: String},
    stringField1: {type: String},
    stringField2: {type: String},
    stringField3: {type: String},
    textField1: {type: String},
    textField2: {type: String},
    textField3: {type: String},
    StringField1: {type: String},
    StringField2: {type: String},
    StringField3: {type: String},
    checkboxField1: {type: String},
    checkboxField2: {type: String},
    checkboxField3: {type: String},
    collectionRef: {type: Types.ObjectId, ref: 'Collection'}
})

module.exports = model('Item', schema);