"use strict";

const mongoose = require("mongoose");

let AnswerSchema = mongoose.Schema({
    answer: {type: String, required: true},
    votes: {type: Number, default: 0},
    isApproved: {type: Boolean, default: false},
    upVotedUserIds: [{type: String}],
    downVotedUserIds: [{type: String}],
    threadId: {type: mongoose.Schema.ObjectId, ref:"Thread"}

    // parentNode is a Thread object or an Answer Object
    // parentNode: {
    //     type: mongoose.Schema.ObjectId,
    //     oneOf: [
    //         {ref: "Thread"},
    //         {ref: "Answer"}
    //     ]
    // },
    // childNodes: [{type: mongoose.Schema.ObjectId, ref: 'Answer'}]
});

AnswerSchema.methods.changeIsApproved = function(){
    this.isApproved = !this.isApproved;
};

AnswerSchema.methods.hasAlreadyUpVoted = function(userId){
    let UID = this.upVotedUserIds.find(id => id === userId);
    return !!UID; // false => UID is empty
};
AnswerSchema.methods.hasAlreadyDownVoted = function(userId){
    let UID = this.downVotedUserIds.find(id => id === userId);
    return !!UID; // false => UID is empty
};
AnswerSchema.methods.upVote = function(userId){
    return new Promise( (resolve, reject) => {
        if(this.hasAlreadyUpVoted(userId)){
            reject("User (" + userId + ") has already up voted thread (" + this.question + ")");
        } else {
            if(this.hasAlreadyDownVoted(userId)){ // user removes his own down vote
                this.downVotedUserIds = this.downVotedUserIds.filter(id => id !== userId);
            } else { // user up votes
                this.upVotedUserIds.push(userId);
            }
            this.votes++;
            resolve();
        }
    });
};
AnswerSchema.methods.downVote = function(userId){
    return new Promise( (resolve, reject) => {
        if(this.hasAlreadyDownVoted(userId)){
            reject("User (" + userId + ") has already down voted thread (" + this.question + ")");
        } else {
            if(this.hasAlreadyUpVoted(userId)){ // user removes his own up vote
                this.upVotedUserIds = this.upVotedUserIds.filter(id => id !== userId);
            } else { // user down votes
                this.downVotedUserIds.push(userId);
            }
            this.votes--;
            resolve();
        }
    });
};

let Answer = mongoose.model("Answer", AnswerSchema);

module.exports = {
    Answer,
    AnswerSchema
};