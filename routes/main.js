"use strict";

const router = require("express").Router();

router
/**
 * Default Route
 */
    .get("/", function (req, res) {
        res.render("index", {
            title: "Home",
            isAuthenticated: (req.user)
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