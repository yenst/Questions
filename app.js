"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");
const sanitizer = require("sanitizer");
const passport = require("passport");
const session = require("express-session");

const repository = require("./js/repository");
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

app.set("view engine", "pug");

app.use(session({secret: "questions"}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});


let isTeacher = function (user) {
    if (user !== undefined) {
        let u = user._json.domain;
        return u !== 'student.howest.be';
    }
};

app.get("/", function (req, res) {
    if (req.session.user) {
        // return page with user info
        return res.render("layout.pug", {
            user: req.session.user,
            loginText: "logged in as "
        });
    }
    if (req.user) {
        req.session.user = {
            id: req.user.id,
            name: req.user.displayName,
            email: req.user.emails[0].value
        };
        return res.redirect("/");
    }
    return res.render("layout.pug", {
        user: null,
        loginText: null
    });

});

app.get("/checkteacher", function (req, res) {
    res.send(JSON.stringify(isTeacher(req.user)));
});

app.get("/getUserId", function (req, res) {
    if(req.isAuthenticated()){
        res.send(JSON.stringify(req.user.id));
    }
});

// TODO is this used?
app.get("/login", function (req, res, next) {
});

app.use("/auth", auth);

// TODO is this used?
app.get("/teacher", function (req, res, next) {
    console.log("toegekomen")
});

const httpServer = http.createServer(app);

let serverSocketModule = (function () {
    const serverSocket = io(httpServer);
    let emits = {
        addedNewThread: "1",
        addedNewAnswer: "2",
        CurrentThreads: "3",
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
            repository.getAllThreads().catch(err => {
                throw err;
            }).then(threads => {
                threads.forEach(thread => {
                    thread.answers = helperFunctions.sortByUpVotes(thread.answers);
                    // TODO sort by approved
                });
                socket.emit(emits.CurrentThreads, threads);
            });

            socket.on(receives.OpenNewThread, function (question) {
                let questionMarked = helperFunctions.checkQuestionMark(
                    sanitizer.escape(question)
                );
                repository.addThread(new Thread({question: questionMarked})).catch(err => {
                    throw err
                }).then(returnedThread => {
                    console.log("Added thread (" + returnedThread.question + ")");
                    socket.emit(emits.addedNewThread, returnedThread);
                    socket.broadcast.emit(emits.addedNewThread, returnedThread);
                });
            }).on(receives.questionAnswered, function (data) {
                let threadId = repository.createObjectId(sanitizer.escape(data.threadId));
                repository.getThreadById(threadId).catch(err => {
                    throw err
                }).then(returnedThread => {
                    let answerText = sanitizer.escape(data.answer);
                    let answer = new Answer({answer: answerText, parentNode: returnedThread._id});
                    returnedThread.addNewAnswer(answer).catch(err => {
                        throw err
                    }).then(() => {
                        repository.saveObject(returnedThread).catch(err => {
                            throw err
                        }).then(() => {
                            repository.saveObject(answer).catch(err => {
                                throw err
                            }).then(savedAnswer => {
                                Answer.populate(savedAnswer, "parentNode").catch(err => {
                                    throw err
                                }).then(populatedAnswer => {
                                    console.log("Added answer (" + populatedAnswer.answer + ") to thread (" + populatedAnswer.parentNode.question + ")");
                                    socket.emit(emits.addedNewAnswer, populatedAnswer);
                                    socket.broadcast.emit(emits.addedNewAnswer, populatedAnswer);
                                });
                            });
                        });
                    });
                });
            }).on(receives.incrementThreadUpVotes, function (data) {
                repository.getThreadById(sanitizer.escape(data.threadId)).catch(err => {
                    throw err
                }).then(thread => {
                    thread.upVote(sanitizer.escape(data.userId));
                    repository.saveObject(thread).catch(err => {
                        throw err
                    }).then((savedThread) => {
                        socket.emit(emits.updateQuestionVotes, savedThread);
                        socket.broadcast.emit(emits.updateQuestionVotes, savedThread);
                    })
                });
            }).on(receives.decrementThreadUpVotes, function (data) {
                repository.getThreadById(sanitizer.escape(data.threadId)).catch(err => {
                    throw err
                }).then(thread => {
                    thread.downVote(sanitizer.escape(data.userId));
                    repository.saveObject(thread).catch(err => {
                        throw err
                    }).then((savedThread) => {
                        socket.emit(emits.updateQuestionVotes, savedThread);
                        socket.broadcast.emit(emits.updateQuestionVotes, savedThread);
                    })
                });
            }).on(receives.incrementAnswerUpVotes, function (data) {
                repository.getAnswerById(sanitizer.escape(data.answerId)).catch(err => {
                    throw err
                }).then(answer => {
                    answer.upVote(sanitizer.escape(data.userId));
                    repository.saveObject(answer).catch(err => {
                        throw err
                    }).then((savedAnswer) => {
                        socket.emit(emits.updateAnswerVotes, savedAnswer);
                        socket.broadcast.emit(emits.updateAnswerVotes, savedAnswer);
                    });
                });
            }).on(receives.decrementAnswerUpVotes, function (data) {
                repository.getAnswerById(sanitizer.escape(data.answerId)).catch(err => {
                    throw err
                }).then(answer => {
                    answer.downVote(sanitizer.escape(data.userId));
                    repository.saveObject(answer).catch(err => {
                        throw err
                    }).then((savedAnswer) => {
                        socket.emit(emits.updateAnswerVotes, savedAnswer);
                        socket.broadcast.emit(emits.updateAnswerVotes, savedAnswer);
                    });
                });
            }).on(receives.approvedAnswerStateChanged, function (answerId) {
                repository.getAnswerById(sanitizer.escape(answerId)).catch(err => {
                    throw err
                }).then(answer => {
                    answer.changeIsApproved();
                    repository.saveObject(answer).catch(err => {
                        throw err
                    }).then((savedAnswer) => {
                        console.log("Answer (" + savedAnswer.answer + ") changed approved state to (" + savedAnswer.isApproved + ") in thread (" + savedAnswer.parentNode.question + ")");
                        socket.broadcast.emit(emits.approvedAnswerStateChanged, savedAnswer);
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
