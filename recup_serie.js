var http = require('http'),
    sqlite3 = require('sqlite3').verbose(),
    db = new sqlite3.Database('cozy'),
    fs = require('fs'),
    url = require('url'),
    exec = require('child_process').exec,
    spawn = require("child_process").spawn,
    xml2js = require('xml2js').parseString;

var mirror_url = "http://thetvdb.com/api/54B5B2E411F0FC20/mirrors.xml";
var server_time = "http://thetvdb.com/api/Updates.php?type=none";
var serie = "http://thetvdb.com/api/GetSeries.php?seriesname=Game Of Thrones";

var base_information = "http://thetvdb.com/api/54B5B2E411F0FC20/series/121361/all";

var DOWNLOAD_DIR = "download/";

var mkdir = 'mkdir download';
var child = exec(mkdir, function(err,stdout,stderr){
    if(err !== null) {
        console.log(err);
    }
    else {
        download_httpget(mirror_url);
        download_httpget(serie);
        download_httpget(server_time);
        download_all(base_information);
    }
});

var download_all = function(file_url){
    var options = {
        host: url.parse(file_url,true).host,
        port: 80,
        path: url.parse(file_url,true).path
    };
    var file_name = url.parse(file_url,true).pathname.split('/').pop();
    console.log(file_name);
    var extension = file_name.split('.').pop();
    console.log(extension);
    if(extension == "" || extension == file_name){
        extension = ".xml"
    }
    var downloaded_file = fs.createWriteStream(DOWNLOAD_DIR + file_name + extension);

    http.get(options, function(res)
    {
        var buff= new Buffer(0);
        res.on('data', function(data){
            buff = Buffer.concat([buff,data], buff.length + data.length);
        });

        res.on('end', function(){
            downloaded_file.write(buff.toString('utf8'));
            xml2js(buff.toString('utf8'),function(err,result){
                console.log(JSON.stringify(result));
            });
            downloaded_file.end();
        });

        res.on('error', function(e){
            console.error(e);
        });
    });

}

var download_httpget = function(file_url){
    var options = {
        host: url.parse(file_url,true).host,
        port: 80,
        path: url.parse(file_url,true).path
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
            xml2js(buff.toString('utf8'),function(err,result){
                console.log(JSON.stringify(result));
            });
            downloaded_file.end();
        });

        res.on('error', function(e){
            console.error(e);
        });
    });

}
