'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @param {String} q = question
 * @return {String} trimmed question with a question mark
 * trim:' word ' => 'word'
 * Checks if empty because question is required
 */
let questionSetter = function (q) {
    if (q) {
        q = q.trim();
        if (!q.endsWith("?")) q = q + "?";
    }
    return q;
};

const ThreadSchema = Schema({
    author: {type: Schema.ObjectId, ref: "User", required: [true, 'Please login to ask a question.']},
    question: {type: String, set: questionSetter, required: [true, "Question can't be empty."]},
    creationDate: {type: Date, default: Date.now},
    hasApprovedAnswer: {type: Boolean, default: false},
    votes: {type: Number, default: 0},
    upVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    downVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    answers: [{type: Schema.ObjectId, ref: "Answer"}],
    tags: [{type: Schema.ObjectId, ref: "Tag"}]
});

ThreadSchema.methods.upVote = function (userId) {
    let self = this;
    return new Promise(function (resolve, reject) {
        if (self.upVotedUIDs.find((uid) => {return uid == userId})) {
            reject("You have already up voted this.");
        } else {
            if (self.downVotedUIDs.find((uid) => {return uid == userId})) {
                let index = self.downVotedUIDs.indexOf(userId);
                self.downVotedUIDs.splice(index, 1);
            } else {
                self.upVotedUIDs.push(userId);
            }
            self.votes++;
            resolve();
        }
    });
};
ThreadSchema.methods.downVote = function (userId) {
    let self = this;
    return new Promise(function (resolve, reject) {
        if (self.downVotedUIDs.find((uid) => {return uid == userId})) {
            reject("You have already down voted this.");
        } else {
            if (self.upVotedUIDs.find((uid) => {return uid == userId})) {
                let index = self.upVotedUIDs.indexOf(userId);
                self.upVotedUIDs.splice(index, 1);
            } else {
                self.downVotedUIDs.push(userId);
            }
            self.votes--;
            resolve();
        }
    });
};

module.exports = mongoose.model('Thread', ThreadSchema);