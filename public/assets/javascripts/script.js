"use strict";
$(function () {
    gInterface.init();
    socketModule.init();
});

let socketModule = (function () {
    let socket;
    let receives = {
        addedNewThread: "newThread",
        addedNewAnswer: "newAnswer",
        CurrentThreads: "CurrentThreads"
    };
    let emits = {
        OpenNewThread: "OpenNewThread",
        questionAnswered: "questionAnswered"
    };

    let handleNewThread = function (data) {
        gInterface.addThread(data)
    };

    let handleNewAnswer = function (data) {
        let $li = "<li id='answer'>" + data.answer + "</li>";
        $("#threads").find("#question:contains('" + data.question + "')").parent().find("#answers").prepend($li);
    };

    let handleCurrentThreads = function (data) {
        data.forEach(thread => {
            gInterface.addThread(thread);
        });
    };

    // public stuff
    //-------------
    let init = function () {
        socket = io();
        socket.on(receives.addedNewThread, handleNewThread)
            .on(receives.addedNewAnswer, handleNewAnswer)
            .on(receives.CurrentThreads, handleCurrentThreads);

    };

    let sendNewQuestion = function (data) {
        socket.emit(emits.OpenNewThread, data);
    };

    let sendNewAnswer = function (data) {
        socket.emit(emits.questionAnswered, data);
    };

    return {
        init,
        sendNewQuestion,
        sendNewAnswer
    };
})();

let gInterface = {
    self: this,
    init: function () {
        $("#questionForm").on('submit', function (e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('#question');
            socketModule.sendNewQuestion({question: $questionInput.val()});
            $questionInput.val("");
        });
        $("#threads").on('submit', $("#answerForm"), function (e) {
            e.preventDefault();
            let $answer = $(e.target).find("input#answer");
            let data = {
                question: $(e.target).parent().find("#question").text(),
                answer: $answer.val()
            };
            socketModule.sendNewAnswer(data);
            $answer.val("");
        });
    },
    addThread: function (thread) {
        let $li = $("<li id='thread'>" +
            "<p id='question'>" + thread.question + "</p>" +
            "<form id=answerForm action='#'>" +
            "<input type='text' id='answer' autocomplete=\"off\"> " +
            "<input type='submit' value='Answer'/>" +
            "</form>" +
            "<ul id='answers'></ul>" +
            "</li>");
        thread.answers.forEach(answer => {
            $li.append("<li id='answer'>" + answer.answer + "</li>");
        });
        $("#threads").prepend($li);
    }
};