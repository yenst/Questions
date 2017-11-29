'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const findOneOrCreate = require('mongoose-find-one-or-create');
const GLOBAL = require('../global-vars');

const UserSchema = Schema({
    displayName: {type: String, required: true},
    email: {type: String, required: true},
    domain: {type: String, required: true},
    isAdmin: {type: Boolean, default: false, required: true},
    googleId: Number,
    threads: [{type: Schema.ObjectId, ref: "Thread"}],
    answers: [{type: Schema.ObjectId, ref: "Answer"}],
    comments: [{type: Schema.ObjectId, ref: "Answer"}],
    approvedAnswers: {type: Number, default: 0},
    credits:{type:Number, default: 0},
    alias:{type:String,default:"username"},
    badge:{type:String, default:'fa fa-trophy badge-default 2x'},
    subscriptions:[{type:String}]
});
UserSchema.plugin(findOneOrCreate);

UserSchema.methods.updateBadge = function(){

    if(this.credits >= GLOBAL.BADGE_GOLD) this.badge = 'fa fa-trophy badge-gold 2x'; 
    if (GLOBAL.BADGE_GOLD > this.credits && this.credits >= GLOBAL.BADGE_SILVER) this.badge = 'fa fa-trophy badge-silver 2x';
    if (GLOBAL.BADGE_SILVER > this.credits && this.credits >= GLOBAL.BADGE_BRONZE) this.badge = 'fa fa-trophy badge-bronze 2x';   
}

UserSchema.methods.setCredits = function(new_credits){
    this.credits = new_credits;
    this.updateBadge();
    this.save();
}

UserSchema.methods.newSub = function(sub){
    if(!this.subscriptions.includes(sub)){
this.subscriptions.push(sub);
this.save();
    }
    
}

UserSchema.methods.removeSub = function(sub){
    this.subscriptions.splice(this.subscriptions.indexOf(sub),1);
    this.save();
     
}

module.exports = mongoose.model('User', UserSchema);

