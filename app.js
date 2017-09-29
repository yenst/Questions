/**
 * Created by siemen on 05/06/2017.
 */
const express = require("express");
const http = require("http");
const io = require("socket.io");

var app = express();
app.set('view engine', 'ejs');

app.get('/', function (req, res, next) {
    res.redirect('/questions.html')
});


app.use(express.static('public'));

const httpServer = http.createServer(app);

const serverSocket = io(httpServer);

serverSocket.on('connection', function(socket){
    console.log("received connection");

    socket.on('questionSend', function(data){
        console.log("question Received");
        socket.emit("questionAsked", data);
        socket.broadcast.emit("questionAsked", data);

    });


});
httpServer.listen(8080, function(){
    console.log("Webserver running at port 8080")
});
