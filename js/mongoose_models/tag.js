"use strict";

const mongoose = require("mongoose");


let TagSchema = mongoose.Schema({
    tagname:{type: String, required: true, unique: true}
});

let Tag = mongoose.model("Tag",TagSchema);

module.exports = Tag;


