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
            "<div class='questionWrap row'>" +
            
            "<div class='up_number_down col-2'> <button class='upVoteThread component_updown' onclick='gInterface.upVoteThread(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button><span class='threadUpVotes component_updown'>" + thread.upVotes + "</span><button class='downVoteThread component_updown' onclick='gInterface.downVoteThread(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<p class='question col-10'>" + thread.question + "</p>" +
            "</div>" +
            "<ul class='answers'></ul>" +
            "<form class='answerForm row' action='#'>" +
            "<input type='text' name='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +

            "</form>" +
            
            "</li>"
        );
    };

    let createAnswerContainer = function (answerObject) {
        return $(
            "<li class='answerWrap row' >" +
            
            "<div class='up_number_down col-2'><button class='upVoteAnswer component_updown' onclick='gInterface.upVoteAnswer(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button><span class='answerUpVotes component_updown'>" + answerObject.upVotes + "</span><button class='downVoteAnswer component_updown' onclick='gInterface.downVoteAnswer(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<p class='answer col-10'>" + answerObject.answer + "</p>" +
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
            $li.find('.answers').append(createAnswerContainer(answer));
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