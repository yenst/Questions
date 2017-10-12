/**::::::::
 * Created by siemen on 05/06/2017.
 */
"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");
const sanitizer = require('sanitizer');
const passport = require('passport');
const session = require('express-session');



const mongoDB = require("./js/mongo.js").mongoDBModule;
const Thread = require("./js/thread.js").Thread;
const Answer = require("./js/answer.js").Answer;
const VoteAble = require("./js/voteAble.js").VoteAble;
const Login = require("./js/login.js").Login;
const auth = require('./js/auth');

const app = express();
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
 clientID: '320429270103-9hls0ae1q34g6j3tav7dkr6k9lq7ie0a.apps.googleusercontent.com',
 clientSecret: 'a-EvkBiEu3UUr8KbKjWsxxRL',
 callbackURL: 'http://127.0.0.1:8080/auth/google/callback'},
 function(req,accessToken,refreshToken,profile,done){
     done(null,profile);

 }
 
));

app.use(express.static('public'));


app.use(session({secret: 'questions'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user,done){
    done(null, user)
});

passport.deserializeUser(function(user,done){
 done(null,user)
});

app.get('/', function (req, res, next) {
    res.redirect('/questions.html')
});

app.get('/login',function(req,res,next){
    

});

app.use('/auth',auth);

app.get('/teacher',function(req,res,next){
    res.redirect('/questions.html?t=1')
});



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
        approvedAnswerStateChanged: "8",
        updateAnswerVotes: "9",
        updateQuestionVotes: "10"
    };
    let receives = {
        OpenNewThread: "a",
        questionAnswered: "b",
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f",
        approvedAnswerStateChanged: "g"
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    // TODO handle errors from db here
    let init = function () {
        serverSocket.on('connection', function (socket) {
            mongoDB.getAllThreads().catch(err => {
                throw err
            }).then(threads => {
                let sortedThreads = helperFunctions.sortByUpVotes(threads);
                sortedThreads.forEach(thread => {
                    thread.answers = helperFunctions.sortByUpVotes(thread.answers);
                    // TODO sort by approved
                });
                socket.emit(emits.CurrentThreads, sortedThreads);
            });

            socket.on(receives.OpenNewThread, function (question) {
                let newThread = new Thread(helperFunctions.checkQuestionMark(sanitizer.escape(question)));
                mongoDB.addThread(newThread)
                    .catch(err => {
                        throw err
                    })
                    .then(res => {
                        console.log("Added thread (" + newThread.question + ")");
                        // socket.emit(emits.addedNewThread, newThread);
                        socket.broadcast.emit(emits.addedNewThread, newThread);
                    });
            }).on(receives.questionAnswered, function (data) {
                let question = sanitizer.escape(data.question);
                let newAnswer = new Answer(sanitizer.escape(data.answer));
                mongoDB.addAnswerToThread(question, newAnswer.answer).catch(err => {
                        throw err
                    }).then(() => {
                        console.log("Added answer (" + newAnswer.answer + ") to thread (" + question + ")");
                        let dataToSend = {
                            question: question,
                            answerObject: newAnswer
                        };
                        // socket.emit(emits.addedNewAnswer, dataToSend);
                        socket.broadcast.emit(emits.addedNewAnswer, dataToSend);
                    });
            }).on(receives.incrementThreadUpVotes, function (question) {
                mongoDB.incrementThreadUpVotes(sanitizer.escape(question)).catch(err => {
                    throw err
                }).then((updatedThread) => {
                    let dataToSend = {
                        question : updatedThread.question,
                        votes: updatedThread.upVotes
                    };
                    socket.emit(emits.updateQuestionVotes, dataToSend);
                    socket.broadcast.emit(emits.updateQuestionVotes, dataToSend);
                });
            }).on(receives.decrementThreadUpVotes, function (question) {
                mongoDB.decrementThreadUpVotes(sanitizer.escape(question)).catch(err => {
                    throw err
                }).then((updatedThread) => {
                    let dataToSend = {
                        question : updatedThread.question,
                        votes: updatedThread.upVotes
                    };
                    socket.emit(emits.updateQuestionVotes, dataToSend);
                    socket.broadcast.emit(emits.updateQuestionVotes, dataToSend);
                });
            }).on(receives.incrementAnswerUpVotes, function (data) {
                let question = sanitizer.escape(data.question);
                let answer = sanitizer.escape(data.answer);
                mongoDB.incrementAnswerUpVotes(question, answer).catch(err => {
                    throw err
                }).then((updatedAnswer) => {
                    let dataToSend = {
                        question : question,
                        answer : answer,
                        votes: updatedAnswer.upVotes
                    };
                    socket.emit(emits.updateAnswerVotes, dataToSend);
                    socket.broadcast.emit(emits.updateAnswerVotes, dataToSend);

                });
            }).on(receives.decrementAnswerUpVotes, function (data) {
                let question = sanitizer.escape(data.question);
                let answer = sanitizer.escape(data.answer);
                mongoDB.decrementAnswerUpVotes(question, answer).catch(err => {
                    throw err
                }).then((updatedAnswer) => {
                    let dataToSend = {
                        question : question,
                        answer : answer,
                        votes: updatedAnswer.upVotes
                    };
                    socket.emit(emits.updateAnswerVotes, dataToSend);
                    socket.broadcast.emit(emits.updateAnswerVotes, dataToSend);
                });
            }).on(receives.approvedAnswerStateChanged, function(data){
                let question = sanitizer.escape(data.question);
                let answer = sanitizer.escape(data.answer);
                mongoDB.changeApprovedAnswerState(question, answer).catch(err => {
                    throw err
                }).then((approvedState) => {
                    console.log("Answer (" + answer + ") changed approved state to (" + approvedState + ") in thread (" + question + ")");
                    let dataToSend = {
                        question: question,
                        answer: answer
                    };
                    socket.broadcast.emit(emits.approvedAnswerStateChanged, dataToSend);
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
    checkQuestionMark: function(question){
        let checkedQuestion = question;
        if(!question.endsWith("?")){
            checkedQuestion += "?";
        }
        return checkedQuestion
    }
};

serverSocketModule.init();
httpServer.listen(8080, function () {
    console.log("Webserver running at port 8080")
});