"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let TagSchema = Schema({
    name: {type: String, required: true, unique: true, uppercase: true},
    threads: [{type: Schema.ObjectId, ref: "Thread"}],
});

module.exports = mongoose.model("Tag", TagSchema);