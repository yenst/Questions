"use strict";
$(function () {
    socketModule.init();
    gInterface.init();
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
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f"
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

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
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

    let incrementThreadUpVotes = function (question) {
        socket.emit(emits.incrementThreadUpVotes, question);
    };

    let decrementThreadUpVotes = function (question) {
        socket.emit(emits.decrementThreadUpVotes, question);
    };

    let incrementAnswerUpVotes = function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.incrementAnswerUpVotes, data);
    };

    let decrementAnswerUpVotes= function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.decrementAnswerUpVotes, data);
    };

    return {
        init,
        sendNewQuestion,
        sendNewAnswer,
        incrementThreadUpVotes,
        decrementThreadUpVotes,
        incrementAnswerUpVotes,
        decrementAnswerUpVotes
    };
})();

let gInterface = (function () {
    let createThreadContainer = function (thread) {
        return $(



            "<li class='thread'>" +
            "<div class='questionWrap'>" +
            "<p class='question'>" + thread.question + "</p>" +
            "<button class='upVoteThread' onclick='gInterface.upVoteThread(this)'>+</button><span class='threadUpVotes'>" + thread.upVotes + "</span><button class='downVoteThread' onclick='gInterface.downVoteThread(this)'>-</button>" +
            "</div>" +
            "<form class=answerForm action='#'>" +
            "<input type='text' name='answer' autocomplete=\"off\"> " +
            "<input type='submit' value='Answer'/>" +

            "</form>" +
            "<ul class='answers'></ul>" +
            "</li>"
        );
    };

    let createAnswerContainer = function (answerObject) {
        return $(
            "<li class='answerWrap'>" +
            "<p class='answer'>" + answerObject.answer + "</p>" +
            "<button class='upVoteAnswer' onclick='gInterface.upVoteAnswer(this)'>+</button><span class='answerUpVotes'>" + answerObject.upVotes + "</span><button class='downVoteAnswer' onclick='gInterface.downVoteAnswer(this)'>-</button>" +
            "</li>"
        );
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    let upVoteThread = function(button){
        let question = $(button).parent().find(".question").text();
        socketModule.incrementThreadUpVotes(question);
    };

    let downVoteThread = function(button){
        let $questionWrapper = $(button).parent();
        if($questionWrapper.find("span.threadUpVotes").text() > 0){
            let question = $questionWrapper.find(".question").text();
            socketModule.decrementThreadUpVotes(question);
        } else {
            // TODO show error: can't decrement upvotes bellow 0
        }
    };

    let upVoteAnswer = function(button){
        let question = $(button).parent().parent().parent().find(".question").text();
        let answer = $(button).parent().find(".answer").text();
        socketModule.incrementAnswerUpVotes(question, answer);
    };

    let downVoteAnswer = function(button){
        let $answerWrapper = $(button).parent();
        if($answerWrapper.find("span.answerUpVotes").text() > 0){
            let question = $answerWrapper.parent().parent().find(".question").text();
            let answer = $answerWrapper.find(".answer").text();
            socketModule.decrementAnswerUpVotes(question, answer);
        } else {
            // TODO show error: can't decrement upvotes bellow 0
        }
    };

    let init = function () {
        $("#questionForm").on('submit', function (e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('input[name="question"]');
            socketModule.sendNewQuestion($questionInput.val());
            $questionInput.val("");
        });
        $("#threads").on('submit', $(".answerForm"), function (e) {
            e.preventDefault();
            let $answer = $(e.target).find("input[name='answer']");
            let question = $(e.target).parent().find(".question").text();
            socketModule.sendNewAnswer(question, $answer.val());
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
        $("#threads").find(".question:contains('" + question + "')").parent().parent().find(".answers").append($li);
    };

    return {
        init,
        addThread,
        refreshThreads,
        addNewAnswerToThread,
        upVoteThread,
        downVoteThread,
        upVoteAnswer,
        downVoteAnswer
    }
})();