var http = require('http'),
    sqlite3 = require('sqlite3').verbose(),
    db = new sqlite3.Database('cozy'),
    xml2js = require('xml2js'),
    async = require('async'),
    superagent = require('superagent'),
    Event = require('./build/server/models/event');

    // URL pour vérifier la création des évènements : http://localhost:5984/_utils/database.html?cozy/_all_docs
    // URL pour récupérer les banières
    // var banieres = "http://thetvdb.com/api/54B5B2E411F0FC20/series/121361/banners.xml"
    //URL pour une banière
    //var image = "http://thetvdb.com/banners/"+bannerPath récupéré dans le fichier banière.xml

var tableau_dynamique = process.argv;
tableau_dynamique.shift();
tableau_dynamique.shift();
for(var series_name in tableau_dynamique){
    var serie_id = "";
    var url_serie = "http://thetvdb.com/api/GetSeries.php?seriesname="+series_name;
    var base_information = "";
}

var recup_all = function(url,callback){
    var request = superagent.get(url);
    request.buffer();
    request.type('xml');
    request.end(function(err,res) {
        if(res.ok){
            if (url.indexOf("http://thetvdb.com/api/GetSeries.php") > -1){
                recup_serie_id(res,callback);
            }
            else if(url.indexOf("http://thetvdb.com/api/54B5B2E411F0FC20/series") > -1){
                recup_episodes(res,callback);
            }
        }
    });
}

var recup_serie_id = function(res,callback){
    var parser = new xml2js.Parser();
    parser.parseString(res.text, function (err, result){
        for(var Data in result){
           //series représente le deuxième niveau, Séries et Episodes
           for(var series in result[Data]){
               if (series=='Series'){
                   for(var temp in (result[Data])[series]){
                       for(var temporary in (((result[Data])[series])[temp])['seriesid']){
                           //console.log(((((result[Data])[series])[temp])['id'])[temporary]);
                           serie_id = ((((result[Data])[series])[temp])['seriesid'])[temporary];
                           base_information = "http://thetvdb.com/api/54B5B2E411F0FC20/series/"+serie_id+"/all";
                           recup_all(base_information,callback);
                       }
                   }
               }
           }
        }
    });
}

var recup_episodes = function(res,callback){
    var parser = new xml2js.Parser();
    parser.parseString(res.text, function (err, result){
    //On va descendre dans l'arborescence du fichier XML et récupérer les informations pour chaque épisode
    //Chaque nouvelle boucle correspond à une descente d'un niveau dans l'arborescence du fichier XML
    //Data représente le premier niveau du fichier XML, à savoir <Data></Data> qui englobe le reste
    var episodes = recup_episodes_tableau(result);
    var episodes_details = recup_episodes_details(episodes);
    var processor = function(rawEvent, next) {
    // récupérer l'événement (s'il existe)
    // s'il existe, le mettre à jour (si nécessaire)
    // sinon, le créer
        Event.find(rawEvent['_id'], function(err, event) {
            if (err || !event) {
                Event.create(rawEvent, function(err, event) {
                    next();
                });
            } else {
                if(event['lastModification'] != rawEvent['lastModification']){
                    rawEvent['created'] = event['created'];
                    event.updateAttributes(rawEvent,function(err,event){
                        next();
                    });
                }
            }
        });
    }
    async.eachSeries(episodes_details,processor,function(err){
        console.log('events created');
        callback();
    });
});
}

var recup_episodes_tableau = function(result){
    var episodes = [];
    for(var Data in result){
       //series représente le deuxième niveau, Séries et Episodes
       for(var series in result[Data]){
           if (series=='Episode'){
               for(var temp in (result[Data])[series]){
                   episodes.push(((result[Data])[series])[temp]);
               }
           }
       }
    }
    return episodes;
}

var recup_episodes_details = function(episodes){
    var rawEvents = [];
    //console.log("Objet : "+ episodes);
    for(var id in episodes){
        for(var temp in (episodes[id])['id']){
            var EpisodeID = ((episodes[id])['id'])[temp];
        }
        //console.log("Attributs : " + episodes[id]);
        //on initialise les variables pour chaque episode
        for(var temp in (episodes[id])["FirstAired"]){
            var start = ((episodes[id])["FirstAired"])[temp];
        }
        var temp = new Date(((episodes[id])["FirstAired"]));
        temp.setTime(temp.getTime()+86400000);
        var end = (temp.toISOString().split('T'))[0];
        for(var temp in (episodes[id])["Overview"]){
            var details = ((episodes[id])["Overview"])[temp];
        }
        var lastModification  = new Date().toISOString();
        for(var temp in (episodes[id])["Combined_episodenumber"]){
            var EpisodeNumber = ((episodes[id])["Combined_episodenumber"])[temp];
        }
        for(var temp in (episodes[id])["Combined_season"]){
            var EpisodeSeason = ((episodes[id])["Combined_season"])[temp];
        }
        for(var temp in (episodes[id])["EpisodeName"]){
            var EpisodeName = ((episodes[id])["EpisodeName"])[temp];
        }
        //On crée ici la chaine de caractères JSON contenant les attributs récupérés dans l'épisode XML, on crée l'objet JSON correspondant puis on recommence ainsi pour chaque épisode
        var rawEvent = {"_id": EpisodeID,"start" : start,"end" : end, "place" : "", "details" : details, "description" : "Episode numéro "+ EpisodeNumber + " de la saison "+EpisodeSeason+", nommé "+EpisodeName, "tags" : ["default calendar"], "alarms" : [], "created" : lastModification, "lastModification" : lastModification, "readOnly" : "1"};
        rawEvents.push(rawEvent);
    }
    return rawEvents;
}

if(serie == undefined || serie == null || serie == ''){
    console.log("Paramètre non passé !");
}
else{
    var recup_all_every_24h = function() {
        recup_all(url_serie, function() {
            console.log('terminé');
            setTimeout(recup_all_every_24h, 1000*60*60*24);
        });
    }
    recup_all_every_24h();
}
