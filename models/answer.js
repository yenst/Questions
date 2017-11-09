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


    // let self = this;
    // return new Promise(function (resolve, reject) {
    //     mongoose.model("Thread").findOne({_id: self.onThread}).populate("answers").then(thread => {
    //         self.isApproved = !self.isApproved;
    //         let hasOtherApprovedAnswer = false;
    //         for (let i = 0; i < thread.answers.length; i++){
    //             let answer = thread.answers[i];
    //             if (answer._id != self._id && answer.isApproved) {
    //                 hasOtherApprovedAnswer = true;
    //                 break;
    //             }
    //         }
    //         thread.hasApprovedAnswer = hasOtherApprovedAnswer;
    //         thread.save();
    //         self.save().then(savedAnswer => {
    //             resolve(savedAnswer)
    //         }).catch(err => reject(err));
    //     }).catch(err => reject(err));
    // });
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

const Answer = mongoose.model("Answer", AnswerSchema);
module.exports = Answer;