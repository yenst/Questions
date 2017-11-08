"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let CommentSchema = Schema({
    comment: {type: String, required: true},
    author: {type: Schema.ObjectId, ref: "User", required: true},
    onAnswer: {type: Schema.ObjectId, ref: "Answer", required: true}
});

//TODO comment.save middleware isn't used yet
CommentSchema.post("save", function (savedComment) {
    mongoose.model("Answer").findOne({_id: savedComment.onAnswer}).then(answer => {
        answer.comments.push(savedComment._id);
        answer.save();
    }).catch(err => console.error(err))
});

module.exports = mongoose.model("Comment", CommentSchema);