'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const trimAndCheckUrls = require("./../helper/trimAndCheckUrls");

/**
 * @param {String} q = question
 * @return {String} trimmed question with a question mark
 * trim:' word ' => 'word'
 * Checks if empty because question is required
 */
const titleSetter = function (q) {
    if (q) {
        q = q.trim();
        q = q.charAt(0).toUpperCase() + q.slice(1);
    }
    return q;
};

const ThreadSchema = Schema({
    author: {type: Schema.ObjectId, ref: "User", required: [true, 'Please login to ask a question.']},
    question: {type: String, set: trimAndCheckUrls},
    title: {type: String, set: titleSetter, required: [true, "Title can't be empty."]},
    creationDate: {type: Date, default: Date.now},
    isSolved: {type: Boolean, default: false},
    votes: {type: Number, default: 0},
    upVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    downVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    answers: [{type: Schema.ObjectId, ref: "Answer"}],
    tags: [{type: String, lowercase: true}],
    images: [{type: String}],
    isPoll: {type: Boolean, default: false},
    votedUIDs: [{type: Schema.ObjectId, ref: "User"}],
});

ThreadSchema.pre("remove", function (next) {
    mongoose.model("Answer").find({onThread: this._id}).then(answers => {
        answers.forEach(answer => {
            answer.remove();
        });
    }).catch(err => {
        console.error(err);
    });
    next();
});

ThreadSchema.methods.upVote = function (userId) {
    let self = this;
    return new Promise(function (resolve, reject) {
        if (self.upVotedUIDs.find((uid) => {
                return uid == userId
            })) {
            reject("You have already up voted this.");
        } else {
            if (self.downVotedUIDs.find((uid) => {
                    return uid == userId
                })) {
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
        if (self.downVotedUIDs.find((uid) => {
                return uid == userId
            })) {
            reject("You have already down voted this.");
        } else {
            if (self.upVotedUIDs.find((uid) => {
                    return uid == userId
                })) {
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

ThreadSchema.methods.hasVoted = function (userId) {
    let u = this.votedUIDs.find(function (uid) {
        return uid == userId;
    });
    return (u);
};

module.exports = mongoose.model('Thread', ThreadSchema);