"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let CommentSchema = Schema({
    comment: {type: String, trim: true, required: [true, "Comment can't be empty."]},
    author: {type: Schema.ObjectId, ref: "User", required: true},
    onAnswer: {type: Schema.ObjectId, ref: "Answer", required: true}
});

module.exports = mongoose.model("Comment", CommentSchema);