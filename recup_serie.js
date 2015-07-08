var http = require('http'),
    sqlite3 = require('sqlite3').verbose(),
    db = new sqlite3.Database('cozy'),
    fs = require('fs'),
    url = require('url'),
    exec = require('child_process').exec,
    spawn = require("child_process").spawn,
    xml2js = require('xml2js');

var mirror_url = "http://thetvdb.com/api/54B5B2E411F0FC20/mirrors.xml";
var server_time = "http://thetvdb.com/api/Updates.php?type=none";
var serie = "http://thetvdb.com/api/GetSeries.php?seriesname=Game Of Thrones";

var base_information = "http://thetvdb.com/api/54B5B2E411F0FC20/series/121361/all";

// URL pour récupérer les banières
// var banieres = "http://thetvdb.com/api/54B5B2E411F0FC20/series/121361/banners.xml"

//URL pour une banière
//var image = "http://thetvdb.com/banners/"+bannerPath récupéré dans le fichier banière.xml

var DOWNLOAD_DIR = "download/";

var download_all = function(file_url){
    var options = {
        host: url.parse(file_url,true).host,
        port: 80,
        path: url.parse(file_url,true).path
    };
    var file_name = url.parse(file_url,true).pathname.split('/').pop();
    var extension = file_name.split('.').pop();
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
            //xml2js.parseString(buff.toString('utf8'),function(err,result){
            //    console.log(JSON.stringify(result));
            //});
            downloaded_file.end();
            //On prend le fichier téléchargé et on le convertit directement en objets JSON
            var rawJSON = loadXMLDoc(DOWNLOAD_DIR + file_name + extension);
            function loadXMLDoc(filePath) {
            try {
                   var parser = new xml2js.Parser();
                   fs.readFile(filePath, function(err,data){
                       if (err) throw err;
                       parser.parseString(data, function (err, result) {
                           //On va descendre dans l'arborescence du fichier XML et récupérer les informations pour chaque épisode
                           //Chaque nouvelle boucle correspond à une descente d'un niveau dans l'arborescence du fichier XML
                           //Data représente le premier niveau du fichier XML, à savoir <Data></Data> qui englobe le reste
                           for(var Data in result){
                               //series représente le deuxième niveau, Séries et Episodes
                               for(var series in result[Data]){
                                   if (series=='Episode'){
                                       //Pour chaque Episode, on récupére les attributs
                                       for(var id in (result[Data])[series]){
                                           //on initialise les variables pour chaque episode
                                           var start = "test";
                                           var end = "azerty";
                                           var details = "yolo";
                                           var lastModification = "swag";
                                           var EpisodeNumber = "0";
                                           var EpisodeSeason = "0";
                                           var EpisodeName = "0";
                                           var place = "";
                                           var details = "";
                                           var rrule = "";
                                           var tags = "";
                                           var docType = "";
                                           var timezone = "Europe/Paris";
                                           var created = "";
                                           //On récupére ici tout les attributs de l'episode, à savoir ID, dates, numéro de l'épisode, description, etc...
                                           for(var temp in (((result[Data])[series])[id])){
                                               if(temp == 'FirstAired'){
                                                   var start = (((result[Data])[series])[id])[temp];
                                                   var end = (((result[Data])[series])[id])[temp];
                                               }
                                               else if (temp == 'Overview') {
                                                   var details = (((result[Data])[series])[id])[temp];
                                               }
                                               else if (temp == 'lastupdated') {
                                                   var date = new Date((((result[Data])[series])[id])[temp]*1000);
                                                   var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                                   var year = date.getFullYear();
                                                   var month = months[date.getMonth()];
                                                   var new_date = date.getDate();
                                                   var hour = date.getHours();
                                                   var min = date.getMinutes();
                                                   var sec = date.getSeconds();
                                                   var lastModification = today = new Date().toISOString();
                                               }
                                               else if (temp == 'Combined_episodenumber') {
                                                   var EpisodeNumber = (((result[Data])[series])[id])[temp];
                                               }
                                               else if (temp == 'Combined_season') {
                                                   var EpisodeSeason = (((result[Data])[series])[id])[temp];
                                               }
                                               else if (temp == 'EpisodeName') {
                                                   var EpisodeName = (((result[Data])[series])[id])[temp];
                                               }
                                           }
                                           //On crée ici la chaine de caractères JSON contenant les attributs récupérés dans l'épisode XML, on crée l'objet JSON correspondant puis on recommence ainsi pour chaque épisode
                                           var json = JSON.stringify({"start" : start,"end" : end, "place" : place, "details" : details, "description" : "Episode numéro "+ EpisodeNumber + " de la saison "+EpisodeSeason+", nommé "+EpisodeName, "rrule" : "", "tags" : "", "attendees" : "", "related" : "", "timezone" : "", "alarms" : {}, "created" : "", "lastModification" : lastModification, "docType" : docType});
                                           json = JSON.parse(json);
                                           console.log(json);
                                       }
                                   }
                               }
                           }
                       });
                   });
            }
            catch (ex)
            {
                console.log(ex);
            }
            }
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
            //xml2js.parseString(buff.toString('utf8'),function(err,result){
            //    console.log(JSON.stringify(result));
            //});
            downloaded_file.end();
        });

        res.on('error', function(e){
            console.error(e);
        });
    });

}

download_all(base_information);
download_httpget(mirror_url);
download_httpget(serie);
download_httpget(server_time);
