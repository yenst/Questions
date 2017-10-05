"use strict";

const VoteAble = require("./voteAble.js").VoteAble;
const Answer = require("./answer.js").Answer;

// class Thread extends VoteAble {
//     constructor(question, answers, upVotes){
//         super(upVotes);
//         this.question = question;
//         this.answers = (answers === undefined) ? [] : answers;
//     }
//     ...
// }

let Thread = function(question, answers, upVotes){
    VoteAble.call(this, upVotes);
    this.question = question;
    this.answers = (answers === undefined) ? [] : answers;

    this.isAnswerUnique = function(answerToCheck){
        let answer = this.answers.find(answerObject => answerObject.answer === answerToCheck);
        return (!answer); // if answer exists => false; else => true
    };
    this.addNewAnswer = function(answer){
        this.answers.push(new Answer(answer));
    };
    this.getAnswer = function(answer){
        return Object.create(Answer, this.answers.find(answerObject => {return answerObject.answer === answer}));
    };
};

Thread.prototype = Object.create(VoteAble.prototype);
Thread.prototype.constructor = Thread;

module.exports = {
    Thread
};