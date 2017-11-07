"use strict";

const socketModule = (function () {
    const socket = io('http://172.21.22.52.xip.io:3000/questions-live');

    //TODO remove socket.on('connection_confirmation')
    socket
        .on('connection_confirmation', function (msg) {
            console.log(msg);
        })
        .on("error_occurred", function (error) {
            console.log(error);
            gInterface.showError(error);
        })
        .on("new_thread_available", function (threadHTML) {
            gInterface.addThread(threadHTML);
        })
        .on("new_answer_available", function (data) {
            gInterface.addAnswerForThread(data.forThread, data.answerHTML, data.amountAnswersOnThread);
        })
        .on("new_comment_available", function (data) {
            gInterface.addCommentToAnswer(data.forAnswer, data.commentHTML);
        })
        .on("threads", function (threadsHTML) {
            gInterface.clearThreads();
            threadsHTML.forEach(threadHTML => {
                gInterface.addThread(threadHTML);
            })
        });

    return {
        sendQuestion: function (question) {
            socket.emit("new_question", question);
        },
        sendAnswer: function (threadId, answer) {
            socket.emit("new_answer", {threadId, answer});
        },
        sendComment: function(threadId, answerId, comment){
            socket.emit("new_comment", {threadId,answerId, comment});
        },
        findThreadsWithTag: function(tag){
            socket.emit("find_threads",tag);
        },
        isConnected: function () {
            return socket.connected;
        }
    }
})();
