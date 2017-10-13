"use strict";

let VoteAble = function(properties){
    this.upVotes = (properties.upVotes !== undefined) ? properties.upVotes : 0;
};

VoteAble.prototype.incrementUpVotes = function(){
    this.upVotes++;
};
VoteAble.prototype.decrementUpVotes = function(){
    let newValue = this.upVotes - 1;
    if(newValue >= 0){
        this.upVotes = newValue;
    }
};

module.exports = VoteAble;