"use strict";

const socketModule = (function () {
    const socket = io('http://questions.dev:3000/questions-live');

    //TODO remove socket.on('connection_confirmation')
    socket
        .on('connection_confirmation', function (msg) {
            console.log(msg);
        })
        .on("error_occurred", function (error) {
            gInterface.showError(error);
        })
        .on("new_thread_available", function (threadHTML) {
            gInterface.addThread(threadHTML);
        })
        .on("new_answer_available", function (data) {
            gInterface.addAnswerForThread(data.forThread, data.answerHTML, data.amountAnswersOnThread);
        })
        .on("thread_voted", function (data) {
            gInterface.upVote(data.threadId, data.votes);
        });

    return {
        sendQuestion: function (question) {
            socket.emit("new_question", question);
        },
        sendAnswer: function (threadId, answer) {
            socket.emit("new_answer", {threadId, answer});
        },
        isConnected: function () {
            return socket.connected;
        },
        upVoteThread: function (threadId) {
            socket.emit("up_vote_thread", threadId);
        },
        downVoteThread: function (threadId) {
            socket.emit("down_vote_thread", threadId);
        }
    }
})();
