"use strict";

const http = require("http")
const url = require("url")
const path = require("path")
const fs = require("fs")
const processOrders = require("./processors/orders")

const port = 3000
const frontendPath = path.join(process.cwd(), 'frontend')

processOrders.listen()

http.createServer((request, response) => {
    const uri = url.parse(request.url).pathname
    let filename = path.join(frontendPath, uri)

    const render_err = (status, content) => {
        response.writeHead(status, {"Content-Type": "text/plain"})
        response.write(content)
        response.end()
    }

    fs.exists(filename, (exists) => {
        if (!exists) return render_err(404, "404 Not Found")
        if (fs.statSync(filename).isDirectory()) filename += 'index.html'
        fs.readFile(filename, "binary", (err, file) => {
            if (err) return render_err(500, err)
            response.writeHead(200)
            response.write(file, "binary")
            response.end()
        })
    })
}).listen(port)

console.log("Server listening on http://localhost:" + port)
