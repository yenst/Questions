"use strict";

const router = require("express").Router();
const sanitizer = require("sanitizer");

const Thread = require("./../models/thread");

const functions = {
    getAllThreads: function (req, res, next) {
        Thread.find(function (err, threads) {
            if (err) return next(err); //Error wil get caught by error handler middleware
            else res.json(threads);
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