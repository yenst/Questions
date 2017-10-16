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
        // AnswerUpVotesChanged: "4",
        // AnswerDownVotesChanged: "5",
        // ThreadDownVotesChanged: "6",
        // ThreadUpVotesChanged: "7",
        approvedAnswerStateChanged: "8",
        updateAnswerVotes: "9",
        updateQuestionVotes: "10",
        loggedInSession:"11"
    };
    let emits = {
        OpenNewThread: "a",
        questionAnswered: "b",
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f",
        approvedAnswerStateChanged: "g"
    };

    let handleNewThread = function (data) {
        gInterface.addThread(data);
    };

    let handleNewAnswer = function (data) {
        gInterface.addAnswerToThread(data);
    };

    let handleCurrentThreads = function (data) {
        gInterface.refreshThreads(data);
    };

    let handleApprovedAnswerState = function (data) {
        gInterface.changeApprovedAnswerState(data);
    };

    let handleUpdateQuestionVotes = function(data){
        gInterface.updateThreadVotes(data)
    };

    let handleLogInSession = function(data){

    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    let init = function () {
        socket = io();
        socket.on(receives.addedNewThread, handleNewThread)
            .on(receives.addedNewAnswer, handleNewAnswer)
            .on(receives.CurrentThreads, handleCurrentThreads)
            .on(receives.approvedAnswerStateChanged, handleApprovedAnswerState)
            .on(receives.updateAnswerVotes, gInterface.updateAnswerVotes)
            .on(receives.updateQuestionVotes, handleUpdateQuestionVotes)
            .on(receives.loggedInSession,  handleLogInSession);
    };

    let sendNewQuestion = function (question) {
        socket.emit(emits.OpenNewThread, question);
    };

    let sendNewAnswer = function (threadId, answer) {
        let data = {
            threadId: threadId,
            answer: answer
        };
        socket.emit(emits.questionAnswered, data);
    };

    let sendApprovedAnswer = function (answerId) {
        socket.emit(emits.approvedAnswerStateChanged, answerId);
    };

    let incrementThreadUpVotes = function (threadId) {
        socket.emit(emits.incrementThreadUpVotes, threadId);
    };

    let decrementThreadUpVotes = function (threadId) {
        socket.emit(emits.decrementThreadUpVotes, threadId);
    };

    let incrementAnswerUpVotes = function (answerId) {
        socket.emit(emits.incrementAnswerUpVotes, answerId);
    };

    let decrementAnswerUpVotes = function (answerId) {
        socket.emit(emits.decrementAnswerUpVotes, answerId);
    };

    return {
        init,
        sendNewQuestion,
        sendNewAnswer,
        incrementThreadUpVotes,
        decrementThreadUpVotes,
        incrementAnswerUpVotes,
        decrementAnswerUpVotes,
        sendApprovedAnswer
    };
})();

let gInterface = (function () {
    let createThreadContainer = function (thread) {
        return $(
            "<li class='thread' data-id='" + thread._id + "'>" +
            "<div class='questionWrap row'>" +
            "<div class='up_number_down col-2'> <button  class='upVoteThread component_updown' onclick='gInterface.upVoteThread(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='threadUpVotes component_updown'>" + thread.votes + "</span>" +
            "<button  class='downVoteThread component_updown' onclick='gInterface.downVoteThread(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<p class='question col-10'>" + thread.question + "</p>" +
            "<a class='showAnswersBtn col-12 text-center' onclick='gInterface.showAnswers(this)'><u class='text-info'>" + thread.answers.length + " answers</u></a>"+
            "</div>" +
            "<ul class='answers hide'></ul>" +
            "<form class='answerForm row' action='#'>" +
            "<input type='text' name='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "</li>"
        );
    };


  
    let createAnswerContainer = function (answer) {
        let $li = $("<li class='answerWrap row' data-id='" + answer._id + "'>" +
            "<div class='up_number_down col-2'><button  class='upVoteAnswer component_updown' onclick='gInterface.upVoteAnswer(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='answerUpVotes component_updown'>" + answer.votes + "</span>" +
            "<button   class='downVoteAnswer component_updown' onclick='gInterface.downVoteAnswer(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button>" +
            "</div>" +
            "<p class='answer col-8'>" + answer.answer + "</p>" +
            "</li>");

        if (teacher === "1") {
            $li.append("<button class='col-2 .approve' onclick='gInterface.approveAnswer(this)'><i class='fa fa-star' aria-hidden='true'></i></button>");
        }

        if (answer.isApproved) {
            $li.addClass("approved");
        }

        return $li;
    };

    let checkQuestionMark = function (question) {
        let checkedQuestion = question;
        if (!question.endsWith("?")) {
            checkedQuestion += "?";
        }
        return checkedQuestion
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    let upVoteThread = function (button) {
        let threadId = $(button).parent().parent().parent().attr("data-id");
        socketModule.incrementThreadUpVotes(threadId);
    };

    let downVoteThread = function (button) {
        let threadId = $(button).parent().parent().parent().attr("data-id");
        socketModule.decrementThreadUpVotes(threadId);
    };

    let upVoteAnswer = function (button) {
        let answerId = $(button).parent().parent().attr("data-id");
        socketModule.incrementAnswerUpVotes(answerId);
    };

    let downVoteAnswer = function (button) {
        let answerId = $(button).parent().parent().attr("data-id");
        socketModule.decrementAnswerUpVotes(answerId);
    };

    let approveAnswer = function (button) {
        let answerId = $(button).parent().parent().attr("data-id");
        socketModule.sendApprovedAnswer(answerId);
        $(button).parent().toggleClass("approved");
    };

    let init = function () {
        $("#questionForm").on('submit', function (e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('input[name="question"]');
            let question = checkQuestionMark($questionInput.val());
            socketModule.sendNewQuestion(question);
            $questionInput.val("");
        });

        $("#threads").on('submit', $(".answerForm"), function (e) {
            e.preventDefault();
            let $answer = $(e.target).find("input[name='answer']");
            let threadId = $(e.target).parent().attr("data-id");
            socketModule.sendNewAnswer(threadId, $answer.val());
            $(e.target).parent().find('.answers').removeClass('hide');
            $answer.val("");
        });

    };

    let addThread = function (thread) {
        let $li = createThreadContainer(thread);
        thread.answers.forEach(answer => {
            $li.find(".answers").append(createAnswerContainer(answer));
        });
        $("#threads").append($li);
    };

    let refreshThreads = function (threads) {
        $("#threads").html("");
        threads.forEach(thread => {
            addThread(thread);
        });
    };

    let addAnswerToThread = function (answer) {
        let $li = createAnswerContainer(answer);
        $("#threads").find(".question:contains('" + answer.parentNode.question + "')").parent().parent().find(".answers").append($li);
        $("#threads").find(".question:contains('" + answer.parentNode.question + "')").parent().find('.showAnswersBtn').html("<u class='text-info'>" + answer.parentNode.answers.length + ' answers</u>');
    };

    let changeApprovedAnswerState = function (answer) {
        $("#threads").find(".question:contains('" + answer.parentNode.question + "')").parent().parent().find(".answers").find(".answer:contains('" + answer.answer + "')").parent().toggleClass("approved");
    };

    let updateThreadVotes = function (thread) {
        $("#threads").find(".question:contains('" + thread.question + "')").parent().find(".threadUpVotes").html(thread.votes);
    };

    let updateAnswerVotes = function (answer) {
        $("#threads").find(".question:contains('" + answer.parentNode.question + "')").parent().parent().find(".answer:contains('" + answer.answer + "')").parent().find(".answerUpVotes").html(answer.votes);
    };

    let showAnswers = function(button){
        $(button).parent().parent().find('.answers').toggleClass('hide');
    };

    return {
        init,
        addThread,
        refreshThreads,
        addAnswerToThread,
        upVoteThread,
        downVoteThread,
        upVoteAnswer,
        downVoteAnswer,
        approveAnswer,
        changeApprovedAnswerState,
        updateThreadVotes,
        updateAnswerVotes,
        showAnswers
    };
})();
