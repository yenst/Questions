"use strict";

const VoteAble = require("./voteAble.js").VoteAble;

let Answer = function(answer, upVotes){
    VoteAble.call(this, upVotes);
    this.answer = answer;
    this.changeIsApproved = function(){
        if(isApproved){
            this.isApproved = false;
        }else{
            this.isApproved= true;
        }
    };
};

Answer.prototype = Object.create(VoteAble.prototype);
Answer.prototype.constructor = Answer;

module.exports = {
    Answer
};