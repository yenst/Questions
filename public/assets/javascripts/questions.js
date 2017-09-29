$( function() {

    let socket = io();
    var $askBtn = $("#askBtn");
    var $questions = $("#questions");


    $askBtn.on("click", function(){
        socket.emit('questionSend', $('#input').val());
    });

    socket.on('questionAsked', function(data){
        console.log("questionasked");
        var $li = $("<li>"+data+"</li>" +
            "<input type='text'> " +
            "<button type='button'>Answer</button> " +
            "<ul></ul>"
        );
        $questions.prepend($li);
    });


});