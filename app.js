"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");
const sanitizer = require("sanitizer");
const passport = require("passport");
const session = require("express-session");

const mongoDB = require("./js/mongo.js");
const Thread = require("./js/thread.js");
const Answer = require("./js/answer.js");
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
    function(req, accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  )
);

app.use(express.static("public"));

app.set("view engine", "pug");

app.use(session({ secret: "questions" }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.get("/", function(req, res, next) {
  if (req.session.user) {
    // return page with user info
    return res.render("layout.pug", {
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

  return res.render("layout.pug", {
    user: null,
    loginText: null
  });
});

app.get("/login", function(req, res, next) {});

app.use("/auth", auth);

app.get("/teacher", function(req, res, next) {
  //login stuff atm
});

const httpServer = http.createServer(app);

let serverSocketModule = (function() {
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
  let init = function() {
    serverSocket.on("connection", function(socket) {
      mongoDB
        .getAllThreads()
        .catch(err => {
          throw err;
        })
        .then(threads => {
          let sortedThreads = helperFunctions.sortByUpVotes(threads);
          sortedThreads.forEach(thread => {
            thread.answers = helperFunctions.sortByUpVotes(thread.answers);
            // TODO sort by approved
          });
          socket.emit(emits.CurrentThreads, sortedThreads);
        });

      socket
        .on(receives.OpenNewThread, function(question) {
          let questionMarked = helperFunctions.checkQuestionMark(
            sanitizer.escape(question)
          );
          mongoDB
            .addThread(new Thread({ question: questionMarked }))
            .catch(err => {
              throw err;
            })
            .then(res => {
              console.log("Added thread (" + question + ")");
              // socket.emit(emits.addedNewThread, newThread);
              let dataToSend = {
                answerList: [],
                question: questionMarked,
                upVotes: 0
              };
              socket.broadcast.emit(emits.addedNewThread, dataToSend);
            });
        })
        .on(receives.questionAnswered, function(data) {
          let question = sanitizer.escape(data.question);
          let answer = sanitizer.escape(data.answer);
          mongoDB
            .addAnswerToThread(question, answer)
            .catch(err => {
              throw err;
            })
            .then(() => {
              console.log(
                "Added answer (" +
                  data.answer +
                  ") to thread (" +
                  data.question +
                  ")"
              );
              let numberOfAnswers = mongoDB
                .getNumberOfAnswers(question)
                .catch(err => {
                  throw err;
                })
                .then(numberOfAnswers => {
                  let dataToSend = {
                    question: data.question,
                    isApproved: false,
                    answer: answer,
                    upVotes: 0,
                    numberOfAnswers: numberOfAnswers
                  };
                  //socket.emit(emits.addedNewAnswer, dataToSend);
                  socket.broadcast.emit(emits.addedNewAnswer, dataToSend);
                });
            });
        })
        .on(receives.incrementThreadUpVotes, function(question) {
          mongoDB
            .incrementThreadUpVotes(sanitizer.escape(question))
            .catch(err => {
              throw err;
            })
            .then(updatedThread => {
              let dataToSend = {
                question: question,
                votes: updatedThread.upVotes
              };
              socket.emit(emits.updateQuestionVotes, dataToSend);
              socket.broadcast.emit(emits.updateQuestionVotes, dataToSend);
            });
        })
        .on(receives.decrementThreadUpVotes, function(question) {
          mongoDB
            .decrementThreadUpVotes(sanitizer.escape(question))
            .catch(err => {
              throw err;
            })
            .then(updatedThread => {
              let dataToSend = {
                question: question,
                votes: updatedThread.upVotes
              };
              socket.emit(emits.updateQuestionVotes, dataToSend);
              socket.broadcast.emit(emits.updateQuestionVotes, dataToSend);
            });
        })
        .on(receives.incrementAnswerUpVotes, function(data) {
          mongoDB
            .incrementAnswerUpVotes(
              sanitizer.escape(data.question),
              sanitizer.escape(data.answer)
            )
            .catch(err => {
              throw err;
            })
            .then(updatedAnswer => {
              let dataToSend = {
                question: data.question,
                answer: data.answer,
                votes: updatedAnswer.upVotes
              };
              socket.emit(emits.updateAnswerVotes, dataToSend);
              socket.broadcast.emit(emits.updateAnswerVotes, dataToSend);
            });
        })
        .on(receives.decrementAnswerUpVotes, function(data) {
          mongoDB
            .decrementAnswerUpVotes(
              sanitizer.escape(data.question),
              sanitizer.escape(data.answer)
            )
            .catch(err => {
              throw err;
            })
            .then(updatedAnswer => {
              let dataToSend = {
                question: data.question,
                answer: data.answer,
                votes: updatedAnswer.upVotes
              };
              socket.emit(emits.updateAnswerVotes, dataToSend);
              socket.broadcast.emit(emits.updateAnswerVotes, dataToSend);
            });
        })
        .on(receives.approvedAnswerStateChanged, function(data) {
          mongoDB
            .changeApprovedAnswerState(
              sanitizer.escape(data.question),
              sanitizer.escape(data.answer)
            )
            .catch(err => {
              throw err;
            })
            .then(approvedState => {
              console.log(
                "Answer (" +
                  data.answer +
                  ") changed approved state to (" +
                  approvedState +
                  ") in thread (" +
                  sanitizer.escape(data.question) +
                  ")"
              );
              let dataToSend = {
                question: data.question,
                answer: data.answer
              };
              socket.broadcast.emit(
                emits.approvedAnswerStateChanged,
                dataToSend
              );
            });
        });
    });
  };

  return {
    init
  };
})();

let helperFunctions = {
  sortByUpVotes: function(arrayOfVoteAbleObjects) {
    arrayOfVoteAbleObjects.sort((a, b) => {
      return b.upVotes - a.upVotes;
    });
    return arrayOfVoteAbleObjects;
  },
  checkQuestionMark: function(question) {
    let checkedQuestion = question;
    if (!question.endsWith("?")) {
      checkedQuestion += "?";
    }
    return checkedQuestion;
  }
};

serverSocketModule.init();
httpServer.listen(8080, function() {
  console.log("Webserver running at port 8080");
});
