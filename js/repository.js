"use strict";

let repository = (function() {
  const Thread = require("./mongoose_models/thread");
  const Answer = require("./mongoose_models/answer");

  const async = require("async"); // for saving a list of documents with mongoose
  const mongoose = require("mongoose");
  mongoose.Promise = global.Promise;
  mongoose.connect("mongodb://localhost:27017/questionsDB", {
    useMongoClient: true
  });

  let saveAllAnswers = function(answers) {
    return new Promise((resolve, reject) => {
      // 1st para in async.each() is the array of items
      async.each(
        answers,
        // 2nd param is the function that each item is passed to
        function(answer, callback) {
          // Call an asynchronous function, often a save() to DB
          answer.save(function() {
            // Async call is done, alert via callback
            callback();
          });
        },
        // 3rd param is the function to call when everything's done
        function(err) {
          if (err) reject(err);
          // All tasks are done now
          resolve();
        }
      );
    });
  };

  let publicMethods = {};
  publicMethods.updateThreadAndAnswers = function(thread) {
    return new Promise((resolve, reject) => {
      thread
        .save()
        .then(() => {
          saveAllAnswers(thread.answers)
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  };
  publicMethods.getAllThreads = function() {
    return new Promise((resolve, reject) => {
      Thread.find({})
        .populate("answers")
        .populate("tags")
        .sort({ votes: -1 })
        .then(threads => {
          resolve(threads);
        })
        .catch(err => reject(err));
    });
  };
  publicMethods.getThreadById = function(id) {
    return new Promise((resolve, reject) => {
      Thread.findOne({ _id: id })
        .populate("answers")
        .populate("tags")
        .then(thread => {
          resolve(thread);
        })
        .catch(err => reject(err));
    });
  };
  publicMethods.getAnswerById = function(id) {
    return new Promise((resolve, reject) => {
      Answer.findOne({ _id: id })
        .populate("parentNode")
        .then(answer => {
          resolve(answer);
        })
        .catch(err => reject(err));
    });
  };
  publicMethods.createObjectId = function(id) {
    return mongoose.Types.ObjectId(id);
  };
  publicMethods.getThreadByQuestion = function(question) {
    return new Promise((resolve, reject) => {
      Thread.findOne({ question: question })
        .populate("answers")
        .populate("tags")
        .then(thread => {
          resolve(thread);
        })
        .catch(err => reject(err));
    });
  };
  publicMethods.addThread = function(threadObject) {
    return new Promise((resolve, reject) => {
      publicMethods
        .getThreadByQuestion(threadObject.question)
        .then(thread => {
          if (!thread) {
            // only make a new thread, when question is unique
            threadObject
              .save()
              .catch(err => {
                reject(err);
              })
              .then(thread => {
                resolve(thread);
              });
          } else {
            reject("Question is not unique");
          }
        })
        .catch(err => reject(err));
    });
  };

  publicMethods.removeTag = function(threadId,tagId){
      return new Promise((resolve,reject)=>{
        
          publicMethods
          .getThreadById(threadId)
          .then(function(result){
              result.removeTag(tagId);
                publicMethods.saveObject(result);
              resolve();
          })
          .catch(function(err){
              reject(err);
          })
      })
  };

  publicMethods.addTag = function(threadId, tagObject) {
    return new Promise((resolve, reject) => {
      publicMethods.saveObject(tagObject);
      publicMethods
        .getThreadById(threadId)
        .then(function(result) {
          result.addNewTag(tagObject);
          publicMethods.saveObject(result);
          resolve();
        })
        .catch(function(err) {
          reject(err);
        });
    });
  };
  publicMethods.saveObject = function(object) {
    return new Promise((resolve, reject) => {
      object
        .save()
        .then(savedObject => resolve(savedObject))
        .catch(err => reject(err));
    });
  };

  return publicMethods;
})();

module.exports = repository;
