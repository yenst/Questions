"use strict";

const VoteAble = require("./voteAble.js").VoteAble;

let Answer = function(answer, upVotes, downVotes){
    VoteAble.call(this, upVotes, downVotes);
    this.answer = answer;
};

Answer.prototype = Object.create(VoteAble.prototype);
Answer.prototype.constructor = Answer;

module.exports = {
    Answer
};