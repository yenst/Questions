"use strict";

const gInterface = (function () {

    let AskToLogin = function () {
        gInterface.showError("Please login to continue.");
    };

    return {
        bindEvents: function () {
            let self = this;
            $("#question_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $questionInput = $(e.target).find("input[name='question']");
                    socketModule.sendQuestion($questionInput.val());
                    $questionInput.val("");
                }
                else AskToLogin();
            });
            $("#answer_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $answerInput = $(e.target).find("input[name='answer']");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.sendAnswer($threadIdInput.val(), $answerInput.val());
                    $("#answerFormModal").modal("hide");
                    $answerInput.val("");
                    $threadIdInput.val("");
                }
                else AskToLogin();
            });
            $("#threads")
                .on("click", ".answerButton", function (e) {
                    e.preventDefault();
                    let $currentThread = $(e.target).closest(".thread");
                    let threadId = $currentThread.attr("data-thread-id");
                    $("input[name='threadId']").attr("value", threadId);
                    let threadQuestion = $currentThread.find(".question").text();
                    let $answerFormModal = $("#answerFormModal");
                    $answerFormModal.find(".threadQuestion").text(threadQuestion);
                    $answerFormModal.modal("show");
                })
                .on('click', ".answersVisibiltyToggler", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").find(".fa").toggleClass("fa-caret-down").toggleClass("fa-caret-up");
                    $(e.target).closest(".card-body").find(".answers").toggle();
                });
        },
        showError: function (error) {
            let $errorModal = $("#errorModal");
            $errorModal.find(".errorMsg").text(error);
            $errorModal.modal("show");
        },
        addThread: function (threadHTML) {
            $("#threads").append(threadHTML);
        }
    }
})();

$(document).ready(function () {
    gInterface.bindEvents();
});