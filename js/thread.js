"use strict";

const VoteAble = require("./voteAble.js");
const Answer = require("./answer.js");

let Thread = function(properties){
    VoteAble.call(this, {upVotes: properties.upVotes});
    this.question = properties.question;
    this.answers = (properties.answers === undefined) ? [] : properties.answers;
};

Thread.prototype = Object.create(VoteAble.prototype);
Thread.prototype.constructor = Thread;

Thread.prototype.isAnswerUnique = function(answerToCheck){
    let answer = this.answers.find(answerObject => answerObject.answer === answerToCheck);
    return (!answer); // if answer exists => false; else => true
};
Thread.prototype.addNewAnswer = function(answerText){
    this.answers.push(new Answer({answer: answerText}));
};
Thread.prototype.getAnswer = function(answer){
    return Object.create(Answer, this.answers.find(answerObject => {return answerObject.answer === answer}));
};

module.exports = Thread;