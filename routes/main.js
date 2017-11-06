"use strict";

const router = require("express").Router();
const Thread = require("./../models/thread");

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
    })
    
    router.get('/thread/:tag',function(req,res){
       
            
           
            Thread.find({tags:req.params.tag}).then(function(threads){

                console.log(threads);
          res.render('index',threads);
            
        });
        
    
    }
    
    )


module.exports = router;