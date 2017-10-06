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


let mongoDBModule = (function () {
    const mongo = require('mongodb');
    const MongoClient = mongo.MongoClient;

    const Thread = require("./thread.js").Thread;
    const Answer = require("./answer.js").Answer;
    const VoteAble = require("./voteAble.js").VoteAble;

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
                    resolve(new Thread(res[0].question, res[0].answers, res[0].upVotes));
                });
            });
        });
    };

    let updateThreadByQuestion = function (thread) {
        return new Promise(function (resolve, reject) {
            openConnection().catch(err => reject(err)).then(db => {
                let query = {question: thread.question};
                db.collection(dbConf.collections.thread).updateOne(query, thread).catch(err => reject(err)).then((res) => {
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
                        threads.push(new Thread(item.question, item.answers, item.upVotes));
                    });
                    resolve(threads)
                });
            });
        });
    };

    let addAnswerToThread = function (threadQuestion, answer) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                if (thread.isAnswerUnique(answer)) {
                    thread.addNewAnswer(answer);
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

                let upVotedAnswerObject = new Answer(obj.answer, obj.upVotes, obj.isApproved);
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
                let downVotedAnswerObject = new Answer(obj.answer, obj.upVotes, obj.isApproved);
                let downVotedAnswerIndex = thread.answers.findIndex(findAnswerObject);
                downVotedAnswerObject.decrementUpVotes();
                thread.answers[downVotedAnswerIndex] = downVotedAnswerObject;
                updateThreadByQuestion(thread);
                resolve(downVotedAnswerObject);
            });
        });
    };

    let approveAnswer = function (threadQuestion, answer) {
        return new Promise(function (resolve, reject) {
            getThreadByQuestion(threadQuestion).catch(err => reject(err)).then(thread => {
                let findAnswerObject = function (answerObject) {
                    return answerObject.answer === answer;
                };
                let obj = thread.answers.find(findAnswerObject);
                let approvedAnswer = new Answer(obj.answer, obj.upVotes, obj.isApproved);
                let approvedAnswerIndex = thread.answers.findIndex(findAnswerObject);
                approvedAnswer.changeIsApproved();
                thread.answers[approvedAnswerIndex] = approvedAnswer;
                updateThreadByQuestion(thread);
                resolve(thread);
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
        approveAnswer
    };
})();

module.exports = {
    mongoDBModule
};
