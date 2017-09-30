"use strict";

// README:
// run mongod(.exe)

module.exports = {
    mongoDBModule
};

let mongoDBModule = (function(){
    const mongo = require('mongodb');
    const MongoClient = mongo.MongoClient;

    // TODO security???
    const dbConf = {
        // DB is written away in /data/db
        // questionsDB = database name;
        url: "mongodb://localhost:27017/questionsDB",

        // collections = tables
        collections: {
            threads: "Thread"
        }
    };

    let openConnection = function(){
        return new Promise(function(resolve,reject){
            MongoClient.connect(dbConf.url)
                .catch(err => {
                    console.log("Failed to connect to " + dbConf.url);
                    reject(err);
                })
                .then(db => resolve(db));
        });
    };

    // create DB + collections(tables)
    let createDB = function(){
        return new Promise(function(resolve, reject){
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    console.log("Database created!");
                    db.createCollection(dbConf.collections.threads)
                        .catch(err => {
                            console.log("Failed to create collection (" + dbConf.collections.threads + ")");
                            reject(err);})
                        .then(res => {
                            console.log("Collection created!\n" +
                                "-----------------------\n" + res);
                            db.close();
                            resolve();
                        });
                });
        });
    };

    let dropDB = function(){
        return new Promise(function(resolve, reject){
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.drop();
                    db.close();
                    resolve();
                });
        });
    };

    let addThread = function(thread){
        return new Promise(function(resolve, reject){
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.collection(dbConf.collections.threads).insertOne(thread)
                        .catch(err => {
                            console.log("Failed to add thread (" + thread + ") to collection + ("
                                + dbConf.collections.threads + ")");
                            reject(err);})
                        .then(res => {
                            console.log("Added thread!\n" +
                                "------------------\n" + res);
                            db.close();
                            resolve(res);
                        });
                });
        });
    };

    let getAllThreads = function(){
        return new Promise(function(resolve, reject){
            openConnection()
                .catch(err => reject(err))
                .then(db => {
                    db.collection(dbConf.collections.threads).find({}).toArray()
                        .catch(err => {
                            console.log("Failed to query all threads from (" + dbConf.collections.threads + ")");
                            reject(err);})
                        .then(threads => resolve(threads));
                });
        });
    };

    // TODO write these functions
    let getThreadById = function(id){

    };

    let updateThreadById = function(id){

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