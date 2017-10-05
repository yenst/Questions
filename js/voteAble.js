"use strict";

let VoteAble = function(upVotes){
    this.upVotes = (upVotes !== undefined) ? upVotes : 0;
    this.incrementUpVotes = function(){
        this.upVotes++;
    };
    this.decrementUpVotes = function(){
        let newValue = this.upVotes - 1;
        if(newValue >= 0){
            this.upVotes = newValue;
        }
    };
};

module.exports = {
    VoteAble
};