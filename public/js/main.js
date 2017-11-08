"use strict";

const gInterface = (function () {

    //TODO use this function with callbacks
    let askToLogin = function () {
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
                else askToLogin();
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
                else askToLogin();
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
                else askToLogin();
            });
            $("#threads")
                .on("click", ".answerButton", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let $currentThread = $(e.target).closest(".thread");
                        let threadId = $currentThread.attr("data-thread-id");
                        $("input[name='threadId']").attr("value", threadId);
                        let threadQuestion = $currentThread.find(".question").text();
                        let $answerFormModal = $("#answerFormModal");
                        $answerFormModal.find(".threadQuestion").text(threadQuestion);
                        $answerFormModal.modal("show");
                    } else askToLogin();
                })
                .on('click', ".answersVisibilityToggler", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").find(".fa").toggleClass("fa-caret-down").toggleClass("fa-caret-up");
                    $(e.target).closest(".card-body").find(".answers").toggle();
                })
                .on('click', ".commentsVisibilityToggler", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").find(".fa").toggleClass("fa-caret-down").toggleClass("fa-caret-up");
                    $(e.target).closest(".answer").find(".comments").toggle();
                })
                .on("click", ".commentButton", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
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
                    } else askToLogin();
                })
                .on("click", ".threadUpVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target).closest(".thread").attr("data-thread-id");
                        socketModule.upVoteThread(threadId);
                    }
                    else askToLogin();
                })
                .on("click", ".threadDownVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target).closest(".thread").attr("data-thread-id");
                        socketModule.downVoteThread(threadId);
                    }
                    else askToLogin();
                })
                .on("click", ".deleteThreadBtn", function (e) {
                    e.preventDefault();
                    let threadId = $(e.target).closest(".thread").attr("data-thread-id");
                    socketModule.deleteThread(threadId);
                })
                .on("click", ".deleteAnswerBtn", function (e) {
                    e.preventDefault();
                    let $answer = $(e.target).closest(".answer");
                    let answerId = $answer.attr("data-answer-id");
                    let threadId = $answer.closest(".thread").attr("data-thread-id");
                    socketModule.deleteAnswer(answerId, threadId);
                })
                .on("click", ".approveAnswerBtn", function (e) {
                    e.preventDefault();
                    let answerId = $(e.target).closest(".answer").attr("data-answer-id");
                    socketModule.toggleAnswerApproved(answerId);
                });
            $('#askbutton').on('click', function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) $('#questionFormModal').modal('show');
                else askToLogin();
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
            $("#threads").prepend(threadHTML);
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
        addCommentToAnswer: function (answerId, commentHTML, amountOfComments) {
            let $affectedAnswer = $("#threads").find(".answer[data-answer-id='" + answerId + "']");
            let $comments = $affectedAnswer.find(".comments");
            $affectedAnswer.find(".amountComments").text(amountOfComments);
            $comments.append(commentHTML);
            if (!$comments.is(":visible"))
                $comments.toggle();
        },
        clearThreads: function () {
            $('#threads').html('');
        },
        updateThreadVotes: function (threadId, votes) {
            $("#threads").find(".thread[data-thread-id='" + threadId + "']").find(".votes").text(votes);
        },
        removeThread: function (threadId) {
            $("#threads").find(".thread[data-thread-id='" + threadId + "']").remove();
        },
        removeAnswer: function (answerId, threadId) {
            let $affectedThread = $("#threads").find(".thread[data-thread-id='" + threadId + "']");
            let $amountAnswers = $affectedThread.find(".amountAnswers");
            $amountAnswers.text($amountAnswers.text() - 1);
            $affectedThread.find(".answer[data-answer-id='" + answerId + "']").remove();
        },
        setAnswerApproved: function (answerId, threadId) {
            $("#threads")
                .find(".thread[data-thread-id='" + threadId + "']")
                .find(".answer[data-answer-id='" + answerId + "']")
                .toggleClass("bg-light")
                .toggleClass("bg-success");
        }
    }
})();

$(document).ready(function () {
    gInterface.bindEvents();
});