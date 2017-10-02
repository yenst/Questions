"use strict";

let VoteAble = function(upVotes, downVotes){
    this.upVotes = (upVotes !== undefined) ? upVotes : 0;
    this.downVotes = (downVotes === undefined) ? 0 : downVotes;
    this.incrementDownVotes = function(){
        this.downVotes++;
    };
    this.incrementUpVotes = function(){
        this.upVotes++;
    };
};

module.exports = {
    VoteAble
};