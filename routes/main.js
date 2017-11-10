"use strict";

const router = require("express").Router();
const Thread = require("../models/thread");
const User = require("../models/user");

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
                path: "comments author",
                populate: {
                    path: "author",
                },
            }
        }).sort("-creationDate").then(threads => {
            res.render("index", {
                title: "Home - Questions",
                user: req.user,
                threads: threads,

            });


        }).catch(err => {
            res.render('error', {
                title: err,
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
    })
    .get('/gettags', function (req, res) {
        Thread.distinct('tags', function (error, tags) {
            res.send(tags);
        });

    })
    .get('/newClass/:tag', function (req, res) {
        res.render("class", {
            title: req.params.tag
        });
    });
    // .get('/getcredits', function (req, res) {
    //     (User.findById(req.user.uid), function (user) {
    //         res.send(user.credits);
    //     });
    // });

module.exports = router;