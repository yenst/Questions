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

const app = express();

// TODO remove this line if we don't use ejs
app.set('view engine', 'ejs');

app.get('/', function (req, res, next) {
    res.redirect('/questions.html')
});

app.get('/teacher',function(req,res,next){
    res.redirect('/questions.html?t=1')
});

app.use(express.static('public'));

const httpServer = http.createServer(app);

let serverSocketModule = (function () {
    const serverSocket = io(httpServer);
    let emits = {
        addedNewThread: "1",
        addedNewAnswer: "2",
        CurrentThreads: "3",
        AnswerUpVotesChanged: "4",
        AnswerDownVotesChanged: "5",
        ThreadDownVotesChanged: "6",
        ThreadUpVotesChanged: "7",
        makeGreen : "8"
    };
    let receives = {
        OpenNewThread: "a",
        questionAnswered: "b",
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f",
        answerApproved: "g"
    };

    let refreshCurrentThreads = function (socket) {
        mongoDB.getAllThreads().catch(err => {
            throw err
        }).then(threads => {
            let sortedThreads = helperFunctions.sortByUpVotes(threads);
            threads.forEach(thread => {
                thread.answers = helperFunctions.sortByUpVotes(thread.answers);
            });
            socket.emit(emits.CurrentThreads, sortedThreads);
            socket.broadcast.emit(emits.CurrentThreads, sortedThreads);
        });
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    // TODO handle errors from db here
    let init = function () {
        serverSocket.on('connection', function (socket) {
            mongoDB.getAllThreads()
                .catch(err => {
                    throw err
                })
                .then(threads => {
                    let sortedThreads = helperFunctions.sortByUpVotes(threads);
                    socket.emit(emits.CurrentThreads, sortedThreads);
                });

            socket.on(receives.OpenNewThread, function (data) {
                let newThread = new Thread(data.question);

                mongoDB.addThread(newThread)
                    .catch(err => {
                        throw err
                    })
                    .then(res => {
                        console.log("Added thread (" + newThread.question + ")");
                        socket.emit(emits.addedNewThread, newThread);
                        socket.broadcast.emit(emits.addedNewThread, newThread);
                    });
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
            }).on(receives.incrementThreadUpVotes, function (question) {
                mongoDB.incrementThreadUpVotes(question).catch(err => {
                    throw err
                }).then((updatedThread) => {
                    console.log("Thread (" + updatedThread.question + ") up voted to (" + updatedThread.upVotes + ")");
                    refreshCurrentThreads(socket);
                });
            }).on(receives.decrementThreadUpVotes, function (question) {
                mongoDB.decrementThreadUpVotes(question).catch(err => {
                    throw err
                }).then((updatedThread) => {
                    console.log("Thread (" + updatedThread.question + ") down voted to (" + updatedThread.upVotes + ")");
                    refreshCurrentThreads(socket);
                });
            }).on(receives.incrementAnswerUpVotes, function (data) {
                // TODO Link this to front-end + test
                mongoDB.incrementAnswerUpVotes(data.question, data.answer).catch(err => {
                    throw err
                }).then((updatedAnswer) => {
                    console.log("Answer (" + updatedAnswer.answer + ") up voted to (" + updatedAnswer.upVotes + ") in thread (" + data.question + ")");
                    refreshCurrentThreads(socket);
                });
            }).on(receives.decrementAnswerUpVotes, function (data) {
                // TODO Link this to front-end + test
                mongoDB.decrementAnswerUpVotes(data.question, data.answer).catch(err => {
                    throw err
                }).then((updatedAnswer) => {
                    console.log("Answer (" + updatedAnswer.answer + ") up voted to (" + updatedAnswer.upVotes + ") in thread (" + data.question + ")");
                    refreshCurrentThreads(socket);
                });
            }).on(receives.answerApproved, function(data){
                mongoDB.approveAnswer(data.question, data.answer).catch(err => {
                    throw err
                }).then((thread) => {
                    let dataToSend = {
                        question: thread.question,
                        answer: data.answer
                    };
                    refreshCurrentThreads(socket);
                })
            });
        });
    };

    return {
        init
    };
})();

let helperFunctions = {
    sortByUpVotes: function (arrayOfVoteAbleObjects) {
        arrayOfVoteAbleObjects.sort((a, b) => {
            return b.upVotes - a.upVotes;
        });
        return arrayOfVoteAbleObjects;
    },
};

serverSocketModule.init();
httpServer.listen(8080, function () {
    console.log("Webserver running at port 8080")
});