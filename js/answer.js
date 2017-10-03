"use strict";

const VoteAble = require("./voteAble.js").VoteAble;

let Answer = function(answer, upVotes){
    VoteAble.call(this, upVotes);
    this.answer = answer;
};

Answer.prototype = Object.create(VoteAble.prototype);
Answer.prototype.constructor = Answer;

module.exports = {
    Answer
};