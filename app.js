"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");
const sanitizer = require("sanitizer");
const passport = require("passport");
const session = require("express-session");

const mongoose = require("./js/mongoose");
const Thread = require("./js/mongoose_models/thread");
const Answer = require("./js/mongoose_models/answer");
const auth = require("./js/auth");

const app = express();
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID:
                "320429270103-9hls0ae1q34g6j3tav7dkr6k9lq7ie0a.apps.googleusercontent.com",
            clientSecret: "a-EvkBiEu3UUr8KbKjWsxxRL",
            callbackURL: "http://questions.dev:8080/auth/google/callback"
        },
        function (req, accessToken, refreshToken, profile, done) {
            done(null, profile);
        }
    )
);

app.use(express.static("public"));

app.set("view engine", "ejs");

app.use(session({secret: "questions"}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.get("/", function (req, res, next) {
    if (req.session.user) {
        // return page with user info
        return res.render("questions.ejs", {
            user: req.session.user,
            loginText: "logged in as "
        });
    }

    if (req.user) {
        var userinfo = {
            name: req.user.displayName,
            email: req.user.emails[0].value
        };
        req.session.user = userinfo;

        return res.redirect("/");
    }

    return res.render("questions.ejs", {
        user: null,
        loginText: null
    });
});

app.get("/login", function (req, res, next) {
});

app.use("/auth", auth);

app.get("/teacher", function (req, res, next) {
    //login stuff atm
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
        updateQuestionVotes: "10",
        loggedInSession: "11"
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
        serverSocket.on("connection", function (socket) {
            mongoose.getAllThreads()
                .catch(err => {
                    throw err;
                })
                .then(threads => {
                    threads.forEach(thread => {
                        thread.answers = helperFunctions.sortByUpVotes(thread.answers);
                        // TODO sort by approved
                    });
                    socket.emit(emits.CurrentThreads, threads);
                });

            socket
                .on(receives.OpenNewThread, function (question) {
                    let questionMarked = helperFunctions.checkQuestionMark(
                        sanitizer.escape(question)
                    );
                    mongoose.getThreadByQuestion(questionMarked).catch(err => {
                        throw err
                    })
                        .then(thread => {
                            if (!thread) { // only make a new thread, when question is unique
                                new Thread({question: questionMarked}).save().catch(err => {
                                    throw err
                                }).then((thread) => {
                                    console.log("Added thread (" + thread.question + ")");
                                    socket.emit(emits.addedNewThread, thread);
                                    socket.broadcast.emit(emits.addedNewThread, thread);
                                });
                            }
                        });
                })
                .on(receives.questionAnswered, function (data) {
                    let threadId = mongoose.createObjectId(sanitizer.escape(data.threadId));
                    mongoose.getThreadById(threadId).catch(err => {
                        throw err
                    })
                        .then(returnedThread => {
                            let answerText = sanitizer.escape(data.answer);
                            let answer = new Answer({answer: answerText, parentNode: threadId});
                            returnedThread.addNewAnswer(answer).catch(err => {
                                throw err
                            })
                                .then(() => {
                                    returnedThread.save().catch(err => {
                                        throw err
                                    })
                                        .then(() => {
                                            answer.save().catch(err => {
                                                throw err
                                            })
                                                .then((returnedAnswer) => {
                                                    Answer.populate(returnedAnswer, "parentNode").catch(err => {
                                                        throw err
                                                    })
                                                        .then(populatedAnswer => {
                                                            console.log("Added answer (" + populatedAnswer.answer + ") to thread (" + populatedAnswer.parentNode.question + ")");
                                                            socket.emit(emits.addedNewAnswer, populatedAnswer);
                                                            socket.broadcast.emit(emits.addedNewAnswer, populatedAnswer);
                                                        });
                                                });
                                        });
                                });
                        });
                })
                .on(receives.incrementThreadUpVotes, function (threadId) {
                    mongoose.getThreadById(sanitizer.escape(threadId))
                        .catch(err => {
                            throw err
                        })
                        .then(thread => {
                            thread.upVote();
                            thread.save().catch(err => {
                                throw err
                            })
                                .then(() => {
                                    socket.emit(emits.updateQuestionVotes, thread);
                                    socket.broadcast.emit(emits.updateQuestionVotes, thread);
                                })
                        });
                })
                .on(receives.decrementThreadUpVotes, function (threadId) {
                    mongoose.getThreadById(sanitizer.escape(threadId))
                        .catch(err => {
                            throw err
                        })
                        .then(thread => {
                            thread.downVote();
                            thread.save().catch(err => {
                                throw err
                            })
                                .then(() => {
                                    socket.emit(emits.updateQuestionVotes, thread);
                                    socket.broadcast.emit(emits.updateQuestionVotes, thread);
                                })
                        });
                })
                .on(receives.incrementAnswerUpVotes, function (answerId) {
                    mongoose.getAnswerById(sanitizer.escape(answerId)).catch(err => {
                        throw err
                    })
                        .then(answer => {
                            answer.upVote();
                            answer.save().catch(err => {
                                throw err
                            })
                                .then((returnedAnswer) => {
                                    socket.emit(emits.updateAnswerVotes, returnedAnswer);
                                    socket.broadcast.emit(emits.updateAnswerVotes, returnedAnswer);
                                });
                        });
                })
                .on(receives.decrementAnswerUpVotes, function (answerId) {
                    mongoose.getAnswerById(sanitizer.escape(answerId)).catch(err => {
                        throw err
                    })
                        .then(answer => {
                            answer.downVote();
                            answer.save().catch(err => {
                                throw err
                            })
                                .then((returnedAnswer) => {
                                    socket.emit(emits.updateAnswerVotes, returnedAnswer);
                                    socket.broadcast.emit(emits.updateAnswerVotes, returnedAnswer);
                                });
                        });
                })
                .on(receives.approvedAnswerStateChanged, function (answerId) {
                    mongoose.getAnswerById(sanitizer.escape(answerId)).catch(err => {
                        throw err
                    })
                        .then(answer => {
                            answer.changeIsApproved();
                            answer.save().catch(err => {
                                throw err
                            })
                                .then(returnedAnswer => {
                                    console.log("Answer (" + returnedAnswer.answer + ") changed approved state to (" + approvedState + ") in thread (" + returnedAnswer.parentNode.question + ")");
                                    socket.broadcast.emit(emits.approvedAnswerStateChanged, returnedAnswer);
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
    sortByUpVotes: function (arr) {
        arr.sort((a, b) => {
            return b.votes - a.votes;
        });
        return arr;
    },
    checkQuestionMark: function (question) {
        let checkedQuestion = question;
        if (!question.endsWith("?")) {
            checkedQuestion += "?";
        }
        return checkedQuestion;
    }
};

serverSocketModule.init();
httpServer.listen(8080, function () {
    console.log("Webserver running at port 8080");
});
