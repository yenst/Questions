"use strict";
$(function () {
    gInterface.init();
    socketModule.init();
});

let socketModule = (function () {
    let socket;
    let receives = {
        addedNewThread: "1",
        addedNewAnswer: "2",
        CurrentThreads: "3",
        AnswerUpVotesChanged: "4",
        AnswerDownVotesChanged: "5",
        ThreadDownVotesChanged: "6",
        ThreadUpVotesChanged: "7"
    };
    let emits = {
        OpenNewThread: "a",
        questionAnswered: "b",
        increaseAnswerUpVotes: "c",
        increaseAnswerDownVotes: "d",
        increaseThreadUpVotes: "e",
        increaseThreadDownVotes: "f"
    };

    let handleNewThread = function (data) {
        gInterface.addThread(data)
    };

    let handleNewAnswer = function (data) {
        gInterface.addNewAnswerToThread(data.question, data.answer);
    };

    let handleCurrentThreads = function (data) {
        gInterface.refreshThreads(data);
    };

    // public stuff
    //-------------
    let init = function () {
        socket = io();
        socket.on(receives.addedNewThread, handleNewThread)
            .on(receives.addedNewAnswer, handleNewAnswer)
            .on(receives.CurrentThreads, handleCurrentThreads);
    };

    let sendNewQuestion = function (question) {
        let data = {
            question: question
        };
        socket.emit(emits.OpenNewThread, data);
    };

    let sendNewAnswer = function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.questionAnswered, data);
    };

    let increaseAnswerUpVotes = function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.increaseAnswerUpVotes, data);
    };

    let increaseAnswerDownVotes = function (question, answer) {
        // TODO
    };

    let increaseThreadUpVotes = function (question) {
        socket.emit(emits.increaseThreadUpVotes, question);
    };

    let increaseThreadDownVotes = function (question) {
        // TODO
    };

    return {
        init,
        sendNewQuestion,
        sendNewAnswer,
        increaseThreadUpVotes,
        increaseThreadDownVotes,
        increaseAnswerUpVotes,
        increaseAnswerDownVotes
    };
})();

let gInterface = (function () {
    let createThreadContainer = function (thread) {
        return $(
            "<li id='thread' class='thread'>" +
            "<div class='questionHeading'>" +
            //Todo id hier is duplicate als je meerdere questions maakt
            "<div class='votes_and_question row'><div class='up_number_down col-2'><button class='component_updown' id='upVoteThread' onclick='gInterface.upVoteThread(this)'>+</button><span id='threadUpVotes' class='upvotes_amount component_updown'>" + thread.upVotes + "</span><button id='downVoteThread' class='component_updown'>-</button>" +
            "</div><p class='col-10 question_title' id='question'>" + thread.question + "</p></div></div>" +
            "<form id=answerForm class='row' action='#'>" +
            "<input type='text' id='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "<ul id='answers'></ul>" +
            "</li>"
        );
    };

    let createAnswerContainer = function (answerObject) {
        return $(
            "<li id='answerWrap'>" +
            "<p id='answer'>" + answerObject.answer + "</p>" +
            "<button id='upVoteAnswer'>+</button><span id='answerUpVotes'>" + answerObject.upVotes + "</span><button id='downVoteAnswer'>-</button>" +
            "</li>"
        );
    };

    let upVoteThread = function(button){
        let question = $(button).parent().find("#question").text();
        socketModule.increaseThreadUpVotes(question);
    };

    let downVoteThread = function(){
        let question = $(this).parent().find("#question").text();
        socketModule.increaseThreadDownVotes(question);
    };

    let upVoteAnswer = function(){
        let question = $(this).parent().parent().parent().find("#question").text();
        let answer = $(this).parent().find("#answer").text();
        socketModule.increaseAnswerUpVotes(question, answer);
    };

    let downVoteAnswer = function(){
        let question = $(this).parent().parent().parent().find("#question").text();
        let answer = $(this).parent().find("#answer").text();
        socketModule.increaseAnswerDownVotes(question, answer);
    };

    let init = function () {
        $("#questionForm").on('submit', function (e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('#question');
            socketModule.sendNewQuestion($questionInput.val());
            $questionInput.val("");
        });
        $("#threads").on('submit', $("#answerForm"), function (e) {
            e.preventDefault();
            let $answer = $(e.target).find("input#answer");
            socketModule.sendNewAnswer($(e.target).parent().find("#question").text(), $answer.val());
            $answer.val("");
        });
    };

    let addThread = function (thread) {
        let $li = createThreadContainer(thread);
        thread.answers.forEach(answer => {
            $li.append(createAnswerContainer(answer));
        });
        $("#threads").append($li);
    };

    let refreshThreads = function(newThreadList){
        $("#threads").html("");
        newThreadList.forEach(thread => {
            addThread(thread);
        })
    };

    let addNewAnswerToThread = function (question, answerObject) {
        let $li = createAnswerContainer(answerObject);
        $("#threads").find("#question:contains('" + question + "')").parent().parent().find("#answers").append($li);
    };

    return {
        init,
        addThread,
        refreshThreads,
        addNewAnswerToThread,
        upVoteThread
    }

})();