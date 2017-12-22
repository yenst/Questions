const pug = require("pug");
const cookieParser = require("cookie-parser");
const passportSocketIo = require("passport.socketio");
const sanitizer = require("sanitizer");

const Thread = require("./models/thread");
const Answer = require("./models/answer");
const Comment = require("./models/comment");
const User = require("./models/user");
const repository = require("./models/repository");
const Spammer = require('./mail');

const GLOBAL = require("./global-vars");

/**
 * Passport and socket.io functions
 */
const onAuthorizeSuccess = function (data, accept) {
    console.log("successful connection to socket.io");
    // The accept-callback still allows us to decide whether to
    // accept the connection or not.
    accept(null, true);
};
const onAuthorizeFail = function (data, message, error, accept) {
    if (error) throw new Error(message);
    console.log("failed connection to socket.io:", message);
    // We use this callback to log all of our failed connections.
    accept(null, false);
};

/**
 * Helper functions
 */
const isAuthenticated = function (socket) {
    return new Promise(function (resolve, reject) {
        if (socket.request.user) resolve();
        else socket.emit("error_occurred", "Please login to ask a question.");
        reject();
    });
};
const isAuthenticatedAdmin = function (socket) {
    return new Promise(function (resolve, reject) {
        if (socket.request.user && socket.request.user.isAdmin) resolve();
        else socket.emit("error_occurred", "You are not logged in or don't have permission.");
        reject();
    });
};
const voteAndSendResponse = function (populatedAnswer) {
    populatedAnswer.upVote(sanitizer.escape(clientSocket.request.user.uid)).then(() => {
        populatedAnswer.save((err, savedAnswer) => {
            if (err) return console.error(err);
            namespace.emit("answer_voted", {
                answerId: savedAnswer._id,
                votes: savedAnswer.votes
            })
        })
    }).catch(err => {
        return err;
    });
};

/**
 * Socket.io event handlers
 */
const eventHandler = {
    delete_thread: function (namespace, clientSocket, threadId) {
        isAuthenticatedAdmin(clientSocket).then(
            repository.deleteThreadById(sanitizer.escape(threadId)).then(removedThread => {
                namespace.emit("deleted_thread", removedThread._id);
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            })
        );
    },
    delete_answer_on_thread: function (namespace, clientSocket, data) {
        isAuthenticatedAdmin(clientSocket).then(
            repository.deleteAnswerById(sanitizer.escape(data.answerId)).then(removedAnswer => {
                namespace.emit("deleted_answer", {
                    answerId: removedAnswer._id,
                    threadId: removedAnswer.onThread
                })
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            })
        );
    },
    up_vote_thread: function (namespace, clientSocket, threadId) {
        isAuthenticated(clientSocket).then(
            repository.upVoteThreadById(sanitizer.escape(threadId), sanitizer.escape(clientSocket.request.user.uid)).then(upVotedThread => {
                namespace.emit("thread_voted", {
                    threadId: upVotedThread._id,
                    votes: upVotedThread.votes
                });
                if(upVotedThread.votes > 15){
                    Spammer.sendMailForvotes(upVotedThread.author,upVotedThread._id);
                }
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            })
        );
    },
    down_vote_thread: function (namespace, clientSocket, threadId) {
        isAuthenticated(clientSocket).then(
            repository.downVoteThreadById(sanitizer.escape(threadId), sanitizer.escape(clientSocket.request.user.uid)).then(downVotedThread => {
                namespace.emit("thread_voted", {
                    threadId: downVotedThread._id,
                    votes: downVotedThread.votes
                })
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            })
        );
    },
    new_question: function (clientSocket, title, question, images, choices) {
        isAuthenticated(clientSocket).then(function () {
            repository.addThreadOrPoll(title, sanitizer.escape(question), sanitizer.escape(clientSocket.request.user.uid), images, choices).then(addedThread => {
                let dataForAdmins = {
                    threadHTML: pug.renderFile("views/partials/thread.pug", {
                        thread: addedThread,
                        isAdmin: true,
                    }),
                    tags: addedThread.tags
                };
                let dataForStudents = {
                    threadHTML: pug.renderFile("views/partials/thread.pug", {
                        thread: addedThread,
                        isAdmin: false,
                    }),
                    tags: addedThread.tags
                };
                sendToAdmins("new_thread_available", dataForAdmins);
                sendToStudents("new_thread_available", dataForStudents);
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    },
    new_answer: function (clientSocket, threadId, answer, images) {
        isAuthenticated(clientSocket).then(function () {
            repository.addAnswer(sanitizer.escape(threadId), sanitizer.escape(answer), sanitizer.escape(clientSocket.request.user.uid), images).then(addedAnswer => {
                let dataForAdmins = {
                    answerHTML: pug.renderFile("views/partials/answer.pug", {
                        answerObject: addedAnswer,
                        isAdmin: true
                    }),
                    forThread: addedAnswer.onThread._id,
                    amountAnswersOnThread: addedAnswer.onThread.answers.length
                };
                let dataForStudents = {
                    answerHTML: pug.renderFile("views/partials/answer.pug", {
                        answerObject: addedAnswer,
                        isAdmin: false
                    }),
                    forThread: addedAnswer.onThread._id,
                    amountAnswersOnThread: addedAnswer.onThread.answers.length
                };
                sendToAdmins("new_answer_available", dataForAdmins);
                sendToStudents("new_answer_available", dataForStudents);
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    },
    new_comment: function (namespace, clientSocket, data) {
        isAuthenticated(clientSocket).then(function () {
            Thread.findOne({
                _id: sanitizer.escape(data.threadId)
            }).exec((err, returnedThread) => {
                if (err)
                    return clientSocket.emit(
                        "error_occurred",
                        "Thread doesn't exist or has been removed."
                    );
                let answerId = sanitizer.escape(data.answerId);
                Answer.findOne({_id: answerId}).exec((err, returnedAnswer) => {
                    if (err)
                        return clientSocket.emit(
                            "error_occurred",
                            "Answer doesn't exist or has been removed."
                        );
                    let comment = new Comment({
                        comment: sanitizer.escape(data.comment),
                        author: sanitizer.escape(clientSocket.request.user.uid),
                        onAnswer: answerId
                    });

                    comment.save((err, savedComment) => {
                        if (err)
                            return clientSocket.emit(
                                "error_occurred",
                                err.message
                            );
                        returnedAnswer.comments.push(savedComment._id);
                        returnedAnswer.save((err, savedAnswer) => {
                            if (err)
                                return clientSocket.emit(
                                    "error_occurred",
                                    "Failed to save comment."
                                );
                            Comment.findOne({_id: savedComment._id}).populate('author').then(function (populatedComment) {
                                let html = pug.renderFile("views/partials/comment.pug", {
                                    commentObject: populatedComment
                                });

                                namespace.emit("new_comment_available", {
                                    commentHTML: html,
                                    forAnswer: savedAnswer._id,
                                    amountComments: savedAnswer.comments.length,
                                    user: comment.author
                                });
                            })

                        });
                    });
                });
            });
        });
    },
    toggle_answer_approved: function (namespace, clientSocket, answerId) {
        isAuthenticatedAdmin(clientSocket).then(function () {
            repository.toggleAnswerApproved(sanitizer.escape(answerId)).then(answer => {
                namespace.emit("answer_approved_changed", {
                    answerId: answer._id,
                    threadId: answer.onThread._id,
                    isSolved: answer.onThread.isSolved
                });
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    },
    find_threads_with_tag: function (clientSocket, tag) {
        repository.findThreadsByTag(sanitizer.escape(tag)).then(threads => {
            let renderedThreads = [];
            threads.forEach(function (thread) {
                renderedThreads.push(
                    pug.renderFile('views/partials/thread.pug', {thread})
                )
            });
            clientSocket.emit("threads", renderedThreads);
        }).catch(err => {
            clientSocket.emit("error_occurred", err);
        });
    },
    add_tag_to_thread: function (namespace, clientSocket, threadId, tag) {
        isAuthenticated(clientSocket).then(function () {
            repository.addTag(sanitizer.escape(threadId), sanitizer.escape(tag)).then(thread => {
                let newTagHTML = pug.renderFile("views/partials/tag.pug", {tag: tag});
                let dataForAdmins = {
                    threadId: thread._id,
                    threadHTML: pug.renderFile("views/partials/thread.pug", {
                        thread: thread,
                        isAdmin: true,
                    }),
                    newTagHTML: newTagHTML,
                };
                let dataForStudents = {
                    threadId: thread._id,
                    threadHTML: pug.renderFile("views/partials/thread.pug", {
                        thread: thread,
                        isAdmin: false,
                    }),
                    newTagHTML: newTagHTML,
                };
                sendToAdmins("tag_added_to_thread", dataForAdmins);
                sendToStudents("tag_added_to_thread", dataForStudents);
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    },
    up_vote_answer: function (namespace, clientSocket, answerId) {
        isAuthenticated(clientSocket).then(function () {
            repository.upVoteAnswerById(sanitizer.escape(answerId), sanitizer.escape(clientSocket.request.user.uid)).then(answer => {
                namespace.emit("answer_voted", {
                    answerId: answer._id,
                    votes: answer.votes
                })
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    },
    down_vote_answer: function (namespace, clientSocket, answerId) {
        isAuthenticated(clientSocket).then(function () {
            repository.downVoteAnswerById(sanitizer.escape(answerId), sanitizer.escape(clientSocket.request.user.uid)).then(answer => {
                namespace.emit("answer_voted", {
                    answerId: answer._id,
                    votes: answer.votes
                })
            }).catch(err => {
                clientSocket.emit("error_occurred", err);
            });
        });
    }
};

/**
 * Keep difference between admin and students
 */
const adminClients = [];
const studentClients = [];
const sendToAdmins = function (event, data) {
    adminClients.forEach(adminClient => {
        adminClient.emit(event, data);
    });
};
const sendToStudents = function (event, data) {
    studentClients.forEach(studentClient => {
        studentClient.emit(event, data);
    });
};

/**
 * The server socket
 */
const serverSocketInitiator = function (server, sessionStore) {
    const io = require("socket.io")(server);

    /**
     * Access passport user information from a socket.io connection.
     */
    io.use(
        passportSocketIo.authorize({
            cookieParser: cookieParser,
            key: "connect.sid", // the name of the cookie where express/connect stores its session_id
            secret: process.env.SESSION_KEY,
            store: sessionStore
            //success: onAuthorizeSuccess, //Optional
            //fail: onAuthorizeFail //Optional
        })
    );

    /**

     * Namespace /questions-live
     */

    const questions_live = io
        .of("/questions-live")
        .on("connection", function (clientSocket) {
            if (clientSocket.request.user.isAdmin) {
                adminClients.push(clientSocket);
            } else {
                studentClients.push(clientSocket);
            }
            clientSocket.emit("connection_confirmation", "connected to socket in room 'questions-live'");
            clientSocket
                .on("new_question", (data) => {
                    eventHandler.new_question(clientSocket, data.title, data.question, data.images, data.choices);
                })
                .on("new_answer", data => {
                    eventHandler.new_answer(clientSocket, data.threadId, data.answer, data.images);
                })
                .on("new_comment", (data) => {
                    eventHandler.new_comment(questions_live, clientSocket, data);
                })
                .on("find_threads", tag => {
                    eventHandler.find_threads_with_tag(clientSocket, tag);
                })
                .on("up_vote_thread", (threadId) => {
                    eventHandler.up_vote_thread(questions_live, clientSocket, threadId);
                })
                .on("down_vote_thread", (threadId) => {
                    eventHandler.down_vote_thread(questions_live, clientSocket, threadId);
                })
                .on("open_class", (tag) => {
                    eventHandler.openNewClass(clientSocket, tag);
                })
                .on("delete_thread", (threadId) => {
                    eventHandler.delete_thread(questions_live, clientSocket, threadId);
                })
                .on("delete_answer_on_thread", (data) => {
                    eventHandler.delete_answer_on_thread(questions_live, clientSocket, data);
                })
                .on("toggle_answer_approved", answerId => {
                    eventHandler.toggle_answer_approved(questions_live, clientSocket, answerId)
                })
                .on("add_tag_to_thread", data => {
                    eventHandler.add_tag_to_thread(questions_live, clientSocket, data.threadId, data.tag)
                })
                .on("up_vote_answer", answerId => {
                    eventHandler.up_vote_answer(questions_live, clientSocket, answerId)
                })
                .on("down_vote_answer", answerId => {
                    eventHandler.down_vote_answer(questions_live, clientSocket, answerId);
                });
            clientSocket.on("disconnect", () => {
                if (clientSocket.request.user.isAdmin) {
                    let index = adminClients.indexOf(clientSocket);
                    adminClients.splice(index, 1);
                } else {
                    let index = studentClients.indexOf(clientSocket);
                    studentClients.splice(index, 1);
                }
            })

        });

};

module.exports = serverSocketInitiator;
