console.log("Starting server!\n");

var http = require('http');

// var fs = require('fs');

// const cypress_env = {
//         ATS_URL: process.env.ATS_URL,
//         ATS_USERNAME: process.env.ATS_USERNAME,
//         ATS_PASSWORD: process.env.ATS_PASSWORD
// }

// fs.readFile('cypress.json', function(err, data) {
//     if (err) {
//         console.log(`unable to open read cypress.json: ${err}`)
//         return;
//     }
//     var json = JSON.parse(data);
//     json['env'] = cypress_env;
//     console.log(`updating cypress.json to ${JSON.stringify(json)}`);
//     fs.writeFile('cypress.json', JSON.stringify(json), (err, data) => {
//         if (err) {
//             console.log(`unable to update cypress.json with env variables: ${err}`)
//         }
//     });
// })

var server = http.createServer(function(request, response) {
    response.write('Hello Cron Job!');
    response.end();
});

server.listen(process.env.PORT || 5000, function() {
    
});