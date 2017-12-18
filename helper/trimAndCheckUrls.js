const trimAndCheckUrls = function (text) {
    text = text.trim();
    let exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    let text1 = text.replace(exp, "<a href='$1'>$1</a>");
    let exp2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    return text1.replace(exp2, '$1<a target="_blank" href="http://$2">$2</a>');
};

module.exports = trimAndCheckUrls;