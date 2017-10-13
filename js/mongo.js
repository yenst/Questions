"use strict";

// SETTING UP MONGO
// ----------------
// 1. run mongo.exe
// 2. run some commands to create the DB:
// - use questionsDB
// - db.thread
// 3. you're good to go

// HANDY COMMANDS
// --------------
// db.thread.find().pretty()
// db.thread.remove({})


let mongo = (function () {
    const MongoClient = require('mongodb').MongoClient;

    const Thread = require("./thread.js");
    const Answer = require("./answer.js");

    // TODO security?
    const dbConf = {
        // DB is written away in /data/db
        // questionsDB = database name;
        url: "mongodb://localhost:27017/questionsDB",

        // collections = tables
        collections: {
            thread: "thread"
        }
    };

    let openConnection = function () {
        return new Promise(function (resolve, reject) {
            MongoClient.connect(dbConf.url).catch(err => {
                console.log("Failed to connect to " + dbConf.url);
                reject(err);
            }).then(db => resolve(db));
        });
    };

    let getThreadByQuestion = function (threadQuestion) {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                let query = {question: threadQuestion};
                db.collection(dbConf.collections.thread).find(query).toArray().catch(err => reject(err)).then(res => {
                    db.close();
                    resolve(new Thread(res[0]));
                });
            });
        });
    };

    let updateThreadByQuestion = function (threadObject) {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                let query = {question: threadObject.question};
                db.collection(dbConf.collections.thread).updateOne(query, threadObject).catch(err => reject(err)).then((res) => {
                    db.close();
                    resolve(res);
                });
            });
        });
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    // TODO create db automatic?
    // create DB + collections(tables)
    let createDB = function () {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                console.log("Database created!");
                db.createCollection(dbConf.collections.thread).catch(err => {
                    console.log("Failed to create collection (" + dbConf.collections.thread + ")");
                    reject(err);
                }).then(res => {
                    console.log("Collection created");
                    db.close();
                    resolve(res);
                });
            });
        });
    };

    // TODO drop db automatic?
    let dropDB = function () {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                db.drop();
                db.close();
                resolve();
            });
        });
    };

    let addThread = function (threadToAdd) {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                getAllThreads().catch(err => reject(err)).then(threads => {
                    let arr = threads.find(thread => {
                        return thread.question === threadToAdd.question
                    });
                    if (arr) {
                        reject("The question (" + threadToAdd.question + ") has already been asked!");
                    } else {
                        db.collection(dbConf.collections.thread).insertOne(threadToAdd).catch(err => {
                            reject("Failed to add thread (" + threadToAdd.question + ") to collection + (" + dbConf.collections.thread + ")");
                        }).then(res => {
                            db.close();
                            resolve(res);
                        });
                    }
                });
            });
        });
    };

    let getAllThreads = function () {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                db.collection(dbConf.collections.thread).find({}).toArray().catch(err => {
                    reject("Failed to query all threads from (" + dbConf.collections.thread + ")");
                }).then(res => {
                    db.close();
                    let threads = [];
                    res.forEach(item => {
                        threads.push(new Thread(item));
                    });
                    resolve(threads);
                });
            });
        });
    };

    let addAnswerToThread = function (threadQuestion, answerText) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                if (thread.isAnswerUnique(answerText)) {
                    thread.addNewAnswer(answerText);
                    updateThreadByQuestion(thread).catch(err => reject(err)).then(() => resolve());
                } else {
                    reject("Answer is not unique");
                }
            });
        });
    };

    let incrementThreadUpVotes = function (threadQuestion) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                thread.incrementUpVotes();
                updateThreadByQuestion(thread).catch(err => reject(err)).then(() => {
                    resolve(thread);
                });
            });
        });
    };

    let decrementThreadUpVotes = function (threadQuestion) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                thread.decrementUpVotes();
                updateThreadByQuestion(thread).catch(err => reject(err)).then(() => {
                    resolve(thread);
                });
            });
        });
    };

    let incrementAnswerUpVotes = function (threadQuestion, answer) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                let findAnswerObject = function (answerObject) {
                    return answerObject.answer === answer;
                };
                let obj = thread.answers.find(findAnswerObject);
                let upVotedAnswerObject = new Answer(obj);
                let upVotedAnswerIndex = thread.answers.findIndex(findAnswerObject);
                upVotedAnswerObject.incrementUpVotes();
                thread.answers[upVotedAnswerIndex] = upVotedAnswerObject;
                updateThreadByQuestion(thread);
                resolve(upVotedAnswerObject);
            });
        });
    };

    let decrementAnswerUpVotes = function (threadQuestion, answer) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                let findAnswerObject = function (answerObject) {
                    return answerObject.answer === answer;
                };
                let obj = thread.answers.find(findAnswerObject);
                let downVotedAnswerObject = new Answer(obj);
                let downVotedAnswerIndex = thread.answers.findIndex(findAnswerObject);
                downVotedAnswerObject.decrementUpVotes();
                thread.answers[downVotedAnswerIndex] = downVotedAnswerObject;
                updateThreadByQuestion(thread);
                resolve(downVotedAnswerObject);
            });
        });
    };

    let changeApprovedAnswerState = function (threadQuestion, answer) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                let findAnswerObject = function (answerObject) {
                    return answerObject.answer === answer;
                };
                let obj = thread.answers.find(findAnswerObject);
                let approvedAnswer = new Answer(obj);
                let approvedAnswerIndex = thread.answers.findIndex(findAnswerObject);
                approvedAnswer.changeIsApproved();
                thread.answers[approvedAnswerIndex] = approvedAnswer;
                updateThreadByQuestion(thread);
                resolve(approvedAnswer.isApproved);
            });
        });
    };

    return {
        createDB,
        dropDB,
        addThread,
        getAllThreads,
        addAnswerToThread,
        incrementThreadUpVotes,
        decrementThreadUpVotes,
        incrementAnswerUpVotes,
        decrementAnswerUpVotes,
        changeApprovedAnswerState
    };
})();

module.exports = mongo;
