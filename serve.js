const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");

const processOrders = require("./orders");

const port = 3000;

processOrders(function (err, order) {
    if (err) {
        console.warn("Error processing order: " + err)
    }
    console.log("Processed an order: " + JSON.stringify(order, null, 2))
});

http.createServer(function (request, response) {
    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), uri);

    var render_err = function (status, content) {
        response.writeHead(status, {"Content-Type": "text/plain"});
        response.write(content);
        response.end();
    };

    fs.exists(filename, function (exists) {
        if (!exists) return render_err(404, "404 Not Found");

        if (fs.statSync(filename).isDirectory()) filename += 'index.html';

        fs.readFile(filename, "binary", function (err, file) {
            if (err) return render_err(500, err);

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
}).listen(port);

console.log("Server listening on http://localhost:" + port);
