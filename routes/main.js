"use strict";

const router = require("express").Router();

const Thread = require("../models/thread");

/**
 * TODO implement pagination
 * more info @
 * http://madhums.me/2012/08/20/pagination-using-mongoose-express-and-jade/
 * https://stackoverflow.com/questions/5539955/how-to-paginate-with-mongoose-in-node-js
 */

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