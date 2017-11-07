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
                    $('#questionFormModal').modal("hide");
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
            $("#comment_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $answerInput = $(e.target).find("input[name='comment']");
                    let $answerIdInput = $(e.target).find("input[name='answerId']");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.sendComment($threadIdInput.val(), $answerIdInput.val(), $answerInput.val());
                    $("#commentFormModal").modal("hide");
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
                .on('click', ".answersVisibilityToggler", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").find(".fa").toggleClass("fa-caret-down").toggleClass("fa-caret-up");
                    $(e.target).closest(".card-body").find(".answers").toggle();
                })
                .on("click", ".commentButton", function (e) {
                    e.preventDefault();
                    let $currentThread = $(e.target).closest(".thread");
                    let $currentAnswer = $(e.target).closest(".answer");
                    let threadId = $currentThread.attr("data-thread-id");
                    let answerId = $currentAnswer.attr("data-answer-id");
                    $("input[name='threadId']").attr("value", threadId);
                    $("input[name='answerId']").attr("value", answerId);
                    let answer = $currentAnswer.find('.answerText').text();
                    let $commentFormModal = $("#commentFormModal");
                    $commentFormModal.find(".threadAnswer").text(answer);
                    $commentFormModal.modal("show");
                })
                .on("click", ".threadUpVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target).closest(".thread").attr("data-thread-id");
                        socketModule.upVoteThread(threadId);
                    }
                    else AskToLogin();
                })
                .on("click", ".threadDownVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target).closest(".thread").attr("data-thread-id");
                        socketModule.downVoteThread(threadId);
                    }
                    else AskToLogin();
                });
            $('#askbutton').on('click', function (e) {
                $('#questionFormModal').modal('show');
            });
            $('#search_threads_on_tag_form').on('submit', function (e) {
                e.preventDefault();
                let $tagInput = $(e.target).find('input[name="tag"]');
                socketModule.findThreadsWithTag($tagInput.val());
                $tagInput.val("");
            })
        },
        showError: function (error) {
            let $errorModal = $("#errorModal");
            $errorModal.find(".errorMsg").text(error);
            $errorModal.modal("show");
        },
        addThread: function (threadHTML) {
            $("#threads").append(threadHTML);
        },
        addAnswerForThread: function (threadId, answerHTML, amountAnswersOnThread) {
            let $affectedThread = $("#threads").find(".thread[data-thread-id='" + threadId + "']");
            $affectedThread.find(".amountAnswers").text(amountAnswersOnThread);
            let $answers = $affectedThread.find(".answers");
            $answers.prepend(answerHTML);
            if (!$answers.is(":visible"))
                $answers.toggle();
            if ($affectedThread.find(".answerButton").text() !== "Answer")
                $affectedThread.find(".answerButton").text("Answer");
        },
        addCommentToAnswer: function (answerId, commentHTML) {
            let $affectedAnswer = $("#threads").find(".answer[data-answer-id='" + answerId + "']");
            let $comments = $affectedAnswer.find(".comments");
            $comments.prepend(commentHTML);
        },
        clearThreads: function () {
            $('#threads').html('');
        },
        updateThreadVotes: function (threadId, votes) {
            $("#threads").find(".thread[data-thread-id='" + threadId + "']").find(".votes").text(votes);
        }
    }
})();

$(document).ready(function () {
    gInterface.bindEvents();
});