/**::::::::
 * Created by siemen on 05/06/2017.
 */
"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");

const mongoDB = require("./js/mongo.js").mongoDBModule;
const Thread = require("./js/thread.js").Thread;
const Answer = require("./js/answer.js").Answer;
const VoteAble = require("./js/voteAble.js").VoteAble;

var app = express();

// TODO remove this line if we don't use ejs
app.set('view engine', 'ejs');

app.get('/', function (req, res, next) {
    res.redirect('/questions.html')
});

app.use(express.static('public'));

const httpServer = http.createServer(app);

// let ThreadManager = (function(){
//     let getThreadById = function(){
//
//     };
//
//     let getAnswerById = function(){
//
//     };
//
//     let publicStuff = {
//         incrementThreadUpVotes: function(thread_id){
//
//         },
//         incrementThreadDownVotes: function(thread_id){
//
//         },
//         incrementAnswerUpVotes: function(answer_id, thread_id){
//
//         },
//         incrementAnswerDownVotes: function(answer_id, thread_id){
//
//         },
//     };
//
//
//     return publicStuff;
// })();

let serverSocketModule = (function () {
    const serverSocket = io(httpServer);
    let emits = {
        addedNewThread: "newThread",
        addedNewAnswer: "newAnswer",
        CurrentThreads: "CurrentThreads"
    };
    let receives = {
        OpenNewThread: "OpenNewThread",
        questionAnswered: "questionAnswered"
    };

    let init = function () {
        serverSocket.on('connection', function (socket) {
            mongoDB.getAllThreads()
                .catch(err => {throw err})
                .then(threads => {
                    socket.emit(emits.CurrentThreads, threads);
                });

            socket.on(receives.OpenNewThread, function (data) {
                let newThread = new Thread(data.question);

                socket.emit(emits.addedNewThread, newThread);
                socket.broadcast.emit(emits.addedNewThread, newThread);

                mongoDB.addThread(newThread)
                    .catch(err => {throw err})
                    .then(res => {});
            }).on(receives.questionAnswered, function (data) {
                    mongoDB.addAnswerToThread(data.question, data.answer)
                        .catch(err => {throw err})
                        .then((res) => {
                            console.log("Added answer (" + data.answer + ") to thread (" + data.question + ")");
                            socket.emit(emits.addedNewAnswer, data);
                            socket.broadcast.emit(emits.addedNewAnswer, data);
                        });
                });
        });
    };

    return {
        init
    };
})();
serverSocketModule.init();
httpServer.listen(8080, function () {
    console.log("Webserver running at port 8080")
});