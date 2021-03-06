const {Schema, model, Types} = require('mongoose');

const schema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    topic: {type: String, required: true},
    imageURL: {type: String},
    numberField1: {type: String},
    numberField2: {type: String},
    numberField3: {type: String},
    stringField1: {type: String},
    stringField2: {type: String},
    stringField3: {type: String},
    textField1: {type: String},
    textField2: {type: String},
    textField3: {type: String},
    dateField1: {type: String},
    dateField2: {type: String},
    dateField3: {type: String},
    checkboxField1: {type: String},
    checkboxField2: {type: String},
    checkboxField3: {type: String},
    creator: {type: Types.ObjectId, ref: 'User'},
    items: [{type: Types.ObjectId, ref: 'Item'}],
})

schema.index({
    name: "text",
    description: "text",
    topic: "text",
    numberField1: "text",
    numberField2: "text",
    numberField3: "text",
    stringField1: "text",
    stringField2: "text",
    stringField3: "text",
    textField1: "text",
    textField2: "text",
    textField3: "text",
    dateField1: "text",
    dateField2: "text",
    dateField3: "text",
    checkboxField1: "text",
    checkboxField2: "text",
    checkboxField3: "text",
    items: "text",
})

module.exports = model('Collection', schema);