"use strict";

const router = require("express").Router();
const sanitizer = require("sanitizer");
const pug = require("pug");

const Thread = require("./../models/thread");

const functions = {
    getAllThreads: function (req, res, next) {
        Thread.find(function (err, threads) {
            if (err) return next(err); //Error wil get caught by error handler middleware
            else {
                let threadsHTML = [];
                Thread.find().sort("-creationDate").populate("answers").exec((err, threadss) => {
                    threads.forEach(thread => {
                        let html = pug.renderFile("views/partials/thread.pug", {thread: thread});
                        threadsHTML.push(html);
                        res.json(threadsHTML);
                    });
                })
            }
        });
    },
    postNewThread: function (req, res, next) {
        let thread = new Thread({
            question: sanitizer.escape(req.body.question)
        });
        thread.save(function (err, savedThread) {
            if (err) return next(err);
            else res.json(savedThread);
        })
    }
};

router.get('/', function (req, res) {
    res.json({message: 'API Initialized!'});
});


router.route('/threads')
    .post(functions.postNewThread)
    .get(functions.getAllThreads);

module.exports = router;