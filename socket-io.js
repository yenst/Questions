const pug = require("pug");
const path = require("path");
const cookieParser = require('cookie-parser');
const passportSocketIo = require("passport.socketio");
const sanitizer = require("sanitizer");

const Thread = require("./models/thread");
const Answer = require("./models/answer");

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
                author: clientSocket.request.user
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
            let threadId = sanitizer.escape(data.threadId);
            let answer = new Answer({
                answer: sanitizer.escape(data.answer),
                author: clientSocket.request.user,
                onThread: threadId
            });
            answer.save((err, savedAnswer) => {
                if (err) clientSocket.emit("error_occurred", err);
                else {
                    Thread.findOne({_id: threadId}, (err, thread) => {
                        if (err) return console.error(err);
                        thread.answers.push(savedAnswer._id);
                        thread.save((err) => {
                            if (err) return console.error(err);
                            let html = pug.renderFile("views/partials/answer.pug", {answerObject: savedAnswer});
                            namespace.emit("new_answer_available", html);
                        });
                    });
                }
            });
        } else {
            clientSocket.emit("error_occurred", "Please login to ask a question.");
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
            Thread.find().sort("-creationDate").populate("answers").exec().then(threads => {
                threads.forEach(thread => {
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
        });

};

module.exports = serverSocketInitiator;