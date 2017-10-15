"use strict";

const VoteAble = require("./voteAble.js");

let Answer = function(properties){
    VoteAble.call(this, {upVotes: properties.upVotes});
    this.answer = properties.answer;
    this.isApproved = (properties.isApproved !== undefined) ? properties.isApproved : false;

};

Answer.prototype = Object.create(VoteAble.prototype);
Answer.prototype.constructor = Answer;

Answer.prototype.changeIsApproved = function(){
    this.isApproved = !this.isApproved;
};

module.exports = Answer;