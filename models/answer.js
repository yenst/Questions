"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let AnswerSchema = Schema({
    answer: {type: String, required: true},
    author: {type: Schema.ObjectId, ref: "User", required: true},
    onThread: {type: mongoose.Schema.ObjectId, ref: "Thread", required: true},
    votes: {type: Number, default: 0},
    isApproved: {type: Boolean, default: false},
    upVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    downVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    comments: [{type: Schema.ObjectId, ref: "Comment"}],
});

AnswerSchema.pre("remove", function (next) {
    mongoose.model("Thread").findOne({_id: this.onThread}).then(thread => {
        let index = thread.answers.indexOf(this._id);
        thread.answers.splice(index, 1);
        thread.save();
    }).catch(err => console.error(err));
    mongoose.model("Comment").remove({onAnswer: this._id}).catch(err => console.error(err));
    next();
});



const Answer = mongoose.model("Answer", AnswerSchema);
module.exports = Answer;