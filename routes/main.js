"use strict";

const router = require("express").Router();

const Thread = require("../models/thread");

router
/**
 * Default Route
 */
    .get("/", function (req, res, next) {
        Thread.find({}).populate({
            path: "answers",
            populate: {
                path: "comments",
                model: "Answer"
            }
        }).exec((err, threads) => {
            if(err) return next(error);
            res.render("index", {
                title: "Home - Questions",
                isAuthenticated: (req.user),
                threads: threads
            });
        });
    })

    /**
     * logout
     */
    .get('/logout', function (req, res) {
        req.logout();
        req.session = null; //Remove session from sessionStore
        res.redirect('/');
    });

module.exports = router;