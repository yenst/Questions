const pug = require("pug");
const path = require("path");
const cookieParser = require('cookie-parser');
const passportSocketIo = require("passport.socketio");
const sanitizer = require("sanitizer");

const Thread = require("./models/thread");
const Answer = require("./models/answer");
const Comment = require("./models/comment");
/**
 * Passport and socket.io functions
 */
const onAuthorizeSuccess = function (data, accept) {
    console.log('successful connection to socket.io');
    // The accept-callback still allows us to decide whether to
    // accept the connection or not.
    accept(null, true);
};
const onAuthorizeFail = function (data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    // We use this callback to log all of our failed connections.
    accept(null, false);
};

/**
 * Socket.io event handlers
 */
const eventHandler = {
    new_question: function (namespace, clientSocket, question) {
        //TODO Deze check wordt al uitgevoerd in "model/thread.js"
        if (clientSocket.request.user) {
            let thread = new Thread({
                question: sanitizer.escape(question),
                author: sanitizer.escape(clientSocket.request.user)
            });
            thread.save((err, savedThread) => {
                if (err) clientSocket.emit("error_occurred", err);
                else {
                    let html = pug.renderFile("views/partials/thread.pug", {thread: savedThread});
                    namespace.emit("new_thread_available", html);
                }
            });
        } else {
            clientSocket.emit("error_occurred", "Please login to ask a question.");
        }
    },
    new_answer: function (namespace, clientSocket, data) {
        if (clientSocket.request.user) {
            Thread.findOne({_id: sanitizer.escape(data.threadId)}).exec((err, thread) => {
                if (err) return clientSocket.emit("error_occurred", "That thread doesn't exist");
                let answer = new Answer({
                    answer: sanitizer.escape(data.answer),
                    author: sanitizer.escape(clientSocket.request.user),
                    onThread: thread._id
                });
                answer.save((err, savedAnswer) => {
                    if (err) clientSocket.emit("error_occurred", err);
                    else {
                        thread.answers.push(savedAnswer._id);
                        thread.save((err) => {
                            if (err) return console.error(err);
                            namespace.emit("new_answer_available", {
                                answerHTML: pug.renderFile("views/partials/answer.pug", {answerObject: savedAnswer}),
                                forThread: thread._id,
                                amountAnswersOnThread: thread.answers.length
                            });
                            // Thread.findOne({_id: threadId}, (err, thread) => {
                            //     if (err) return console.error(err);
                            //     thread.answers.push(savedAnswer._id);
                            //     thread.save((err) => {
                            //         if (err) return console.error(err);
                            //         let html = pug.renderFile("views/partials/answer.pug", {answerObject: savedAnswer});
                            //         let data = {
                            //             answerHTML: html,
                            //             forThread: thread._id,
                            //             amountAnswersOnThread: sav
                            //         };
                            //         namespace.emit("new_answer_available", data);
                            //     });
                            // });
                        })
                    }
                });
            });
        } else {
            clientSocket.emit("error_occurred", "Please login to answer.");
        }
    },
    new_comment: function (namespace, clientSocket, data) {
        if (clientSocket.request.user) {
            let threadId = sanitizer.escape(data.threadId);
            let answerId = sanitizer.escape(data.answerId);
            let comment = new Comment({
                comment: sanitizer.escape(data.comment),
                author: clientSocket.request.user,
                onAnswer: answerId
            });

            comment.save((err, savedComment) => {
                if (err) clientSocket.emit("error_occurred", err);
                else {
                    Answer.findOne({_id: answerId}, (err, answer) => {
                        if (err) return console.error(err);
                        answer.comments.push(savedComment._id);
                        answer.save((err, savedAnswer) => {
                            if (err) clientSocket.emit("error_occurred", err);
                            else {
                                Thread.findOne({_id: threadId}, (err, thread) => {
                                    if (err) return console.error(err);
                                    thread.save((err) => {
                                        if (err) return console.error(err);
                                        let html = pug.renderFile("views/partials/comment.pug", {commentObject: savedComment});
                                        namespace.emit("new_comment_available", {
                                            commentHTML: html,
                                            forAnswer: answerId
                                        });
                                    });
                                });
                            }
                        });
                    });
                }
            });
        } else {
            clientSocket.emit("error_occurred", "Please login to comment.");
        }
    }
};

/**
 * The server socket
 */
const serverSocketInitiator = function (server, sessionStore) {
    const io = require("socket.io")(server);

    /**
     * Access passport user information from a socket.io connection.
     */
    io.use(passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: 'connect.sid', // the name of the cookie where express/connect stores its session_id
        secret: process.env.SESSION_KEY,
        store: sessionStore,
        // success: onAuthorizeSuccess, //Optional
        // fail: onAuthorizeFail //Optional
    }));

    /**
     * Namespace /questions-live
     */
    const questions_live = io
        .of('/questions-live')
        .on('connection', function (clientSocket) {
            clientSocket.emit("connection_confirmation", "connected to socket in room 'questions-live'");

            /**
             * TODO implement pagination
             * more info @
             * http://madhums.me/2012/08/20/pagination-using-mongoose-express-and-jade/
             * https://stackoverflow.com/questions/5539955/how-to-paginate-with-mongoose-in-node-js
             */

                //TODO Send current threads when connecting to website
            let threadsHTML = [];

            Thread.find().populate('answers').
            populate({
                path: 'answers',
                populate: { path: 'comments' }
            }).exec().then(threads => {
                threads.forEach(thread => {
                    console.log(thread);
                    let html = pug.renderFile("views/partials/thread.pug", {thread: thread});
                    threadsHTML.push(html);
                });
                clientSocket.emit("threads", threadsHTML);
            }).catch(err => clientSocket.emit("error_occurred", "Failed to get threads"));

            clientSocket
                .on("new_question", (question) => {
                    eventHandler.new_question(questions_live, clientSocket, question);
                })
                .on("new_answer", (data) => {
                    eventHandler.new_answer(questions_live, clientSocket, data);
                })
                .on("new_comment", (data) => {
                    eventHandler.new_comment(questions_live, clientSocket, data);
                })
        });

};

module.exports = serverSocketInitiator;