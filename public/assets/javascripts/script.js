"use strict";
$(function () {
    gInterface.init();
    socketModule.init();
});

let socketModule = (function () {
    let socket;
    let receives = {
        addedNewThread: "newThread",
        addedNewAnswer: "newAnswer"
    };
    let emits = {
        questionSend: "questionSend",
        questionAnswered: "questionAnswered"
    };

    let handleNewThread = function (data) {
        let $li = "<li id='thread'>" + data.question +
            "<form id=answerForm action='#' data-id='" + data.threadId + "'>" +
            "<input type='text' id='answer' autocomplete=\"off\"> " +
            "<input type='submit' value='Answer'/>" +
            "</form>" +
            "<ul id='answers'></ul>" +
            "</li>";
        $("#threads").prepend($li);
    };

    let handleNewAnswer = function(data){
        let $li = "<li id='answer'>" + data.answer + "</li>";
        $("#answerForm[data-id='" + data.threadId + "']").parent().find("ul#answers").prepend($li);
    };

    // public stuff
    //-------------
    let init = function () {
        socket = io();
        socket.on(receives.addedNewThread, handleNewThread);
        socket.on(receives.addedNewAnswer, handleNewAnswer);
    };

    let sendNewQuestion = function(data){
        socket.emit(emits.questionSend, data);
    };

    let sendNewAnswer = function(data){
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
        $("#questionForm").on('submit', function(e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('#question');
            let data = {
                question: $questionInput.val()
            };
            socketModule.sendNewQuestion(data);
            $questionInput.val("");
        });
        // TODO complete this
        $("#threads").on('submit', $("#answerForm"), function (e) {
            e.preventDefault();
            let $answer = $(e.target).find("input#answer");
            let data = {
                threadId: $(e.target).attr("data-id"),
                answer: $answer.val()
            };
            socketModule.sendNewAnswer(data);
            $answer.val("");
        });
    }

};