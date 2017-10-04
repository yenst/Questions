"use strict";

const VoteAble = require("./voteAble.js").VoteAble;
const Answer = require("./answer.js").Answer;

let Thread = function(question, answers, upVotes){
    VoteAble.call(this, upVotes);
    this.question = question;
    this.answers = (answers === undefined) ? [] : answers;
    this.isAnswerUnique = function(answerToCheck){
        let filteredAnswers = this.answers.find(answer => answer.answer === answerToCheck);
        return !!filteredAnswers; // true als bestaat anders false
    };
    this.addNewAnswer = function(answer){
        this.answers.push(new Answer(answer));
    };
};

Thread.prototype = Object.create(VoteAble.prototype);
Thread.prototype.constructor = Thread;

module.exports = {
    Thread
};