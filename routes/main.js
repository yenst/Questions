"use strict";

const router = require("express").Router();

const Thread = require("../models/thread");

router
/**
 * Default Route
 */
    .get("/", function (req, res) {
        Thread.find({}).populate({
            path: "answers",
            populate: {
                path: "comments",
                model: "Comment"
            }
        }).then(threads => {
            res.render("index", {
                title: "Home - Questions",
                user: req.user,
                threads: threads
            });
        }).catch(err => {
            res.render('error', {
                title: error,
                errorMsg: "Unable to load threads."
            })
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