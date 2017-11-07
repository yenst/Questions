"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let AnswerSchema = Schema({
    answer: {type: String, required: true},
    author: {type: Schema.ObjectId, ref: "User", required: true},
    onThread: {type: mongoose.Schema.ObjectId, ref: "Thread", required: true},
    votes: {type: Number, default: 0},
    approved: {type: Boolean, default: false},
    upVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    downVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    comments: [{type: mongoose.Schema.ObjectId, ref: "Comment"}],
});

module.exports = mongoose.model("Answer", AnswerSchema);