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

// TODO keep a list of current threads in memory?
let serverSocketModule = (function () {
    const serverSocket = io(httpServer);
    let emits = {
        addedNewThread: "1",
        addedNewAnswer: "2",
        CurrentThreads: "3",
        AnswerUpVotesChanged: "4",
        AnswerDownVotesChanged: "5",
        ThreadDownVotesChanged: "6",
        ThreadUpVotesChanged: "7"
    };
    let receives = {
        OpenNewThread: "a",
        questionAnswered: "b",
        increaseAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        increaseThreadUpVotes: "e",
        decrementThreadUpVotes: "f"
    };

    let init = function () {
        serverSocket.on('connection', function (socket) {
            mongoDB.getAllThreads()
                .catch(err => {
                    // TODO handle errors
                    throw err
                })
                .then(threads => {
                    let sortedThreads = helperFunctions.sortByUpVotes(threads);
                    socket.emit(emits.CurrentThreads, sortedThreads);
                });

            socket.on(receives.OpenNewThread, function (data) {
                let newThread = new Thread(data.question);

                socket.emit(emits.addedNewThread, newThread);
                socket.broadcast.emit(emits.addedNewThread, newThread);

                mongoDB.addThread(newThread)
                    .catch(err => {
                        throw err
                    })
                    .then(res => {});
            }).on(receives.questionAnswered, function (data) {
                let newAnswer = new Answer(data.answer);
                mongoDB.addAnswerToThread(data.question, newAnswer.answer)
                    .catch(err => {
                        throw err
                    })
                    .then(() => {
                        console.log("Added answer (" + newAnswer.answer + ") to thread (" + data.question + ")");
                        let dataToSend = {
                            question: data.question,
                            answer: newAnswer
                        };
                        socket.emit(emits.addedNewAnswer, dataToSend);
                        socket.broadcast.emit(emits.addedNewAnswer, dataToSend);
                    });
            }).on(receives.increaseThreadUpVotes, function (question) {
                // TODO refactoring everything with voting
                mongoDB.increaseThreadUpVotes(question)
                    .catch(err => {
                        throw err
                    })
                    .then(() => {
                        mongoDB.getAllThreads()
                            .catch(err => {
                                throw err
                            })
                            .then(threads => {
                                // TODO refactor this sort
                                let sortedThreads = helperFunctions.sortByUpVotes(threads);
                                socket.emit(emits.CurrentThreads, threads);
                                socket.broadcast.emit(emits.CurrentThreads, threads);
                            });
                    });
            });
        });
    };

    return {
        init
    };
})();

let helperFunctions = {
    sortByUpVotes: function(arrayOfThreads){
        arrayOfThreads.sort( (a,b) => {
            return b.upVotes-a.upVotes;
        });
        return arrayOfThreads;
    },
};

serverSocketModule.init();
httpServer.listen(8080, function () {
    console.log("Webserver running at port 8080")
});