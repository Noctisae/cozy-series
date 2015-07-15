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

//Fonction chargée de lancer la récupération de chaque série passée en paramètres du script, quelque soit
//le nombre de séries passé en paramètres
var recup_all_series = function(callback){
    var tableau_dynamique = process.argv;
    tableau_dynamique.shift();
    tableau_dynamique.shift();
    for(var series_name in tableau_dynamique){
        var serie_id = "";
        var url_serie = "http://thetvdb.com/api/GetSeries.php?seriesname="+series_name;
        var base_information = "";
        if(series_name == undefined || series_name == null || series_name == ''){
            console.log("Paramètre non passé ou tableau vide !");
        }
        else{
            recup_all(url_serie, callback);
        }
    }
}


//Fonction chargée de récupérer les documents XML via thetvdb.com et lancant les
//différents traitements attendus, suivant l'URL qui est passée
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


//Fonction chargée de récupérer l'ID de la série afin de génèrer l'url de récupération des épisodes
var recup_serie_id = function(res,callback){
    var parser = new xml2js.Parser();
    parser.parseString(res.text, function (err, result){
        for(var Data in result){
           //series représente le deuxième niveau, Séries et Episodes
           for(var series in result[Data]){
               if (series=='Series'){
                   for(var temp in (result[Data])[series]){
                       for(var temporary in (((result[Data])[series])[temp])['seriesid']){
                           serie_id = ((((result[Data])[series])[temp])['seriesid'])[temporary];
                           base_information = "http://thetvdb.com/api/54B5B2E411F0FC20/series/"+serie_id+"/all";
                           //Une fois l'URL récupérée, on lance immédiatement la récupération des épisodes
                           recup_all(base_information,callback);
                       }
                   }
               }
           }
        }
    });
}


//Fonction chargée de superviser la récupération des épisodes, puis de leurs détails via les deux sous-fonctions
//correspondantes avant de lancer la création (ou l'update) des évènements Cozy concernant les épisodes

var recup_episodes = function(res,callback){
    //On initialise le parseur XML
    var parser = new xml2js.Parser();
    //On commence a parser le resultat récupéré via superagent
    parser.parseString(res.text, function (err, result){
        //On récupére le tableau de tous les épisodes
        var episodes = recup_episodes_tableau(result);
        //On extrait de ces épisodes et de leurs détails le tableau de tous les évènements
        var episodes_details = recup_episodes_details(episodes);
        //Fonction chargée de vérifier si l'évènement existe ou non, et de le mettre a jour si besoin est
        var processor = function(rawEvent, next) {
            //On recherche l'évènement via son ID dans la base
            Event.find(rawEvent['_id'], function(err, event) {
                //S'il y a erreur ou s'il n'est pas trouvé, on le crée
                if (err || !event) {
                    Event.create(rawEvent, function(err, event) {
                        next();
                    });
                }//Sinon, on le met à jour si les dates de dernière modification ne correspondent pas
                else {
                    if(event['lastModification'] != rawEvent['lastModification']){
                        //On ne modifie pas la date de création de l'évènement
                        rawEvent['created'] = event['created'];
                        event.updateAttributes(rawEvent,function(err,event){
                            next();
                        });
                    }
                }
            });
        }
        //On fait passer chacun des rawEvent dans la fonction processor
        async.eachSeries(episodes_details,processor,function(err){
            console.log('events created');
            callback();
        });
    });
}


//Fonction chargée d'extraire tous les épisodes contenant dans le document xml récupéré
//via superagent. On descend de deux niveaux dans le XML et on ajoute dans le tableau episodes
//les objets Episode
//Cette fonction renvoie le tableau des épisodes en sortie
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


//Fonction prenant en paramètres un tableau contenant les épisodes
//et qui extraie de chaque épisode les variables intéressantes pour l'application
//(début, fin, nom de l'épisode, description,...)
//Une fois ces variables récupérées, la fonction crée un ajoute un objet rawEvent
//dans un tableau rawEvents contenant tous les détails de tous les épisodes de la série
//La fonction renvoie le dit tableau en sortie.
var recup_episodes_details = function(episodes){
    var rawEvents = [];
    for(var id in episodes){
        //On parcourt les épisodes
        //On récupère la valeur de l'ID de cet épisode
        for(var temp in (episodes[id])['id']){
            var EpisodeID = ((episodes[id])['id'])[temp];
        }
        //On récupère la date de première diffusion
        for(var temp in (episodes[id])["FirstAired"]){
            var start = ((episodes[id])["FirstAired"])[temp];
        }
        //On ajoute a la date de première diffusion 1000*60*60*24 millisecondes,
        //soit 24 h pour que l'évènement soit considéré comme prenant la journée entière
        var date_temporaire = new Date(((episodes[id])["FirstAired"]));
        date_temporaire.setTime(date_temporaire.getTime()+86400000);
        var end = (date_temporaire.toISOString().split('T'))[0];
        //On récupère la description de l'épisode
        for(var temp in (episodes[id])["Overview"]){
            var details = ((episodes[id])["Overview"])[temp];
        }
        //On prend comme date de création et de dernière modification la date actuelle
        var lastModification  = new Date().toISOString();
        //On récupère le numéro de l'épisode
        for(var temp in (episodes[id])["Combined_episodenumber"]){
            var EpisodeNumber = ((episodes[id])["Combined_episodenumber"])[temp];
        }
        //le numéro de saison
        for(var temp in (episodes[id])["Combined_season"]){
            var EpisodeSeason = ((episodes[id])["Combined_season"])[temp];
        }
        //le nom de l'épisode
        for(var temp in (episodes[id])["EpisodeName"]){
            var EpisodeName = ((episodes[id])["EpisodeName"])[temp];
        }
        //On crée ici l'objet rawEvent contenant les attributs récupérés dans l'épisode XML
        var rawEvent = {"_id": EpisodeID,"start" : start,"end" : end, "place" : "", "details" : details, "description" : "Episode numéro "+ EpisodeNumber + " de la saison "+EpisodeSeason+", nommé "+EpisodeName, "tags" : ["default calendar"], "alarms" : [], "created" : lastModification, "lastModification" : lastModification, "readOnly" : "1"};
        rawEvents.push(rawEvent);
    }
    return rawEvents;
}

//Début du programme, cette fonction relance le script toutes les 24 h après un premier appel
var recup_all_series_every_24h = function() {
    recup_all_series(function() {
        console.log('terminé');
        setTimeout(recup_all_series_every_24h, 1000*10);
    });
}
recup_all_series_every_24h();
