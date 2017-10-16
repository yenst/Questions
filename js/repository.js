"use strict";

let repository = (function () {
    const Thread = require("./mongoose_models/thread");
    const Answer = require("./mongoose_models/answer");

    const async = require("async"); // for saving a list of documents with mongoose
    const mongoose = require("mongoose");
    mongoose.Promise = global.Promise;
    mongoose.connect("mongodb://localhost:27017/questionsDB", {useMongoClient: true});

    let saveAllAnswers = function (answers) {
        return new Promise((resolve, reject) => {
            // 1st para in async.each() is the array of items
            async.each(answers,
                // 2nd param is the function that each item is passed to
                function (answer, callback) {
                    // Call an asynchronous function, often a save() to DB
                    answer.save(function () {
                        // Async call is done, alert via callback
                        callback();
                    });
                },
                // 3rd param is the function to call when everything's done
                function (err) {
                    if (err) reject(err);
                    // All tasks are done now
                    resolve();
                }
            );
        })
    };

    let publicMethods = {};
    publicMethods.updateThreadAndAnswers = function (thread) {
        return new Promise((resolve, reject) => {
            thread.save().catch(err => reject(err)).then(() => {
                saveAllAnswers(thread.answers).catch(err => reject(err)).then(() => resolve());
            });
        });
    };
    publicMethods.getAllThreads = function () {
        return new Promise((resolve, reject) => {
            Thread.find({}).populate('answers').sort({votes: -1}).catch(err => reject(err)).then(threads => {
                resolve(threads)
            })
        })
    };
    publicMethods.getThreadById = function (id) {
        return new Promise((resolve, reject) => {
            Thread.findOne({_id: id}).populate('answers').catch(err => reject(err)).then(thread => {
                resolve(thread)
            })
        })
    };
    publicMethods.getAnswerById = function (id) {
        return new Promise((resolve, reject) => {
            Answer.findOne({_id: id}).populate('parentNode').catch(err => reject(err)).then(answer => {
                resolve(answer)
            })
        })
    };
    publicMethods.createObjectId = function (id) {
        return mongoose.Types.ObjectId(id);
    };
    publicMethods.getThreadByQuestion = function (question) {
        return new Promise((resolve, reject) => {
            Thread.findOne({question: question}).populate('answers').catch(err => reject(err)).then(thread => {
                resolve(thread)
            })
        })
    };
    publicMethods.addThread = function (threadObject) {
        return new Promise((resolve, reject) => {
            publicMethods.getThreadByQuestion(threadObject.question).catch(err => {
                reject(err)
            })
                .then(thread => {
                    if (!thread) { // only make a new thread, when question is unique
                        threadObject.save().catch(err => {
                            reject(err)
                        }).then((thread) => {
                            resolve(thread)
                        });
                    } else {
                        reject("Question is not unique")
                    }
                });
        });
    };
    publicMethods.saveObject = function (object) {
        return new Promise((resolve, reject) => {
            object.save().catch(err => reject(err))
                .then(savedObject => resolve(savedObject));
        });
    };

    // TEST MONGOOSE
    // let newThread = new Thread({question: "What is Javascript?"});
    // newThread.addNewAnswer(new Answer({
    //     answer: "Java + script",
    //     threadId: newThread.ObjectId
    // })).catch(err => console.log(err));
    // let userId = "10g55d7ffd3g3";
    // newThread.upVote(userId).catch(err => console.log(err));
    // publicMethods.saveThread(newThread);
    // publicMethods.getAllThreads().catch(err => console.log(err)).then(threads => {
    //     console.log(require("util").inspect(threads, false, null));
    // });

    return publicMethods;
})();

module.exports = repository;