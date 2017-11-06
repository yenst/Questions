'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const findOneOrCreate = require('mongoose-find-one-or-create');

const UserSchema = Schema({
    displayName: {type: String, required: true},
    email: {type: String, required: true},
    domain: {type: String, required: true},
    googleId: Number,
    threads: [{type: Schema.ObjectId, ref: "Thread"}],
    answers: [{type: Schema.ObjectId, ref: "Answer"}],
    comments: [{type: Schema.ObjectId, ref: "Answer"}],
    approvedAnswers: {type: Number, default: 0}
});
UserSchema.plugin(findOneOrCreate);

module.exports = mongoose.model('User', UserSchema);