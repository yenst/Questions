/**::::::::
 * Created by siemen on 05/06/2017.
 */
"use strict";
const express = require("express");
const http = require("http");
const io = require("socket.io");

const mongoDB = require("./js/mongo.js").mongoDBModule;

var app = express();

// TODO remove this line if we don't use ejs
app.set('view engine', 'ejs');

app.get('/', function (req, res, next) {
    res.redirect('/questions.html')
});

app.use(express.static('public'));

const httpServer = http.createServer(app);

let serverSocketModule = (function(){
    const serverSocket = io(httpServer);
    let emits = {
        addedNewThread: "newThread",
        addedNewAnswer: "newAnswer"
    };
    let receives = {
        questionSend: "questionSend",
        questionAnswered: "questionAnswered"
    };

    let init = function(){
        serverSocket.on('connection', function(socket){
            console.log("Received connection (" + socket.id + ")");
            socket.on(receives.questionSend, function(data){
                console.log("Question received(" + data.question + ")");
                mongoDB.addThread(data)
                //TODO .catch(err => ...)
                    .then(res => {
                        data.threadId = res.insertedId;
                        socket.emit(emits.addedNewThread, data);
                        socket.broadcast.emit(emits.addedNewThread, data);
                    });
            }).on(receives.questionAnswered, function(data){
                console.log("Question(" + data.threadId + " answered(" + data.answer + ")");
                mongoDB.updateThreadById(data)
                    //TODO .catch(err => ...);
                    .then(() => {
                        socket.emit(emits.addedNewAnswer, data);
                        socket.broadcast.emit(emits.addedNewAnswer, data);
                    });
            });
        });
    };

    return {
        init
    };
})();
serverSocketModule.init();
httpServer.listen(8080, function(){
    console.log("Webserver running at port 8080")
});