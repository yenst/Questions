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
        approvedAnswerStateChanged: "8",
        updateAnswerVotes: "9",
        updateQuestionVotes: "10",
        loggedInSession: "11",
        addedAnswerToAnswer: "12"
        sendNewTag:"14",
        sendRemoveTag:"15"
    };
    let emits = {
        OpenNewThread: "a",
        questionAnswered: "b",
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f",
        approvedAnswerStateChanged: "g",
        answerAnswered: "h",
        addNewTag:"j",
        removeTag:"k"
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

    let handleUpdateQuestionVotes = function (data) {
        gInterface.updateThreadVotes(data);
    };

    let handleLogInSession = function (data) {
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    let init = function () {
        socket = io();
        socket
            .on(receives.addedNewThread, handleNewThread)
            .on(receives.addedNewAnswer, handleNewAnswer)
            .on(receives.CurrentThreads, handleCurrentThreads)
            .on(receives.approvedAnswerStateChanged, handleApprovedAnswerState)
            .on(receives.updateAnswerVotes, gInterface.updateAnswerVotes)
            .on(receives.updateQuestionVotes, handleUpdateQuestionVotes)
            .on(receives.loggedInSession, handleLogInSession)
            .on(receives.addedAnswerToAnswer, gInterface.updateAnswerToAnswer);
    };

    let sendNewQuestion = function (question) {
        socket.emit(emits.OpenNewThread, question);
    };

    let sendNewTag = function(threadId,tagname){
        let data={threadId,tagname};
        socket.emit(emits.addNewTag,data);
    }

    let sendRemoveTag = function(threadId,tagId){
    
        let data = {threadId,tagId};
        console.log(data);
        socket.emit(emits.removeTag,data);
    }

    let sendNewAnswer = function (threadId, answer) {
        let data = {
            threadId: threadId,
            answer: answer
        };
        socket.emit(emits.questionAnswered, data);
    };

    let sendNewAnswerToAnswer = function(threadId, answerId, answer){
        let data = {
            threadId: threadId,
            answerId: answerId,
            answer: answer
        };
        socket.emit(emits.answerAnswered,data);
    };

    let sendApprovedAnswer = function (answerId) {
        socket.emit(emits.approvedAnswerStateChanged, answerId);
    };

    let incrementThreadUpVotes = function (threadId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                threadId: threadId,
                userId: userId
            };
            socket.emit(emits.incrementThreadUpVotes, data);
        }).catch(err => {
            gInterface.showError(err);
        });
    };

    let decrementThreadUpVotes = function (threadId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                threadId: threadId,
                userId: userId
            };
            socket.emit(emits.decrementThreadUpVotes, data);
        }).catch(err => {
            gInterface.showError(err);
        });
    };

    let incrementAnswerUpVotes = function (answerId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                answerId: answerId,
                userId: userId
            };
            socket.emit(emits.incrementAnswerUpVotes, data);
        }).catch(err => {
            gInterface.showError(err);
        });
    };

    let decrementAnswerUpVotes = function (answerId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                answerId: answerId,
                userId: userId
            };
            socket.emit(emits.decrementAnswerUpVotes, data);
        }).catch(err => {
            gInterface.showError(err)
        });
    };

    let addAnswerToThread = function(e){
        e.preventDefault();
        let $answer = $(e.target).find("input[name='answer']");
        let threadId = $(e.target)
            .parent()
            .attr("data-id");
        socketModule.sendNewAnswer(threadId, $answer.val());
        $(e.target)
            .parent()
            .find(".answers")
            .removeClass("hide");
        $answer.val("");
    };


    let addAnswerToAnswer = function(e){
        e.preventDefault();
        let $answer = $(e.target).find("input[name='answerToAnswer']");
        let threadId = $(e.target)
            .parent()
            .parent()
            .parent()
            .attr("data-id");
        let answerId = $(e.target)
            .parent()
            .attr("data-id");
        socketModule.sendNewAnswerToAnswer(threadId, answerId, $answer.val());

        $answer.val("");
    };

    return {
        init,
        sendNewQuestion,
        sendNewAnswer,
        incrementThreadUpVotes,
        decrementThreadUpVotes,
        incrementAnswerUpVotes,
        decrementAnswerUpVotes,
        sendApprovedAnswer,
        addAnswerToThread,
        addAnswerToAnswer,
        sendNewAnswerToAnswer
        sendNewTag,
        sendRemoveTag
    };
})();

let ajaxCalls = {
    isTeacher: function () {
        return new Promise(function (resolve, reject) {
            $.ajax({
                type: "GET",
                url: "/checkteacher",
                success: function (data) {
                    let parsedData = JSON.parse(data);
                    resolve(parsedData.isTeacher)
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    reject("teacher call failed");
                }
            });
        });
    },
    getUID: function () {
        return new Promise(function (resolve, reject) {
            $.ajax({
                type: "GET",
                url: "/getUserId",
                success: function (data) {
                    let parsedData = JSON.parse(data);
                    if (parsedData.isLoggedIn) {
                        resolve(parsedData.userId);
                    } else {
                        reject("Not logged in");
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    reject("Getting UID failed");
                }
            });
        });
    }
};

let gInterface = (function () {
    let createThreadContainer = function (thread) {
        console.log(thread);
        let threadContainer = $(
            "<li class='thread' data-id='" +
            thread._id +
            "'>" +
            "<div class='questionWrap row'>" +
            "<div class='up_number_down col-2'> <button  class='upVoteThread component_updown' onclick='gInterface.upVoteThread(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='threadUpVotes component_updown'>" +
            thread.votes +
            "</span>" +
            "<button  class='downVoteThread component_updown' onclick='gInterface.downVoteThread(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<div class='question col-10'><p>" +
            thread.question +
            "</p><div class='row'><ul class='tagscontainer col-7'></ul><form class='col-5' onsubmit='gInterface.addTag(this)'><input type='text' name='tag'></form></div>"+
            "</div>" +
            
            "<a class='showAnswersBtn col-12 text-center' onclick='gInterface.showAnswers(this)'><u class='text-info'>" +
            thread.answers.length +
            " answers</u></a>" +
            "</div>" +
            "<form class='answerForm row col-12' action='#' onsubmit='socketModule.addAnswerToThread(event)'>" +
            "<input type='text' name='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "<ul class='answers hide'></ul>" +
            "</li>"
        );

        thread.tags.forEach(function(tag){
            console.log(tag);   
            $(threadContainer).find('.tagscontainer').append("<li class='tagclass badge badge-pill badge-primary'><a onclick='gInterface.removeTag(this)' data-id='"+tag._id+"'>"+tag.tagname+"</a></li>");
        });

        return(threadContainer);

    };


    let createAnswerContainer = function (answer, isTeacher) {
        let $li = $(
            "<li class='answerWrap row' data-id='" +
            answer._id +
            "'>" +
            "<div class='up_number_down col-2'><button  class='upVoteAnswer component_updown' onclick='gInterface.upVoteAnswer(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='answerUpVotes component_updown'>" +
            answer.votes +
            "</span>" +
            "<button   class='downVoteAnswer component_updown' onclick='gInterface.downVoteAnswer(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button>" +
            "</div>" +
            "<p class='answer col-8'>" +
            answer.answer +
            "</p>" +
            "<form class='answerToAnswerForm row col-6' action='#' onsubmit='socketModule.addAnswerToAnswer(event)'>" +
            "<input type='text' name='answerToAnswer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "<ul class='answersToAnswer col-12'>" +

            "</ul>" +
            "</li>"
        );
        answer.answers.forEach(answer => {
            $li.find(".answersToAnswer").append(createAnswerToAnswerContainer(answer));
        });
        if (isTeacher) {
            $li.append(
                "<button class='col-2 .approve' onclick='gInterface.approveAnswer(this)'><i class='fa fa-star' aria-hidden='true'></i></button>"
            );
        }
        if (answer.isApproved) {
            $li.addClass("approved");
        }
        return $li;
    };

    let createAnswerToAnswerContainer = function(answer){
        let $li = $(
            "<li class='answerWrap row' data-id='" +
            answer._id +
            "'>" +
            "<p class='answer col-8'>" +
            answer.answer +
            "</p>" +
            "</li>"
        );
        return $li;
    };

    let checkQuestionMark = function (question) {
        let checkedQuestion = question;
        if (!question.endsWith("?")) {
            checkedQuestion += "?";
        }
        return checkedQuestion;
    };

    //------------- \\
    // PUBLIC STUFF \\
    //------------- \\
    let upVoteThread = function (button) {
        let threadId = $(button)
            .parent()
            .parent()
            .parent()
            .attr("data-id");
        socketModule.incrementThreadUpVotes(threadId);
    };

    let downVoteThread = function (button) {
        let threadId = $(button)
            .parent()
            .parent()
            .parent()
            .attr("data-id");
        socketModule.decrementThreadUpVotes(threadId);
    };

    let upVoteAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .parent()
            .attr("data-id");
        socketModule.incrementAnswerUpVotes(answerId);
    };

    let downVoteAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .parent()
            .attr("data-id");
        socketModule.decrementAnswerUpVotes(answerId);
    };

    let approveAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .attr("data-id");
        socketModule.sendApprovedAnswer(answerId);
        $(button)
            .parent()
            .toggleClass("approved");
    };

    let init = function () {
        $("#questionForm").on("submit", function (e) {
            e.preventDefault();
            let $questionInput = $("#questionForm").find('input[name="question"]');
            let question = checkQuestionMark($questionInput.val());
            socketModule.sendNewQuestion(question);
            $questionInput.val("");
        });


    };

    let addThread = function (thread, isTeacher) {
        let $li = createThreadContainer(thread);
        thread.answers.forEach(answer => {
            $li.find(".answers").append(createAnswerContainer(answer, isTeacher));
        });
        $("#threads").append($li);
    };

    let refreshThreads = function (threads) {
        $("#threads").html("");
        ajaxCalls.isTeacher().then(isTeacher => {
            threads.forEach(thread => {
                addThread(thread, isTeacher);
            });
        }).catch(err => {
            gInterface.showError(err);
        });
    };

    let addAnswerToThread = function (answer) {
        ajaxCalls.isTeacher().then(isTeacher => {
            let $li = createAnswerContainer(answer, isTeacher);
            let $questionWrap = $("#threads")
                .find(".question:contains('" + answer.parentNode.question + "')")
                .parent();
            $questionWrap
                .parent()
                .find(".answers")
                .append($li);
            $questionWrap
                .find(".showAnswersBtn")
                .html(
                    "<u class='text-info'>" +
                    answer.parentNode.answers.length +
                    " answers</u>"
                );
        }).catch(err => {
            gInterface.showError(err);
        });
    };

   

    let changeApprovedAnswerState = function (answer) {
        $("#threads")
            .find(".question:contains('" + answer.parentNode.question + "')")
            .parent()
            .parent()
            .find(".answers")
            .find(".answer:contains('" + answer.answer + "')")
            .parent()
            .toggleClass("approved");
    };

    let updateThreadVotes = function (thread) {
        $("#threads")
            .find(".question:contains('" + thread.question + "')")
            .parent()
            .find(".threadUpVotes")
            .html(thread.votes);
    };

    let updateAnswerVotes = function (answer) {
        $("#threads")
            .find(".question:contains('" + answer.parentNode.question + "')")
            .parent()
            .parent()
            .find(".answer:contains('" + answer.answer + "')")
            .parent()
            .find(".answerUpVotes")
            .html(answer.votes);
    };

    let showAnswers = function (button) {
        $(button)
            .parent()
            .parent()
            .find(".answers")
            .toggleClass("hide");
    };

    let showError = function (error) {
        $("#errortext").html(error);
    };

    let updateAnswerToAnswer =  function(answer){
        let $li = createAnswerToAnswerContainer(answer);
        let $questionWrap = $("#threads")
            .find(".answer:contains('" + answer.parentNode.answer + "')")
            .parent();

        $questionWrap
            .find(".answersToAnswer")
            .append($li);
    };

    let addTag = function(e){
            let $tag = $(e).find("input[name='tag']");
            console.log('tag queued:' + $tag.val());
            let threadId = $(e)
            .closest("li.thread")
                .attr("data-id");
                console.log(threadId);
            socketModule.sendNewTag(threadId,$tag.val());
            
        };

    let removeTag = function(e){

        let $threadId = $(e)
        .closest("li.thread")
        .attr("data-id");
        console.log($threadId);
        
        socketModule.sendRemoveTag($threadId,$(e).attr("data-id"));
    }
    

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
        showAnswers,
        showError,
        createAnswerToAnswerContainer,
        updateAnswerToAnswer

        addTag,
        removeTag    };
})();
