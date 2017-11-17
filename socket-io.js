const pug = require("pug");
const path = require("path");
const cookieParser = require("cookie-parser");
const passportSocketIo = require("passport.socketio");
const sanitizer = require("sanitizer");
const mongoose = require("mongoose");

const Thread = require("./models/thread");
const Answer = require("./models/answer");
const Comment = require("./models/comment");
const User = require("./models/user");

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
const processQuestion = function (q) {
    let object = {
        question: "",
        tags: []
    };
    let splitQuestion = q.split("#");
    object.question = sanitizer.escape(splitQuestion[0]);
    for (let i = 1; i < splitQuestion.length; i++) {
        object.tags.push(sanitizer.escape(splitQuestion[i].trim()));
    }
    return object;
};

/**
 * Socket.io event handlers
 */
const eventHandler = {
    delete_thread: function (namespace, clientSocket, threadId) {
        if (clientSocket.request.user && clientSocket.request.user.isAdmin) {
            Thread.findOne({_id: sanitizer.escape(threadId)}).then((thread) => {
                thread.remove().then(() => {
                    namespace.emit("deleted_thread", thread._id);
                }).catch(err => {
                    clientSocket.emit("error_occurred", "Failed to remove thread.");
                });
            }).catch(err => {
                clientSocket.emit("error_occurred", "Thread doens't exist.");
            });
        } else {
            clientSocket.emit("error_occurred", "You are not logged in or don't have permission.")
        }
    },
    delete_answer_on_thread: function (namespace, clientSocket, data) {
        if (clientSocket.request.user && clientSocket.request.user.isAdmin) {
            Answer.findOne({_id: sanitizer.escape(data.answerId)}).then(answer => {
                answer.remove();
                namespace.emit("deleted_answer", {
                    answerId: answer._id,
                    threadId: sanitizer.escape(data.threadId)
                })
            }).catch(err => {
                clientSocket.emit("error_occurred", "Answer doesn't exist.");
            });
        } else {
            clientSocket.emit("error_occurred", "You are not logged in or don't have permission.")
        }
    },
    up_vote_thread: function (namespace, clientSocket, threadId) {
        if (clientSocket.request.user) {
            Thread.findOne({_id: sanitizer.escape(threadId)}).exec((err, thread) => {
                if (err) return clientSocket.emit("error_occurred", "Thread doesn't exist");
                Thread.findById(threadId).populate('author').then(function (populatedThread) {
                    User.findById(populatedThread.author._id).then(function (user) {
                        user.credits += 1;
                        user.save((err, savedUser) => {
                            console.log(savedUser);
                        })
                    })
                })
                thread.upVote(sanitizer.escape(clientSocket.request.user.uid)).then(() => {
                    thread.save((err, savedThread) => {
                        if (err) return console.error(err);
                        namespace.emit("thread_voted", {
                            threadId: savedThread._id,
                            votes: savedThread.votes
                        })
                    })
                }).catch(err => clientSocket.emit("error_occurred", err));
            });
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    down_vote_thread: function (namespace, clientSocket, threadId) {
        if (clientSocket.request.user) {
            Thread.findOne({_id: sanitizer.escape(threadId)}).exec((err, thread) => {
                if (err) return clientSocket.emit("error_occurred", "Thread doesn't exist");
                Thread.findById(threadId).populate('author').then(function (populatedThread) {
                    User.findById(populatedThread.author._id).then(function (user) {
                        user.credits -= 1;
                        user.save((err, savedUser) => {
                            console.log(savedUser);
                        })
                    })
                })
                thread.downVote(sanitizer.escape(clientSocket.request.user.uid)).then(() => {
                    thread.save((err, savedThread) => {
                        if (err) return console.error(err);
                        namespace.emit("thread_voted", {
                            threadId: savedThread._id,
                            votes: savedThread.votes
                        })
                    })
                }).catch(err => clientSocket.emit("error_occurred", err));
            });
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    new_question: function (clientSocket, question, images, choices) {
        //TODO Deze check wordt al uitgevoerd in "model/thread.js"
        if (clientSocket.request.user) {
            let author = sanitizer.escape(clientSocket.request.user.uid);
            let questionObject = processQuestion(question);
            let thread = new Thread({
                _id: new mongoose.Types.ObjectId(),
                question: questionObject.question,
                author: author,
                tags: questionObject.tags,
                images: images,
            });
            let sendResponse = function () {
                thread.save().then(savedThread => {
                    savedThread.populate("answers").execPopulate().then(populatedThread => {
                        let dataForAdmins = {
                            threadHTML: pug.renderFile("views/partials/thread.pug", {
                                thread: populatedThread,
                                isAdmin: true,
                            }),
                            classHTML: pug.renderFile("views/partials/classThread.pug",{
                                thread: populatedThread,
                                isAdmin: true
                            }),
                            tags: populatedThread.tags
                        };
                        let dataForStudents = {
                            threadHTML: pug.renderFile("views/partials/thread.pug", {
                                thread: populatedThread,
                                isAdmin: false,
                            }),
                            classHTML: pug.renderFile("views/partials/classThread.pug",{
                                thread: populatedThread,
                                isAdmin: false
                            }),
                            tags: populatedThread.tags
                        };
                        sendToAdmins("new_thread_available", dataForAdmins);
                        sendToStudents("new_thread_available", dataForStudents);
                    }).catch(err => {return err});
                }).catch(err => {
                    clientSocket.emit("error_occurred", err.message);
                });
            };
            if (choices) {
                if (choices.length > 1) {
                    thread.isPoll = true;
                    let answerChoices = [];
                    choices.forEach(choice => {
                        answerChoices.push(
                            new Answer({
                                answer: sanitizer.escape(choice),
                                author: author,
                                onThread: thread._id
                            })
                        );
                    });
                    Answer.insertMany(answerChoices).then(savedAnswersChoices => {
                        savedAnswersChoices.forEach(answerChoice => {
                            thread.answers.push(answerChoice._id);
                        });
                        sendResponse();
                    }).catch(err => {
                        clientSocket.emit("error_occurred", "Failed to save information.");
                    })
                } else {
                    clientSocket.emit("error_occurred", "A poll needs minimum 2 choices.");
                }
            } else sendResponse();
        } else {
            clientSocket.emit("error_occurred", "Please login to ask a question.");
        }
    },
    new_answer: function (clientSocket, data) {
        if (clientSocket.request.user) {
            Thread.findOne({
                _id: sanitizer.escape(data.threadId)
            }).exec((err, thread) => {
                if (err)
                    return clientSocket.emit(
                        "error_occurred",
                        "That thread doesn't exist or has been removed."
                    );
                if(!thread.isPoll){
                    let answer = new Answer({
                        answer: sanitizer.escape(data.answer),
                        author: sanitizer.escape(clientSocket.request.user.uid),
                        onThread: thread._id,
                        images: data.images
                    });
                    answer.save((err, savedAnswer) => {
                        Answer.findOne({_id: savedAnswer._id}).populate('author').then(function (populatedAnswer) {
                            if (err) clientSocket.emit("error_occurred", err);
                            else {
                                thread.answers.push(populatedAnswer._id);
                                thread.save(err => {
                                    if (err) return console.error(err);

                                    let dataForAdmins = {
                                        answerHTML: pug.renderFile("views/partials/answer.pug", {
                                            answerObject: populatedAnswer,
                                            isAdmin: true
                                        }),
                                        forThread: thread._id,
                                        amountAnswersOnThread: thread.answers.length
                                    };
                                    let dataForStudents = {
                                        answerHTML: pug.renderFile("views/partials/answer.pug", {
                                            answerObject: populatedAnswer,
                                            isAdmin: false
                                        }),
                                        forThread: thread._id,
                                        amountAnswersOnThread: thread.answers.length
                                    };
                                    sendToAdmins("new_answer_available", dataForAdmins);
                                    sendToStudents("new_answer_available", dataForStudents);
                                });
                            }
                        });
                    });
                } else {
                    clientSocket.emit("error_occurred", "Can't add answers to poll.");
                }
            });
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    new_comment: function (namespace, clientSocket, data) {
        if (clientSocket.request.user) {
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
                                "Failed to save comment."
                            );
                        returnedAnswer.comments.push(savedComment._id);
                        returnedAnswer.save((err, savedAnswer) => {
                            if (err)
                                return clientSocket.emit(
                                    "error_occurred",
                                    "Failed to save comment."
                                );
                            Comment.findOne({_id: savedComment._id}).populate('author').then(function (populatedComment) {
                                console.log(populatedComment);
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
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    toggle_answer_approved: function (namespace, clientSocket, answerId) {
        if (clientSocket.request.user && clientSocket.request.user.isAdmin) {
            Answer.findOne({_id: sanitizer.escape(answerId)}).populate("onThread").then(answer => {
                Answer.findById(answerId).populate('author').then(function (populatedAnswer) {
                    User.findById(populatedAnswer.author._id).then(function (user) {
                        if (populatedAnswer.isApproved) {
                            user.credits -= 5;
                        }
                        else {
                            user.credits += 5;
                        }
                        user.save((err) => {
                            if(err) return console.error(err)
                        })
                    })
                });
                answer.toggleIsApprovedAndSave().then(resolveData => {
                    namespace.emit("answer_approved_changed", {
                        answerId: resolveData.savedAnswer._id,
                        threadId: resolveData.affectedThread._id,
                        isSolved: resolveData.affectedThread.isSolved
                    });
                }).catch(err => {
                    clientSocket.emit("error_occurred", "Failed to edit.");
                });
            }).catch(err => {
                clientSocket.emit("error_occurred", "Answer doesn't exist.");
            })
        } else {
            clientSocket.emit("error_occurred", "You are not logged in or don't have permission.")
        }
    },
    find_threads_with_tag: function (clientSocket, tag) {
        Thread.find({tags: tag}).populate({
            path: "answers",
            populate: {
                path: "comments",
                model: "Comment"
            }
        }).then(threads => {
            let renderedThreads = [];
            threads.forEach(function (thread) {
                renderedThreads.push(
                    pug.renderFile('views/partials/thread.pug', {thread})
                )
            });
            clientSocket.emit("threads", renderedThreads);
        }).catch(err => {
            clientSocket.emit("error_occurred", "Failed to get threads.");
        });
    },
    add_tag_to_thread: function (namespace, clientSocket, data) {
        if (clientSocket.request.user) {
            Thread.findOne({_id: sanitizer.escape(data.threadId)}).then(thread => {
                let tag = sanitizer.escape(data.tag);
                if (!thread.tags.includes(tag)) {
                    thread.tags.push(tag);
                    thread.save().then(savedThread => {
                        let tagHTML = pug.renderFile("views/partials/tag.pug", {tag: tag});
                        namespace.emit("tag_added_to_thread", {
                            threadId: savedThread._id,
                            tagHTML: tagHTML
                        })
                    }).catch(err => {
                        clientSocket.emit("error_occurred", "Failed to save changes.");
                    })
                } else {
                    clientSocket.emit("error_occurred", "Tag already added.");
                }
            }).catch(err => {
                clientSocket.emit("error_occurred", "Thread doesn't exist.");
            })
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    up_vote_answer: function (namespace, clientSocket, answerId) {
        if (clientSocket.request.user) {
            Answer.findOne({_id: sanitizer.escape(answerId)}).exec((err, answer) => {
                if (err) return clientSocket.emit("error_occurred", "Answer doesn't exist or has been removed.");
                Answer.findOne({_id: answerId}).populate('author').then(function (populatedAnswer) {
                    User.findById(populatedAnswer.author._id).then(function (user) {
                        user.credits += 1;
                        user.save((err, savedUser) => {
                            console.log(savedUser);
                        })
                    });
                    populatedAnswer.upVote(sanitizer.escape(clientSocket.request.user.uid)).then(() => {
                        populatedAnswer.save((err, savedAnswer) => {
                            if (err) return console.error(err);
                            namespace.emit("answer_voted", {
                                answerId: savedAnswer._id,
                                votes: savedAnswer.votes
                            })
                        })
                    }).catch(err => clientSocket.emit("error_occurred", err));
                }).catch(function (err) {
                    console.log(err);
                })

            });
        } else clientSocket.emit("error_occurred", "Please login to vote");
    },
    down_vote_answer: function (namespace, clientSocket, answerId) {
        if (clientSocket.request.user) {
            Answer.findOne({_id: sanitizer.escape(answerId)}).exec((err, answer) => {
                if (err) return clientSocket.emit("error_occurred", "Answer doesn't exist or has been removed.");
                Answer.findById(answerId).populate('author').then(function (populatedAnswer) {
                    User.findById(populatedAnswer.author._id).then(function (user) {
                        user.credits -= 1;
                        user.save((err, savedUser) => {
                            console.log(savedUser);
                        })
                    })
                });
                answer.downVote(sanitizer.escape(clientSocket.request.user.uid)).then(() => {
                    answer.save((err, savedAnswer) => {
                        if (err) return console.error(err);
                        namespace.emit("answer_voted", {
                            answerId: savedAnswer._id,
                            votes: savedAnswer.votes
                        })
                    })
                }).catch(err => clientSocket.emit("error_occurred", err));
            });
        } else clientSocket.emit("error_occurred", "Please login to vote");
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
                    eventHandler.new_question(clientSocket, data.question, data.images, data.choices);
                })
                .on("new_answer", data => {
                    eventHandler.new_answer(clientSocket, data);
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
                    eventHandler.add_tag_to_thread(questions_live, clientSocket, data)
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
