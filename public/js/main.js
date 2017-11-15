"use strict";
let tag = null;
let newClass = false;
let images = [];

const gInterface = (function () {
    //TODO use this function with callbacks
    let askToLogin = function () {
        gInterface.showError("Please login to continue.");
    };

    return {
        bindEvents: function () {
            let self = this;
            $("body").tooltip({selector: '[data-toggle="tooltip"]'});
            $("#question_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $questionInput = $(e.target).find("#question");
                    let $question = $questionInput.val();
                    console.log($questionInput.val());
                    if($question === ""){
                        $question=" ";
                    }
                    socketModule.sendQuestion($question,images);
                    $("#questionFormModal").modal("hide");
                    $questionInput.val("");
                } else askToLogin();
            });
            $('.modal').on('hidden.bs.modal', function (e) {
                    $('.formText').val("");
                    $('.pasteImage').html("");
                    images = [];
                    console.log(images)
                });
            $("#answer_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $answerInput = $(e.target).find("#answer");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.sendAnswer($threadIdInput.val(), $answerInput.val(), images);
                    $("#answerFormModal").modal("hide");
                    $answerInput.val("");
                    $threadIdInput.val("");
                } else askToLogin();
            });
            $("#comment_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
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
                } else askToLogin();
            });
            $("#tag_form").on("submit", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) {
                    let $tagInput = $(e.target).find("input[name='tag']");
                    let $threadIdInput = $(e.target).find("input[name='threadId']");
                    socketModule.addTag(
                        $threadIdInput.val(),
                        $tagInput.val()
                    );
                    $("#tagFormModal").modal("hide");
                    $threadIdInput.val("");
                    $tagInput.val("");
                } else askToLogin();
            });
            $("#threads")
                .on("click", ".answerButton", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let $currentThread = $(e.target).closest(".thread");
                        let threadId = $currentThread.attr("data-thread-id");
                        let threadQuestion = $currentThread.find(".question").text();
                        let $answerFormModal = $("#answerFormModal");
                        $answerFormModal.find("input[name='threadId']").attr("value", threadId);
                        $answerFormModal.find(".threadQuestion").text(threadQuestion);
                        $answerFormModal.modal("show");
                    } else askToLogin();
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
                    if (socketModule.isConnected()) {
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
                    } else askToLogin();
                })
                .on("click", ".threadUpVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target)
                            .closest(".thread")
                            .attr("data-thread-id");
                        socketModule.upVoteThread(threadId);
                    } else askToLogin();
                })
                .on("click", ".threadDownVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let threadId = $(e.target)
                            .closest(".thread")
                            .attr("data-thread-id");
                        socketModule.downVoteThread(threadId);
                    } else askToLogin();
                })
                .on("click", ".answerUpVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let answerId = $(e.target)
                            .closest(".answer")
                            .attr("data-answer-id");
                        socketModule.upVoteAnswer(answerId);
                    } else askToLogin();
                })
                .on("click", ".answerDownVoteBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let answerId = $(e.target)
                            .closest(".answer")
                            .attr("data-answer-id");
                        socketModule.downVoteAnswer(answerId);
                    } else askToLogin();
                })
                .on("click", ".deleteThreadBtn", function (e) {
                    e.preventDefault();
                    let threadId = $(e.target)
                        .closest(".thread")
                        .attr("data-thread-id");
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
                    let answerId = $(e.target)
                        .closest(".answer")
                        .attr("data-answer-id");
                    socketModule.toggleAnswerApproved(answerId);
                })
                .on("click", ".addTagBtn", function (e) {
                    e.preventDefault();
                    if (socketModule.isConnected()) {
                        let $currentThread = $(e.target).closest(".thread");
                        let threadId = $currentThread.attr("data-thread-id");
                        let threadQuestion = $currentThread.find(".question").text();
                        let $tagFormModal = $("#tagFormModal");
                        $tagFormModal.find("input[name='threadId']").attr("value", threadId);
                        $tagFormModal.find(".threadQuestion").text(threadQuestion);
                        $tagFormModal.modal("show");
                    } else askToLogin();
                });
            $("#askbutton").on("click", function (e) {
                e.preventDefault();
                if (socketModule.isConnected()) $("#questionFormModal").modal("show");
                else askToLogin();
            });
            $("#search_threads_on_tag_form").on("submit", function (e) {
                e.preventDefault();
                let $tagInput = $(e.target).find('input[name="tag"]');
                socketModule.findThreadsWithTag($tagInput.val());
                $tagInput.val("");
            });
            $('#open_class').on('submit', function (e) {
                e.preventDefault();
                let $tagInput = $(e.target).find('input[name="tag"]');
                let tag = $tagInput.val();
                let newClass = '/newclass/';
                window.location.href = newClass + tag;
            });
            $('.pasteableTextArea').pastableTextarea()
                .on('pasteImage', function (ev, data){
                $('.pasteImage').prepend('<img class="img-fluid" src="'+data.dataURL+'"></img>');
                let image = data.dataURL;
                images.push(image);
            }).on('pasteImageError', function(ev, data){
                alert('Oops: ' + data.message);
                if(data.url){
                    alert('But we got its url anyway:' + data.url)
                }
            }).on('pasteText', function (ev, data){
                console.log("text: " + data.text);
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
            if (!$answers.is(":visible")) $answers.toggle();
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
        autoComplete: function (data) {
            $("#question").atwho({
                at: "#",
                data: data
            });
        },
        initAutoComplete: function () {
            $.get("/gettags", function (data) {
            })
                .done(function (data) {
                    gInterface.autoComplete(data);
                })
                .fail(function (error) {
                    console.log(error);
                });
        },
        getCredits: function(data){
            $.get("/getcredits",function(data){

            }).done(function(data){
                console.log(data);
                gInterface.updateBadge(data);
            });
        },
        addTagToThread: function (threadId, tagHTML) {
            let $tags = $("#threads").find(".thread[data-thread-id='" + threadId + "']").find(".tags");
            let $addTagBtn = $tags.find(".addTagBtn");
            $addTagBtn.remove();
            $tags.append(tagHTML);
            $tags.append($addTagBtn);
        },
        updateBadge: function(credits){
            let color = gInterface.processBadge(credits);
            let html = '<i class="fa fa-trophy fa-2x '+ color+' " aria-hidden="true"></i> <span class="text-light">(' + credits + ')</span>';  
            
            console.log(html);
            $('#credits-header').html(html);
        },

        processBadge: function(credits){
                
                if(credits >=300){return 'badge-gold';}
                if(credits >=150){return 'badge-silver';}
                if(credits >=50){return 'badge-bronze';}
                else{'badge-default';}                
            

        }
    };
})();

$(document).ready(function () {
    gInterface.bindEvents();
    gInterface.initAutoComplete();
    gInterface.getCredits();
});
