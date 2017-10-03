"use strict";

let VoteAble = function(upVotes){
    this.upVotes = (upVotes !== undefined) ? upVotes : 0;
    this.incrementUpVotes = function(){
        this.upVotes++;
    };
};

module.exports = {
    VoteAble
};