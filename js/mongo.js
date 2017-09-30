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
// db.thread.find()
// db.thread.remove()

let mongoDBModule = (function () {
    const mongo = require('mongodb');
    const MongoClient = mongo.MongoClient;

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
            MongoClient.connect(dbConf.url)
                .catch(err => {
                    console.log("Failed to connect to " + dbConf.url);
                    reject(err);
                })
                .then(db => resolve(db));
        });
    };

    // TODO create db's?
    // create DB + collections(tables)
    let createDB = function () {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    console.log("Database created!");
                    db.createCollection(dbConf.collections.thread)
                        .catch(err => {
                            console.log("Failed to create collection (" + dbConf.collections.thread + ")");
                            reject(err);
                        })
                        .then(res => {
                            console.log("Collection created");
                            db.close();
                            resolve();
                        });
                });
        });
    };

    // TODO drop db's?
    let dropDB = function () {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.drop();
                    db.close();
                    resolve();
                });
        });
    };

    let addThread = function (thread) {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.collection(dbConf.collections.thread).insertOne(thread)
                        .catch(err => {
                            console.log("Failed to add thread (" + thread + ") to collection + ("
                                + dbConf.collections.thread + ")");
                            reject(err);
                        })
                        .then(res => {
                            console.log("Added thread");
                            db.close();
                            resolve(res);
                        });
                });
        });
    };

    let getAllThreads = function () {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.collection(dbConf.collections.thread).find({}).toArray()
                        .catch(err => {
                            console.log("Failed to query all threads from (" + dbConf.collections.thread + ")");
                            reject(err);
                        })
                        .then(threads => {
                            db.close();
                            resolve(threads)
                        });
                });
        });
    };

    // TODO getThreadById might not be usefull
    let getThreadById = function (id) {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    let query = {_id: id};
                    db.collection(dbConf.collections.thread).find(query).toArray()
                        .catch(err => reject(err))
                        .then(data => {
                            db.close();
                            resolve(data)
                        });
                });
        });
    };

    // TODO write this
    let updateThreadById = function (data) {
        return new Promise(function (resolve, reject) {
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    let query = {_id: data.threadId};
                    db.collection(dbConf.collections.thread).updateOne(query, data)
                        .catch(err => reject(err))
                        .then(() => {
                            console.log("Thread(" + data.threadId + ") updated" + data);
                            resolve();
                        });
                });
        });
    };

    // TODO look what stuff needs to be public
    let publicStuff = {
        createDB,
        dropDB,
        addThread,
        getAllThreads,
        getThreadById,
        updateThreadById
    };

    return publicStuff;
})();

module.exports = {
    mongoDBModule
};
