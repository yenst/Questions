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
        updateQuestionVotes: "10"
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
        gInterface.addThread(data.question, data.upVotes, data.answerList);
    };

    let handleNewAnswer = function (data) {
        console.log("test");
        gInterface.addAnswerToThread(data.question, data.answer, data.upVotes, data.isApproved, data.numberOfAnswers);
    };

    let handleCurrentThreads = function (data) {
        gInterface.refreshThreads(data);
    };

    let handleApprovedAnswerState = function (data) {
        gInterface.changeApprovedAnswerState(data.question, data.answer);
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
            .on(receives.updateQuestionVotes, gInterface.updateQuestionVotes);
    };

    let sendNewQuestion = function (question) {
        socket.emit(emits.OpenNewThread, question);
    };

    let sendNewAnswer = function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.questionAnswered, data);
    };

    let sendApprovedAnswer = function (question, answer) {
        let data = {
            question: question,
            answer: answer
        };
        socket.emit(emits.approvedAnswerStateChanged, data);
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

    let decrementAnswerUpVotes = function (question, answer) {
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
        decrementAnswerUpVotes,
        sendApprovedAnswer
    };
})();

let gInterface = (function () {
    let createThreadContainer = function (question, upVotes,answerCount) {
        return $(
            "<li class='thread'>" +
            "<div class='questionWrap row'>" +
            "<div class='up_number_down col-2'> <button  class='upVoteThread component_updown' onclick='gInterface.upVoteThread(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='threadUpVotes component_updown'>" + upVotes + "</span>" +
            "<button  class='downVoteThread component_updown' onclick='gInterface.downVoteThread(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<p class='question col-10'>" + question + "</p>" +
            "<a class='showAnswersBtn col-12 text-center' onclick='gInterface.showAnswers(this)'><u class='text-info'>"+ answerCount+" answers</u></a>"+
            "</div>" +
            "<ul class='answers hide'></ul>" +
            "<form class='answerForm row' action='#'>" +
            "<input type='text' name='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "</li>"
        );
    };

    const url = new URL(document.URL);
    const teacher = url.searchParams.get("t");
    let createAnswerContainer = function (answer, upVotes, isApproved) {
        let $li = $("<li class='answerWrap row' >" +
            "<div class='up_number_down col-2'><button  class='upVoteAnswer component_updown' onclick='gInterface.upVoteAnswer(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='answerUpVotes component_updown'>" + upVotes + "</span>" +
            "<button   class='downVoteAnswer component_updown' onclick='gInterface.downVoteAnswer(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button>" +
            "</div>" +
            "<p class='answer col-8'>" + answer + "</p>" +
            "</li>");

        if (teacher === "1") {
            $li.append("<button class='col-2 .approve' onclick='gInterface.approveAnswer(this)'><i class='fa fa-star' aria-hidden='true'></i></button>");
        }

        if (isApproved) {
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
        let question = $(button).parent().parent().find(".question").text();
        socketModule.incrementThreadUpVotes(question);
    };

    let downVoteThread = function (button) {
        let $questionWrapper = $(button).parent().parent();
        if ($questionWrapper.find("span.threadUpVotes").text() > 0) {
            let question = $questionWrapper.find(".question").text();
            socketModule.decrementThreadUpVotes(question);
        } else {
            // TODO show error: can't decrement upvotes below 0
        }
    };

    let upVoteAnswer = function (button) {
        let question = $(button).parent().parent().parent().parent().find(".question").text();
        let answer = $(button).parent().parent().find(".answer").text();
        socketModule.incrementAnswerUpVotes(question, answer);
    };

    let downVoteAnswer = function (button) {
        let $answerWrapper = $(button).parent().parent();
        if ($answerWrapper.find("span.answerUpVotes").text() > 0) {
            let question = $answerWrapper.parent().parent().find(".question").text();
            let answer = $answerWrapper.find(".answer").text();
            socketModule.decrementAnswerUpVotes(question, answer);
        } else {
            // TODO show error: can't decrement upvotes below 0
        }
    };

    let approveAnswer = function (button) {
        let answer = $(button).parent().find(".answer").text();
        let question = $(button).parent().parent().parent().find(".question").text();
        socketModule.sendApprovedAnswer(question, answer);
        $(button).parent().toggleClass("approved");
    };

    let init = function () {
        $("#questionForm").on('submit', function (e) {
            e.preventDefault();
            let $questionInput = $('#questionForm').find('input[name="question"]');
            let question = checkQuestionMark($questionInput.val());
            socketModule.sendNewQuestion(question);
            $("#threads").append(createThreadContainer(question.replace(/</g, "&lt;").replace(/>/g, "&gt;"), 0,0    ));
            $questionInput.val("");
        });

        $("#threads").on('submit', $(".answerForm"), function (e) {
            e.preventDefault();
            $(this).parent().find('.answers').removeClass('hide');
            let $answer = $(e.target).find("input[name='answer']");
            let question = $(e.target).parent().find(".question").text();
            socketModule.sendNewAnswer(question, $answer.val());
            $(e.target).parent().find(".answers").append(createAnswerContainer($answer.val().replace(/</g, "&lt;").replace(/>/g, "&gt;"), 0, false));
            $answer.val("");
        });

    };

    let addThread = function (question, upVotes, answerList) {
        let $li = createThreadContainer(question, upVotes,answerList.length);
        answerList.forEach(answerObject => {
            $li.find(".answers").append(createAnswerContainer(answerObject.answer, answerObject.upVotes, answerObject.isApproved));
        });
        $("#threads").append($li);
    };

    let refreshThreads = function (newThreadList) {
        $("#threads").html("");
        newThreadList.forEach(thread => {
            console.log(thread.answers);
            addThread(thread.question, thread.upVotes, thread.answers);
        });
    };

    let addAnswerToThread = function (question, answerText, answerUpVotes, answerIsApproved, numberOfAnswers) {
        let $li = createAnswerContainer(answerText, answerUpVotes, answerIsApproved);
        console.log(numberOfAnswers);
        $("#threads").find(".question:contains('" + question + "')").parent().parent().find(".answers").append($li);
        $("#threads").find(".question:contains('" + question + "')").parent().find('.showAnswersBtn').html("<u class='text-info'>" +numberOfAnswers + ' answers</u>');
    };

    let changeApprovedAnswerState = function (question, answer) {
        $("#threads").find(".question:contains('" + question + "')").parent().parent().find(".answers").find(".answer:contains('" + answer + "')").parent().toggleClass("approved");
    };

    let updateQuestionVotes = function (data) {
        $("#threads").find(".question:contains('" + data.question + "')").parent().find(".threadUpVotes").html(data.votes);
    };

    let updateAnswerVotes = function (data) {
        $("#threads").find(".question:contains('" + data.question + "')").parent().parent().find(".answer:contains('" + data.answer + "')").parent().find(".answerUpVotes").html(data.votes);
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
        updateQuestionVotes,
        updateAnswerVotes,
        showAnswers
    };
})();
