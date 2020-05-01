console.log("Starting server!\n");

var http = require('http');

var server = http.createServer(function(request, response) {
    response.write('Hello Cron Job!');
    response.end();
});

server.listen(process.env.PORT || 5000, function() {
    
});