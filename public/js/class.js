$(document).ready(function () {
    let url = window.location.href.split('/');
    tag = url[4];
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
    }
    let perm = Notification.requestPermission(function(result){
        if(result === 'denied'){

        }else if(result === 'default'){

        }
        console.log("granted")
    });
});