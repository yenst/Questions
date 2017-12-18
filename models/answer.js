"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let AnswerSchema = Schema({
    answer: {type: String, trim: true}, // answer: {type: String, trim: true, required: [true, "Answer can't be empty."]},
    author: {type: Schema.ObjectId, ref: "User", required: true},
    onThread: {type: mongoose.Schema.ObjectId, ref: "Thread", required: true},
    votes: {type: Number, default: 0},
    isApproved: {type: Boolean, default: false},
    upVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    downVotedUIDs: [{type: Schema.ObjectId, ref: "User"}],
    comments: [{type: Schema.ObjectId, ref: "Comment"}],
    images: [{type: String}]
});

/**
 * Toggles isApproved and sets this.onThread.hasApprovedAnswer
 * @returns {Promise}
 * Resolve returns object with the savedAnswer and affectedThread
 * {savedAnswer, affectedThread}
 */
AnswerSchema.methods.toggleIsApprovedAndSave = function () {
    let self = this;
    return new Promise((resolve, reject) => {
        self.isApproved = !self.isApproved;
        self.save().then(savedAnswer => {
            mongoose.model("Thread").findOne({_id: savedAnswer.onThread}).populate("answers").then(thread => {
                let isThreadSolved = false;
                for (let i = 0; i < thread.answers.length; i++) {
                    let currentAnswer = thread.answers[i];
                    if (currentAnswer._id !== savedAnswer._id && currentAnswer.isApproved) {
                        isThreadSolved = true;
                        break;
                    }
                }
                thread.isSolved = isThreadSolved;
                thread.save().then((affectedThread) => resolve({savedAnswer, affectedThread})).catch(err => {return err});
            }).catch(err => {return err})
        }).catch(err => reject(err));
    });
};

AnswerSchema.pre("remove", function (next) {
    mongoose.model("Thread").findOne({_id: this.onThread}).then(thread => {
        let index = thread.answers.indexOf(this._id);
        thread.answers.splice(index, 1);
        thread.save();
    }).catch(err => console.error(err));
    mongoose.model("Comment").remove({onAnswer: this._id}).catch(err => console.error(err));
    next();
});

AnswerSchema.methods.upVote = function (userId) {
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
AnswerSchema.methods.downVote = function (userId) {
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

module.exports = mongoose.model("Answer", AnswerSchema);