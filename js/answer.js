"use strict";

const VoteAble = require("./voteAble.js").VoteAble;

let Answer = function(answer, upVotes, isApproved){
    VoteAble.call(this, upVotes);
    this.answer = answer;
    this.isApproved = isApproved !== undefined;
    this.changeIsApproved = function(){
        this.isApproved = !this.isApproved;
    };
};

Answer.prototype = Object.create(VoteAble.prototype);
Answer.prototype.constructor = Answer;

module.exports = {
    Answer
};