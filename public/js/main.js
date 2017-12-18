"use strict";
let tag = null;
let newClass = false;
let images = [];

const gInterface = (function () {
    let isAuthenticated = function () {
        return new Promise(function (resolve) {
            if (socketModule.isConnected()) {
                resolve();
            } else {
                gInterface.showError("Please login to continue.");
            }
        })
    };
    let htmlEntities = function (str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    return {
        bindEvents: function () {
            let self = this;
            $("body").tooltip({selector: '[data-toggle="tooltip"]'});
            $("#question_form")
                .on("submit", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let $titleInput = $(e.target).find("#title");
                        let $questionInput = $(e.target).find("#question");
                        let $pollChoiceList = $("#pollChoices");
                        let title = $titleInput.val();
                        let question = $questionInput.val();
                        if ($(e.target).find("#pollCheckBox").is(":checked")) {
                            let choices = [];
                            $pollChoiceList.find('.choiceContent').each(function () {
                                choices.push({text: $(this).text(), images: $(this).find("img").attr("src")});
                            });
                            if (choices.length < 2) {
                                gInterface.showError("Need minimum 2 choices to create a poll.");
                            } else {
                                socketModule.sendQuestion(title, question, images, choices);
                            }
                        } else {
                            socketModule.sendQuestion(title, question, images);
                        }
                        $("#questionFormModal").modal("hide");
                        $questionInput.val("");
                        $titleInput.val("");
                        $pollChoiceList.html("");
                        $(this).find("input[type='checkbox']").prop('checked', false);
                        let $pollSection = $(".pollSection");
                        if (!$pollSection.is(":visible")) $pollSection.toggle();
                        $pollSection.toggle();
                        self.initAutoComplete();
                    });
                })
                .on("click", ".removeChoiceButton", function (e) {
                    e.preventDefault();
                    $(e.target).closest(".list-group-item").remove();
                });
            $('.modal')
                .on('hidden.bs.modal', function (e) {
                    $('.formText').val("");
                    $('.pasteImage').html("");
                    images = [];
                })
                .on("shown.bs.modal", function (e) {
                    $(this).find("input").first().focus();
                });
            $("#answer_form").on("submit", function (e) {
                e.preventDefault();
                isAuthenticated().then(() => {
                    let $answerInput = $(e.target).find("#answer");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.sendAnswer($threadIdInput.val(), $answerInput.val(), images);
                    $("#answerFormModal").modal("hide");
                    let $answers = $("#threads").find(".thread[data-thread-id='" + $threadIdInput.val() + "']").find(".answers");
                    if (!$answers.is(":visible")) $answers.toggle();
                    $answerInput.val("");
                    $threadIdInput.val("");
                });
            });
            $("#alias_form").on("submit", function (e) {
                $("#aliasFormModal").modal("hide");
                e.preventDefault();
                name = $(e.target).find("input[name='alias']").val();
                $.post("/edit-alias", {
                        new_name: name
                    },
                    function (data, status) {
                    })
                    .done(function (response) {
                        window.location.reload();
                    })
            });
            $("#comment_form").on("submit", function (e) {
                e.preventDefault();
                isAuthenticated().then(() => {
                    let $commentInput = $(e.target).find("input[name='comment']");
                    let $answerIdInput = $(e.target).find("input[name='answerId']");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.sendComment(
                        $threadIdInput.val(),
                        $answerIdInput.val(),
                        $commentInput.val()
                    );
                    $("#commentFormModal").modal("hide");
                    $commentInput.val("");
                    $threadIdInput.val("");
                    $answerIdInput.val("");
                });
            });
            $("#tag_form").on("submit", function (e) {
                e.preventDefault();
                isAuthenticated().then(() => {
                    let $tagInput = $(e.target).find("input[name='tag']");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.addTag(
                        $threadIdInput.val(),
                        $tagInput.val()
                    );
                    $("#tagFormModal").modal("hide");
                    $threadIdInput.val("");
                    $tagInput.val("");
                    self.initAutoComplete();
                });
            });
            $("#threads")
                .on("click", ".answerButton", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let $currentThread = $(e.target).closest(".thread");
                        let threadId = $currentThread.attr("data-thread-id");
                        let threadQuestion = $currentThread.find(".question").text();
                        let $answerFormModal = $("#answerFormModal");
                        $answerFormModal.find("input[name='threadId']").attr("value", threadId);
                        $answerFormModal.find(".threadQuestion").text(threadQuestion);
                        $answerFormModal.modal("show");
                    });
                })
                .on("click", ".answersVisibilityToggler", function (e) {
                    e.preventDefault();
                    $(e.target)
                        .closest("a")
                        .find(".fa")
                        .toggleClass("fa-caret-down")
                        .toggleClass("fa-caret-up");
                    $(e.target)
                        .closest(".card-body")
                        .find(".answers")
                        .toggle();
                })
                .on("click", ".commentsVisibilityToggler", function (e) {
                    e.preventDefault();
                    $(e.target)
                        .closest("a")
                        .find(".fa")
                        .toggleClass("fa-caret-down")
                        .toggleClass("fa-caret-up");
                    $(e.target)
                        .closest(".answer")
                        .find(".comments")
                        .toggle();
                })
                .on("click", ".commentButton", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let $currentThread = $(e.target).closest(".thread");
                        let $currentAnswer = $(e.target).closest(".answer");
                        let threadId = $currentThread.attr("data-thread-id");
                        let answerId = $currentAnswer.attr("data-answer-id");
                        $("input[name='threadId']").attr("value", threadId);
                        $("input[name='answerId']").attr("value", answerId);
                        let answer = $currentAnswer.find(".answerText").text();
                        let $commentFormModal = $("#commentFormModal");
                        $commentFormModal.find(".threadAnswer").text(answer);
                        $commentFormModal.modal("show");
                    });
                })
                .on("click", ".threadUpVoteBtn", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let threadId = $(e.target)
                            .closest(".thread")
                            .attr("data-thread-id");
                        socketModule.upVoteThread(threadId);
                    });
                })
                .on("click", ".threadDownVoteBtn", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let threadId = $(e.target)
                            .closest(".thread")
                            .attr("data-thread-id");
                        socketModule.downVoteThread(threadId);
                    });
                })
                .on("click", ".answerUpVoteBtn", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let answerId = $(e.target)
                            .closest(".answer")
                            .attr("data-answer-id");
                        socketModule.upVoteAnswer(answerId);
                    });
                })
                .on("click", ".answerDownVoteBtn", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let answerId = $(e.target)
                            .closest(".answer")
                            .attr("data-answer-id");
                        socketModule.downVoteAnswer(answerId);
                    });
                })
                .on("click", ".deleteThreadBtn", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").tooltip('dispose');
                    let threadId = $(e.target)
                        .closest(".thread")
                        .attr("data-thread-id");
                    socketModule.deleteThread(threadId);
                })
                .on("click", ".deleteAnswerBtn", function (e) {
                    e.preventDefault();
                    $(e.target).closest("a").tooltip('dispose');
                    let $answer = $(e.target).closest(".answer");
                    let answerId = $answer.attr("data-answer-id");
                    let threadId = $answer.closest(".thread").attr("data-thread-id");
                    socketModule.deleteAnswer(answerId, threadId);
                })
                .on("click", ".approveAnswerBtn", function (e) {
                    e.preventDefault();
                    let answerId = $(e.target)
                        .closest(".answer")
                        .attr("data-answer-id");
                    socketModule.toggleAnswerApproved(answerId);
                })
                .on("click", ".addTagBtn", function (e) {
                    e.preventDefault();
                    isAuthenticated().then(() => {
                        let $currentThread = $(e.target).closest(".thread");
                        let threadId = $currentThread.attr("data-thread-id");
                        let threadQuestion = $currentThread.find(".question").text();
                        let $tagFormModal = $("#tagFormModal");
                        $tagFormModal.find("input[name='threadId']").attr("value", threadId);
                        $tagFormModal.find(".threadQuestion").text(threadQuestion);
                        $tagFormModal.modal("show");
                    });
                })
                .on('click', 'img', function (event) {
                    let $image = $(this).attr('src');
                    let $imageModal = $("#imageModal");
                    $imageModal.find("img").html("");
                    $imageModal.find("img").attr("src", $image);
                    $imageModal.modal("show");
                });
            $("#askbutton").on("click", function (e) {
                e.preventDefault();
                isAuthenticated().then(() => {
                    let $questionFormModal = $("#questionFormModal");
                    let $input = $questionFormModal.find("input[name='title']");
                    if (tag) $input.val("#" + tag);
                    $questionFormModal.modal("show");
                });
            });
            $("#search_threads_on_tag_form").on("submit", function (e) {
                e.preventDefault();
                window.location.href = "/tag/" + $(e.target).find('input[name="tag"]').val();
            });
            $("#addChoiceBtn").on("click", function (e) {
                e.preventDefault();
                let $choice = $(e.target).closest(".pollSection").find("textarea[name='choice']");
                $("#pollChoices").append('<li class="list-group-item list-group-action"><div class="row"><div class="col choiceContent">' + htmlEntities($choice.val()).replace("''", "<pre><code>").replace("'''", "</pre></code>") + '</div>' +
                    '<div class="col-1"><a href="#" class="removeChoiceButton"><i class="fa fa-times"></i></a></div></div></li>');
                $choice.val("");
            });
            $("textarea[name='choice']").pastableTextarea()
                .on("pasteImage", function (e, data) {
                    $("#pollChoices").append('<li class="list-group-item list-group-action"><div class="row"><div class="col choiceContent"><img class="img-fluid" src="' + data.dataURL + '"></div>' +
                        '<div class="col-1"><a href="#" class="removeChoiceButton"><i class="fa fa-times"></i></a></div></div></li>');
                })
                .on('pasteImageError', function (ev, data) {
                    gInterface.showError("Failed to paste image");
                });
            $("#pollCheckBox").on("change", function () {
                $(".pollSection").toggle();
            });
            $('.pasteableTextArea').pastableTextarea()
                .on('pasteImage', function (ev, data) {
                    $('.pasteImage').prepend('<img class="img-fluid" src="' + data.dataURL + '">');
                    let image = data.dataURL;
                    images.push(image);
                })
                .on('pasteImageError', function (ev, data) {
                    gInterface.showError("Failed to paste image");
                });
            $('#btn-alias').on('click', function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) $("#aliasFormModal").modal("show");
                else askToLogin();
            });
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
            let $affectedThread = $("#threads").find(
                ".thread[data-thread-id='" + threadId + "']"
            );
            $affectedThread.find(".amountAnswers").text(amountAnswersOnThread);
            let $answers = $affectedThread.find(".answers");
            $answers.prepend(answerHTML);
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
            $("#threads").find(".thread[data-thread-id='" + threadId + "']").find(".threadVotes").text(votes);
        },
        updateAnswerVotes: function (answerId, votes) {
            $("#threads").find(".answer[data-answer-id='" + answerId + "']").find(".answerVotes").text(votes);
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
        setAnswerApproved: function (answerId, threadId, isSolved) {
            let $affectedThread = $("#threads").find(".thread[data-thread-id='" + threadId + "']");
            let $solvedSpan = $affectedThread.find(".solvedText");
            if (isSolved) $solvedSpan.show();
            else $solvedSpan.hide();
            $(".answer[data-answer-id='" + answerId + "'] > div:first-child")
                .toggleClass("bg-success");
        },
        initAutoComplete: function () {
            $.get("/gettags")
                .done(function (data) {
                    $("#question").atwho({
                        at: "#",
                        data: data
                    });
                    $("form#open_class").find("input[name='tag']").atwho({
                        data: data
                    });
                })
                .fail(function (error) {
                    console.log(error);
                });
        },
        addTagToThread: function (threadId, tagHTML) {
            let $tags = $("#threads").find(".thread[data-thread-id='" + threadId + "']").find(".tags");
            let $addTagBtn = $tags.find(".addTagBtn");
            $addTagBtn.remove();
            $tags.append(tagHTML);
            $tags.append($addTagBtn);
        }
    };
})();

$(document).ready(function () {
    gInterface.bindEvents();
    gInterface.initAutoComplete();
});