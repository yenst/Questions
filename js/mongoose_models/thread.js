"use strict";

const mongoose = require("mongoose");
const Answer = require("./answer").Answer;
const AnswerSchema = require("./answer").AnswerSchema;

let ThreadSchema = mongoose.Schema({
    question: {type: String, required: true},
    votes: {type: Number, default: 0},
    upVotedUserIds: [{type: String}],
    downVotedUserIds: [{type: String}],
    answers: [{type: mongoose.Schema.ObjectId, ref: "Answer"}]
});
/*
question: String,
votes: Number,
answers: [{
    answer: String,
    votes: Number,
    isApproved: Boolean,
    replies: [{
        reply: String,
        votes: Number,
        isApproved: Boolean
    }]
}]
*/

ThreadSchema.methods.addNewAnswer = function(newAnswerObject){
    let self = this;
    let isAnswerUnique = function(answerText){
        let answer = self.answers.find(answerObject => answerObject.answer === answerText);
        return !answer; // if answer exists => false; else => true
    };

    return new Promise( (resolve, reject) => {
        if(isAnswerUnique(newAnswerObject.answer)){
            this.answers.push(newAnswerObject);
            resolve();
        } else {
            reject("Answer is not unique");
        }
    });
};

// TODO refactor voting in thread.js and answer.js
ThreadSchema.methods.hasAlreadyUpVoted = function(userId){
    let UID = this.upVotedUserIds.find(id => id === userId);
    return !!UID; // false => UID is empty
};
ThreadSchema.methods.hasAlreadyDownVoted = function(userId){
    let UID = this.downVotedUserIds.find(id => id === userId);
    return !!UID; // false => UID is empty
};
ThreadSchema.methods.upVote = function(userId){
    return new Promise( (resolve, reject) => {
        if(this.hasAlreadyUpVoted(userId)){
            reject("User (" + userId + ") has already up voted thread (" + this.question + ")");
        } else {
            if(this.hasAlreadyDownVoted(userId)){ // user removes his own down vote
                this.downVotedUserIds = this.downVotedUserIds.filter(id => id !== userId);
            } else { // user up votes
                this.upVotedUserIds.push(userId);
            }
            this.votes++;
            resolve();
        }
    });
};
ThreadSchema.methods.downVote = function(userId){
    return new Promise( (resolve, reject) => {
        if(this.hasAlreadyDownVoted(userId)){
            reject("User (" + userId + ") has already down voted thread (" + this.question + ")");
        } else {
            if(this.hasAlreadyUpVoted(userId)){ // user removes his own up vote
                this.upVotedUserIds = this.upVotedUserIds.filter(id => id !== userId);
            } else { // user down votes
                this.downVotedUserIds.push(userId);
            }
            this.votes--;
            resolve();
        }
    });
};

let Thread = mongoose.model("Thread", ThreadSchema);

module.exports = Thread;