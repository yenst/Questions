"use strict";
$(function () {
    socketModule.init();
    gInterface.methods.init();
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
        removedAnswer: "12",
        removedThread: "13"

    };
    let emits = {
        OpenNewThread: "a",
        questionAnswered: "b",
        incrementAnswerUpVotes: "c",
        decrementAnswerUpVotes: "d",
        incrementThreadUpVotes: "e",
        decrementThreadUpVotes: "f",
        approvedAnswerStateChanged: "g",
        removeAnswer: "h",
        removeThread: "i"
    };

    let handleAddedNewThread = function(thread){
        ajaxCalls.isTeacher().then(isTeacher => {
            gInterface.methods.addThread(thread, isTeacher);
        }).catch(err => {
            gInterface.methods.showError(err);
        })
    };

    let handleAddedNewAnswer = function (answer) {
        ajaxCalls.isTeacher().then(isTeacher => {
            gInterface.methods.addAnswerToThread(answer, isTeacher);
        }).catch(err => {
            gInterface.methods.showError(err);
        })
    };

    let handleLogInSession = function (data) {
    };

    let publicMethods = {};
    publicMethods.init = function () {
        socket = io();
        socket
            .on(receives.addedNewThread, handleAddedNewThread)
            .on(receives.addedNewAnswer, handleAddedNewAnswer)
            .on(receives.CurrentThreads, gInterface.methods.refreshThreads)
            .on(receives.approvedAnswerStateChanged, gInterface.methods.changeApprovedAnswerState)
            .on(receives.updateAnswerVotes, gInterface.methods.updateAnswerVotes)
            .on(receives.updateQuestionVotes, gInterface.methods.updateThreadVotes)
            .on(receives.loggedInSession, handleLogInSession)
            .on(receives.removedAnswer, gInterface.methods.removeAnswer)
            .on(receives.removedThread, gInterface.methods.removeThread);
    };

    publicMethods.sendNewQuestion = function (question) {
        socket.emit(emits.OpenNewThread, question);
    };

    publicMethods.sendNewAnswer = function (threadId, answer) {
        let data = {
            threadId: threadId,
            answer: answer
        };
        socket.emit(emits.questionAnswered, data);
    };

    publicMethods.sendApprovedAnswer = function (answerId) {
        socket.emit(emits.approvedAnswerStateChanged, answerId);
    };

    publicMethods.incrementThreadUpVotes = function (threadId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                threadId: threadId,
                userId: userId
            };
            socket.emit(emits.incrementThreadUpVotes, data);
        }).catch(err => {
            gInterface.methods.showError(err);
        });
    };

    publicMethods.decrementThreadUpVotes = function (threadId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                threadId: threadId,
                userId: userId
            };
            socket.emit(emits.decrementThreadUpVotes, data);
        }).catch(err => {
            gInterface.methods.showError(err);
        });
    };

    publicMethods.incrementAnswerUpVotes = function (answerId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                answerId: answerId,
                userId: userId
            };
            socket.emit(emits.incrementAnswerUpVotes, data);
        }).catch(err => {
            gInterface.methods.showError(err);
        });
    };

    publicMethods.decrementAnswerUpVotes = function (answerId) {
        ajaxCalls.getUID().then(userId => {
            let data = {
                answerId: answerId,
                userId: userId
            };
            socket.emit(emits.decrementAnswerUpVotes, data);
        }).catch(err => {
            gInterface.methods.showError(err)
        });
    };

    publicMethods.removeAnswer = function (answerId) {
        ajaxCalls.isTeacher().then(isTeacher => {
            if (isTeacher) {
                socket.emit(emits.removeAnswer, answerId);
            } else {
                gInterface.methods.showError("You don't have permission to delete items");
            }
        }).catch(err => {
            gInterface.methods.showError(err);
        })
    };

    publicMethods.removeThread = function (threadId) {
        ajaxCalls.isTeacher().then(isTeacher => {
            if (isTeacher) {
                socket.emit(emits.removeThread, threadId)
            }
        }).catch(err => {
            gInterface.methods.showError(err);
        })
    };

    return publicMethods;
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
    let createThreadContainer = function (thread, isTeacher) {
        let $threadContainer = $(
            "<li class='thread' data-id='" +
            thread._id +
            "'>" +
            "<div class='questionWrap row'>" +
            "<div class='up_number_down col-2'> <button  class='upVoteThread component_updown' onclick='gInterface.buttonEvents.upVoteThread(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='threadUpVotes component_updown'>" +
            thread.votes +
            "</span>" +
            "<button  class='downVoteThread component_updown' onclick='gInterface.buttonEvents.downVoteThread(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button></div>" +
            "<p class='question col-10'>" +
            thread.question +
            "</p>" +
            "</div>" +
            "<ul class='answers hide'></ul>" +
            "<form class='answerForm row' action='#'>" +
            "<input type='text' name='answer' class='col-10' autocomplete=\"off\"> " +
            "<input type='submit' class='col-2' value='Answer'/>" +
            "</form>" +
            "</li>"
        );

        if(isTeacher){
            $threadContainer.find(".question").removeClass("col-10").addClass("col-8");
            $threadContainer.find(".questionWrap").append(
                "<div class='col-2'>" +
                "<button class='component_updown .removeThread' onclick='gInterface.buttonEvents.removeThread(this)'><i class='fa fa-trash' aria-hidden='true'></i></button>" +
                "</div>"
            );
        }

        $threadContainer.find(".questionWrap").append(
            "<a class='showAnswersBtn col-12 text-center' onclick='gInterface.buttonEvents.showAnswers(this)'><u class='text-info'><span class='amountAnswers'>" +
            thread.answers.length +
            "</span> answers</u></a>"
        );

        return $threadContainer;
    };

    let createAnswerContainer = function (answer, isTeacher) {
        let $li = $(
            "<li class='answerWrap row' data-id='" +
            answer._id +
            "'>" +
            "<div class='up_number_down col-2'><button  class='upVoteAnswer component_updown' onclick='gInterface.buttonEvents.upVoteAnswer(this)'><i class='fa fa-chevron-up' aria-hidden='true'></i></button>" +
            "<span class='answerUpVotes component_updown'>" +
            answer.votes +
            "</span>" +
            "<button   class='downVoteAnswer component_updown' onclick='gInterface.buttonEvents.downVoteAnswer(this)'><i class='fa fa-chevron-down' aria-hidden='true'></i></button>" +
            "</div>" +
            "<p class='answer col-8'>" +
            answer.answer +
            "</p>" +
            "</li>"
        );
        if (isTeacher) {
            $li.append(
                "<div class='col-2'>" +
                "<button class='component_updown .approve' onclick='gInterface.buttonEvents.approveAnswer(this)'><i class='fa fa-star' aria-hidden='true'></i></button>" +
                "<button class='component_updown .removeAnswer' onclick='gInterface.buttonEvents.removeAnswer(this)'><i class='fa fa-trash' aria-hidden='true'></i></button>" +
                "</div>"
            );
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
        return checkedQuestion;
    };

    let buttonEvents = {};
    buttonEvents.upVoteThread = function (button) {
        let threadId = $(button)
            .parent()
            .parent()
            .parent()
            .attr("data-id");
        socketModule.incrementThreadUpVotes(threadId);
    };

    buttonEvents.downVoteThread = function (button) {
        let threadId = $(button)
            .parent()
            .parent()
            .parent()
            .attr("data-id");
        socketModule.decrementThreadUpVotes(threadId);
    };

    buttonEvents.upVoteAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .parent()
            .attr("data-id");
        socketModule.incrementAnswerUpVotes(answerId);
    };

    buttonEvents.downVoteAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .parent()
            .attr("data-id");
        socketModule.decrementAnswerUpVotes(answerId);
    };

    buttonEvents.approveAnswer = function (button) {
        let answerId = $(button)
            .parent()
            .parent()
            .attr("data-id");
        socketModule.sendApprovedAnswer(answerId);
        $(button)
            .parent()
            .parent()
            .toggleClass("approved");
    };

    buttonEvents.removeAnswer = function (button) {
        let $answerWrap = $(button)
            .parent()
            .parent();
        socketModule.removeAnswer($answerWrap.attr("data-id"));
        let $amountOfAnswers = $answerWrap.parent().parent().find(".amountAnswers");
        console.log($amountOfAnswers);
        $amountOfAnswers.text($amountOfAnswers.text() - 1);
        $answerWrap.remove();
    };

    buttonEvents.removeThread = function (button) {
        let $threadContainer = $(button)
            .parent()
            .parent()
            .parent();
        socketModule.removeThread($threadContainer.attr("data-id"));
        $threadContainer.remove();
    };

    buttonEvents.showAnswers = function (button) {
        $(button)
            .parent()
            .parent()
            .find(".answers")
            .toggleClass("hide");
    };


    let methods = {};
    methods.init = function () {
        $("#questionForm").on("submit", function (e) {
            e.preventDefault();
            let $questionInput = $("#questionForm").find('input[name="question"]');
            let question = checkQuestionMark($questionInput.val());
            socketModule.sendNewQuestion(question);
            $questionInput.val("");
        });

        $("#threads").on("submit", $(".answerForm"), function (e) {
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
        });
    };

    methods.addThread = function (thread, isTeacher) {
        let $li = createThreadContainer(thread, isTeacher);
        thread.answers.forEach(answer => {
            $li.find(".answers").append(createAnswerContainer(answer, isTeacher));
        });
        $("#threads").append($li);
    };

    methods.refreshThreads = function (threads) {
        $("#threads").html("");
        ajaxCalls.isTeacher().then(isTeacher => {
            threads.forEach(thread => {
                gInterface.methods.addThread(thread, isTeacher);
            });
        }).catch(err => {
            gInterface.methods.showError(err);
        });
    };

    methods.addAnswerToThread = function (answer) {
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
                    "<u class='text-info'><span class='amountAnswers'>" +
                    answer.parentNode.answers.length +
                    "</span> answers</u>"
                );
        }).catch(err => {
            gInterface.methods.showError(err);
        });
    };

    methods.changeApprovedAnswerState = function (answer) {
        $("#threads")
            .find(".question:contains('" + answer.parentNode.question + "')")
            .parent()
            .parent()
            .find(".answers")
            .find(".answer:contains('" + answer.answer + "')")
            .parent()
            .toggleClass("approved");
    };

    methods.updateThreadVotes = function (thread) {
        $("#threads")
            .find(".question:contains('" + thread.question + "')")
            .parent()
            .find(".threadUpVotes")
            .html(thread.votes);
    };

    methods.updateAnswerVotes = function (answer) {
        $("#threads")
            .find(".question:contains('" + answer.parentNode.question + "')")
            .parent()
            .parent()
            .find(".answer:contains('" + answer.answer + "')")
            .parent()
            .find(".answerUpVotes")
            .html(answer.votes);
    };

    methods.showError = function (error) {
        $("#errortext").html(error);
    };

    methods.removeAnswer = function (answer) {
        let $affectedThread = $("#threads").find(".thread[data-id='" + answer.parentNode + "']");
        $affectedThread.find(".answerWrap[data-id='" + answer._id + "']").remove();
        let $amountOfAnswers = $affectedThread.find(".amountAnswers");
        $amountOfAnswers.html($amountOfAnswers.text() - 1);
    };

    methods.removeThread = function (thread) {
        $("#threads").find(".thread[data-id='" + thread._id + "']").remove();
    };

    return {
        methods,
        buttonEvents
    };
})();
