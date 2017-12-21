const Thread = require("./thread");
const Answer = require("./answer");
const Comment = require("./comment");
const User = require("./user");
const Spammer = require('./../mail');
const sanitizer = require("sanitizer");
const GLOBAL = require("./../global-vars");

const processTitleAndTags = function (t) {
    let object = {
        title: "",
        tags: []
    };
    let splitQuestion = t.split("#");
    object.title = sanitizer.escape(splitQuestion[0]);
    for (let i = 1; i < splitQuestion.length; i++) {
        object.tags.push(sanitizer.escape(splitQuestion[i].trim()));
    }
    return object;
};

String.prototype.replaceAll = function(search, replacement) {
    let target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports = {
    /**
     * Removes the thread together with its answers and comments
     * @param id of thread to remove
     * @returns {Promise} rejects with error, resolves with the removed thread
     */
    deleteThreadById: function (id) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: id}).then((threadToRemove) => {
                threadToRemove.remove().then(resolve(threadToRemove)).catch(err => {
                    console.error(err);
                    reject("Failed to remove thread: " + id);
                })
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + id);
            })
        });
    },

    /**
     * Removes the answer together with its comments
     * @param id of answer to remove
     * @returns {Promise} rejects with error, resolves with the removed answer
     */
    deleteAnswerById: function (id) {
        return new Promise(function (resolve, reject) {
            Answer.findOne({_id: id}).then((answerToRemove) => {
                answerToRemove.remove().then(resolve(answerToRemove)).catch(err => {
                    console.error(err);
                    reject("Failed to remove answer: " + id);
                })
            }).catch(err => {
                console.error(err);
                reject("Failed to find answer: " + id);
            })
        });
    },

    /**
     * @param threadId, id of thread to up vote
     * @param userId, id of user that is voting
     * @returns {Promise} rejects with error, resolves with the up voted thread
     */
    upVoteThreadById: function (threadId, userId) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: threadId}).populate('author').exec().then(threadToUpVote => {
                User.findOne({_id: threadToUpVote.author._id}).then(user => {
                    user.setCredits(user.credits + GLOBAL.SCORE_VOTE);
                });
                threadToUpVote.upVote(userId).then(() => {
                    threadToUpVote.save().then(savedThread => {
                        resolve(savedThread);
                    }).catch(err => {
                        console.error(err);
                        reject("An error occurred");
                    });
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + threadId);
            });
        });
    },

    /**
     * @param threadId, id of thread to down vote
     * @param userId, id of user that is voting
     * @returns {Promise} rejects with error, resolves with the down voted thread
     */
    downVoteThreadById: function (threadId, userId) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: threadId}).populate('author').exec().then(threadToDownVote => {
                User.findOne({_id: threadToDownVote.author._id}).then(user => {
                    user.setCredits(user.credits - GLOBAL.SCORE_VOTE);
                });
                threadToDownVote.downVote(userId).then(() => {
                    threadToDownVote.save().then(savedThread => {
                        resolve(savedThread);
                    }).catch(err => {
                        console.error(err);
                        reject("An error occurred");
                    });
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + threadId);
            });
        });
    },

    /**
     * Add a new thread or poll to database, also sends an email to subscribed tag users
     * @param title
     * @param question
     * @param userId of author
     * @param images
     * @param choices
     * @returns {Promise} rejects with error, resolves with the added thread
     */
    addThreadOrPoll: function (title, question, userId, images, choices) {
        let titleAndTagsObject = processTitleAndTags(title);
        Spammer.sendMail(titleAndTagsObject.tags);
        let saveAndFinish = function (resolve, reject, thread) {
            thread.save().then(savedThread => {
                savedThread.populate("answers").execPopulate().then(populatedThread => {
                    resolve(populatedThread);
                }).catch(err => {
                    return err;
                });
            }).catch(err => {
                reject(err.message);
            });
        };
        return new Promise(function (resolve, reject) {
            let thread = new Thread({
                title: titleAndTagsObject.title,
                question: question.replaceAll("'''", "</pre></code>").replaceAll("''", "<pre><code>").replaceAll("\\n", '<br />'),
                author: userId,
                tags: titleAndTagsObject.tags,
                images: images
            });
            if (choices) {
                if (choices.length > 1) {
                    thread.isPoll = true;
                    let answerChoices = [];
                    choices.forEach(choice => {
                        answerChoices.push(
                            new Answer({
                                answer: sanitizer.escape(choice.text),
                                author: userId,
                                onThread: thread._id,
                                images: sanitizer.escape(choice.images)
                            })
                        );
                    });
                    Answer.insertMany(answerChoices).then(savedAnswersChoices => {
                        savedAnswersChoices.forEach(answerChoice => {
                            thread.answers.push(answerChoice._id);
                        });
                        saveAndFinish(resolve, reject, thread);
                    }).catch(err => {
                        console.error(err);
                        reject("Failed to save answer.");
                    })
                } else {
                    reject("A poll needs minimum 2 choices");
                }
            } else {
                saveAndFinish(resolve, reject, thread);
            }
        });
    },

    /**
     * Add a new answer to database
     * @param threadId
     * @param answerText
     * @param userId of author
     * @param images
     * @returns {Promise} rejects with error, resolves with the added answer
     */
    addAnswer: function (threadId, answerText, userId, images) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: threadId}).then(thread => {
                if (thread) {
                    if (!thread.isPoll) {
                        let answer = new Answer({
                            answer: answerText.replaceAll("'''", "</pre></code>").replaceAll("''", "<pre><code>").replaceAll("\\n", '<br />'),
                            author: userId,
                            onThread: thread._id,
                            images: images
                        });
                        answer.save().then(savedAnswer => {
                            thread.answers.push(savedAnswer._id);
                            thread.save().then(() => {
                                savedAnswer.populate("onThread author").execPopulate().then(populatedAnswer => {
                                    resolve(populatedAnswer);
                                }).catch(err => {
                                    return err;
                                });
                            }).catch(err => {
                                reject(err.message);
                            });
                        }).catch(err => {
                            console.error(err);
                            reject("An error occurred");
                        });
                    } else {
                        reject("Can't add answers to polls");
                    }
                } else {
                    reject("Thread (" + threadId + ") does not exist");
                }
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + threadId);
            });
        });
    },

    /**
     * Add a new comment to database
     * @param threadId
     * @param answerId
     * @param commentText
     * @param userId
     * @returns {Promise} rejects with error, resolves with the added comment
     */
    addComment: function (threadId, answerId, commentText, userId) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: threadId}).then(thread => {
                if (thread) {
                    Answer.findOne({_id: answerId}).then(answer => {
                        if (answer) {
                            let comment = new Comment({
                                comment: commentText,
                                author: userId,
                                onAnswer: answerId
                            });
                            comment.save().then(savedComment => {
                                answer.comments.push(savedComment._id);
                                answer.save().then(() => {
                                    savedComment.populate("onAnswer author").execPopulate().then(populatedComment => {
                                        resolve(populatedComment);
                                    }).catch(err => {
                                        return err;
                                    })
                                }).catch(err => {
                                    return err;
                                });
                            }).catch(err => {
                                reject(err.message);
                            });
                        } else {
                            reject("Answer (" + answerId + ") does not exist");
                        }
                    }).catch(err => {
                        console.error(err);
                        reject("Failed to find answer: " + answerId);
                    });
                } else {
                    reject("Thread (" + threadId + ") does not exist");
                }
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + threadId);
            });
        });
    },

    /**
     * toggles the approved state of an answer
     * @param answerId
     * @returns {Promise} rejects with error, resolves with the affected answer
     */
    toggleAnswerApproved: function (answerId) {
        return new Promise(function (resolve, reject) {
            Answer.findOne({_id: answerId}).then(answer => {
                answer.toggleIsApprovedAndSave().then(savedAnswer => {
                    User.findOne({_id: answer.author}).then(function (user) {
                        if (savedAnswer.isApproved) {
                            user.setCredits(user.credits + GLOBAL.SCORE_APPROVE);
                        } else {
                            user.setCredits(user.credits - GLOBAL.SCORE_APPROVE);
                        }
                    });
                    savedAnswer.populate("onThread author").execPopulate().then(populatedAnswer => {
                        resolve(populatedAnswer);
                    }).catch(err => {
                        return err;
                    });
                }).catch(err => {
                    console.error(err);
                    reject("An error occurred");
                });
            }).catch(err => {
                console.error(err);
                reject("Failed to find answer: " + answerId);
            });
        });
    },

    /**
     * Search for threads by tag
     * @param tag
     * @returns {Promise} rejects with error, resolves with the found threads
     */
    findThreadsByTag: function (tag) {
        return new Promise(function (resolve, reject) {
            Thread.find({tags: tag}).populate({
                path: "answers",
                populate: {
                    path: "comments",
                    model: "Comment"
                }
            }).then(threads => {
                resolve(threads);
            }).catch(err => {
                console.error(err);
                reject("Failed to find threads by tag: " + tag);
            });
        })
    },

    /**
     * Add a tag to a thread
     * @param threadId
     * @param tag
     * @returns {Promise} rejects with error, resolves with the affected thread
     */
    addTag: function (threadId, tag) {
        return new Promise(function (resolve, reject) {
            Thread.findOne({_id: threadId}).then(thread => {
                if(!thread.tags.includes(tag)){
                    thread.tags.push(tag);
                    thread.save().then(savedThread => {
                        savedThread.populate({
                            path: "answers",
                            populate: {
                                path: "comments",
                                model: "Comment"
                            }
                        }).execPopulate().then(populatedThread => {
                            resolve(populatedThread);
                        }).catch(err => {
                            return err;
                        });
                    }).catch(err => {
                        console.error(err);
                        reject("An error occurred");
                    })
                }
            }).catch(err => {
                console.error(err);
                reject("Failed to find thread: " + threadId);
            });
        });
    },

    /**
     * @param answerId, id of answer to down vote
     * @param userId, id of user that is voting
     * @returns {Promise} rejects with error, resolves with the affected answer
     */
    downVoteAnswerById: function (answerId, userId) {
        let downVoteAndFinish = function (resolve, reject, answer) {
            answer.downVote(userId).then(() => {
                answer.save().then(savedAnswer => {
                    resolve(savedAnswer);
                }).catch(err => {
                    console.error(err);
                    reject("An error occurred");
                });
            }).catch(err => {
                reject(err);
            });
        };
        return new Promise(function (resolve, reject) {
            Answer.findOne({_id: answerId}).populate('author onThread').exec().then(answerToDownVote => {
                User.findOne({_id: answerToDownVote.author._id}).then(user => {
                    user.setCredits(user.credits + GLOBAL.SCORE_VOTE);
                });
                if(answerToDownVote.onThread.isPoll){
                    if(answerToDownVote.onThread.hasVoted(userId)){
                        reject("You have already voted on this poll");
                    } else {
                        answerToDownVote.onThread.votedUIDs.push(userId);
                        answerToDownVote.onThread.save().then(thread => {
                            answerToDownVote.onThread = thread;
                            downVoteAndFinish(resolve, reject, answerToDownVote);
                        }).catch(err => {
                            console.error(err);
                            reject("An error occurred");
                        })
                    }
                } else {
                    downVoteAndFinish(resolve, reject, answerToDownVote);
                }
            }).catch(err => {
                console.error(err);
                reject("Failed to find answer: " + answerId);
            });
        });
    },

    /**
     * @param answerId, id of answer to up vote
     * @param userId, id of user that is voting
     * @returns {Promise} rejects with error, resolves with the affected answer
     */
    upVoteAnswerById: function (answerId, userId) {
        let upVoteAndFinish = function(resolve, reject, answer){
            answer.upVote(userId).then(() => {
                answer.save().then(savedAnswer => {
                    resolve(savedAnswer);
                }).catch(err => {
                    console.error(err);
                    reject("An error occurred");
                });
            }).catch(err => {
                reject(err);
            })
        };
        return new Promise(function (resolve, reject) {
            Answer.findOne({_id: answerId}).populate('author onThread').exec().then(answerToUpVote => {
                User.findOne({_id: answerToUpVote.author._id}).then(user => {
                    user.setCredits(user.credits + GLOBAL.SCORE_VOTE);
                });
                if(answerToUpVote.onThread.isPoll){
                    if(answerToUpVote.onThread.hasVoted(userId)){
                        reject("You have already voted on this poll");
                    } else {
                        answerToUpVote.onThread.votedUIDs.push(userId);
                        answerToUpVote.onThread.save().then(thread => {
                            answerToUpVote.onThread = thread;
                            upVoteAndFinish(resolve, reject, answerToUpVote);
                        }).catch(err => {
                            console.error(err);
                            reject("An error occurred");
                        })
                    }
                } else {
                    upVoteAndFinish(resolve, reject, answerToUpVote);
                }
            }).catch(err => {
                console.error(err);
                reject("Failed to find answer: " + answerId);
            });
        });
    },
};