var http = require('http'),
    express = require('express'),
    app = express(),
    sqlite3 = require('sqlite3').verbose(),
    db = new sqlite3.Database('cozy'),
    fs = require('fs'),
    url = require('url'),
    exec = require('child_process').exec,
    spawn = require("child_process").spawn;

var mirror_url = "http://thetvdb.com/api/54B5B2E411F0FC20/mirrors.xml";
var server_time = "http://thetvdb.com/api/Updates.php?type=none";
var serie = "http://thetvdb.com/api/GetSeries.php?seriesname=Game Of Thrones";

var DOWNLOAD_DIR = "downloads/";

var mkdir = 'mkdir downloads';
var child = exec(mkdir, function(err,stdout,stderr){
    if(err !== null) {
        console.log(err);
    }
    else {
        download_file_httpget(mirror_url);
        download_file_httpget(serie);
        download_httpget(server_time);
    }
});

var download_httpget = function(file_url){
    var options = {
        host: url.parse(file_url,true).host,
        port: 80,
        path: url.parse(file_url,true).pathname,
        query: url.parse(file_url,true).query
    };

    var file_name = url.parse(file_url,true).pathname.split('/').pop();
    var downloaded_file = fs.createWriteStream(DOWNLOAD_DIR + file_name);

    http.get(options, function(res)
    {
        var buff= new Buffer(0);
        res.on('data', function(data){
            buff = Buffer.concat([buff,data], buff.length + data.length);
        });

        res.on('end', function(){
            downloaded_file.write(buff.toString('utf8'));
            downloaded_file.end();
        });

        res.on('error', function(e){
            console.error(e);
        });
    });

}

var download_file_httpget = function(file_url){
    var options = {
        host: url.parse(file_url).host,
        port: 80,
        path: url.parse(file_url).pathname
    };
    var file_name = url.parse(file_url).pathname.split('/').pop();
    var file = fs.createWriteStream(DOWNLOAD_DIR + file_name);

    http.get(options, function(res){
        res.on('data',function(data){
            console.log(data);
            file.write(data);
        }).on('end',function(){
            file.end();
            console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);
        });
    });
};
/* We add configure directive to tell express to use Jade to
   render templates */
app.configure(function() {
    app.set('views', __dirname + '/public');
    app.engine('.html', require('jade').__express);

    // Allows express to get data from POST requests
    app.use(express.bodyParser());
});

// Database initialization
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'", function(err, row) {
    if(err !== null) {
        console.log(err);
    }
    else if(row == null) {
        db.run('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "title" VARCHAR(255), url VARCHAR(255))', function(err) {
            if(err !== null) {
                console.log(err);
            }
            else {
                console.log("SQL Table 'bookmarks' initialized.");
            }
        });
    }
    else {
        console.log("SQL Table 'bookmarks' already initialized.");
    }
});

// We render the templates with the data
app.get('/', function(req, res) {

    db.all('SELECT * FROM bookmarks ORDER BY title', function(err, row) {
        if(err !== null) {
            res.send(500, "An error has occurred -- " + err);
        }
        else {
            res.render('index.jade', {bookmarks: row}, function(err, html) {
                res.send(200, html);
            });
        }
    });
});

// We define a new route that will handle bookmark creation
app.post('/add', function(req, res) {
    title = req.body.title;
    url = req.body.url;
    sqlRequest = "INSERT INTO 'bookmarks' (title, url) VALUES('" + title + "', '" + url + "')"
    db.run(sqlRequest, function(err) {
        if(err !== null) {
            res.send(500, "An error has occurred -- " + err);
        }
        else {
            res.redirect('back');
        }
    });
});

// We define another route that will handle bookmark deletion
app.get('/delete/:id', function(req, res) {
    db.run("DELETE FROM bookmarks WHERE id='" + req.params.id + "'", function(err) {
        if(err !== null) {
            res.send(500, "An error has occurred -- " + err);
        }
        else {
            res.redirect('back');
        }
    });
});

/* This will allow Cozy to run your app smoothly but
 it won't break other execution environment */
var port = process.env.PORT || 9250;
var host = process.env.HOST || "127.0.0.1";

// Starts the server itself
var server = http.createServer(app).listen(port, host, function() {
    console.log("Server listening to %s:%d within %s environment",
                host, port, app.get('env'));
});
