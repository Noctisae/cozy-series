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
var tab_url_series = [];
var SeriesName = "";
var serie_id = "";
var url_serie = "http://thetvdb.com/api/GetSeries.php?seriesname="+process.argv[2];
var base_information = "";
var nombre_episodes_traites = 0;
var taille_tableau_episodes =0;

//On ôte les deux premiers arguments de la ligne de commande afin de ne garder que les séries
process.argv.shift();
process.argv.shift();


//Fonction chargée de récupérer les documents XML via thetvdb.com et lancant les
//différents traitements attendus, suivant l'URL qui est passée
var recup_all = function(url,callback,seriesName,banner){
    //A la première passe pour récupérer l'ID de la série, on ne spécifie pas les variables seriesName et banner
    if(typeof(seriesName)==undefined){
        seriesName = "";
    }
    if(typeof(banner) == undefined){
        banner = "";
    }
    var request = superagent.get(url);
    request.buffer();
    request.type('xml');
    request.end(function(err,res) {
        if(res.ok){
            if (url.indexOf("http://thetvdb.com/api/GetSeries.php") > -1){
                recup_serie_id(res,callback);
            }
            else if(url.indexOf("http://thetvdb.com/api/54B5B2E411F0FC20/series") > -1){
                recup_episodes(res,seriesName,banner,callback);
            }
        }
        else{
            callback("Une erreur s'est produite lors de la récupération des documents XML sur thetvdb.com");
        }
    });
}


//Fonction chargée de récupérer l'ID de la série afin de génèrer l'url de récupération des épisodes
var recup_serie_id = function(res,callback){
    var parser = new xml2js.Parser();
    var seriesName = "";
    var banner = "";
    parser.parseString(res.text, function (err, result){
        for(var Data in result){
           //series représente le deuxième niveau, Séries et Episodes
           for(var series in result[Data]){
               if (series=='Series'){
                   for(var temp in (result[Data])[series]){
                       for(var temporary in (((result[Data])[series])[temp])['SeriesName']){
                           seriesName = ((((result[Data])[series])[temp])['SeriesName'])[temporary];
                       }
                       for(var temporary in (((result[Data])[series])[temp])['banner']){
                           banner = ((((result[Data])[series])[temp])['banner'])[temporary];
                       }
                       for(var temporary in (((result[Data])[series])[temp])['seriesid']){
                           serie_id = ((((result[Data])[series])[temp])['seriesid'])[temporary];
                           if(serie_id == ""){
                               callback("Une erreur s'est produite lors de la récupération de l'ID de la série "+ seriesName);
                           }
                           base_information = "http://thetvdb.com/api/54B5B2E411F0FC20/series/"+serie_id+"/all";
                           //Une fois l'URL récupérée, on lance immédiatement la récupération des épisodes
                           recup_all(base_information,callback,seriesName,banner);
                       }
                   }
               }
           }
        }
    });
}


//Fonction chargée de superviser la récupération des épisodes, puis de leurs détails via les deux sous-fonctions
//correspondantes avant de lancer la création (ou l'update) des évènements Cozy concernant les épisodes

var recup_episodes = function(res,seriesName,banner,callback){
    //On initialise le parseur XML
    var parser = new xml2js.Parser();
    //On commence a parser le resultat récupéré via superagent
    parser.parseString(res.text, function (err, result){
        //On récupére le tableau de tous les épisodes
        var episodes = recup_episodes_tableau(result);
        if(episodes.length == 0){
            callback("Une erreur s'est produite lors de la récupération des épisodes pour la série "+seriesName);
        }
        //On extrait de ces épisodes et de leurs détails le tableau de tous les évènements
        var episodes_details = recup_episodes_details(episodes,seriesName,banner);
        taille_tableau_episodes+= episodes_details.length;
        if(episodes_details.length ==0){
            callback("Une erreur s'est produite lors de la récupération des détails pour les épisodes de la série " + seriesName);
        }
        //Fonction chargée de vérifier si l'évènement existe ou non, et de le mettre a jour si besoin est
        var processor = function(rawEvent, next) {
            //On recherche l'évènement via son ID dans la base
            Event.find(rawEvent['_id'], function(err, event) {
                if (err){
                    console.log(err);
                }
                //S'il n'est pas trouvé, on le crée
                else if(!event) {
                    Event.create(rawEvent, function(err, event) {
                        console.log("event created");
                        next();
                    });
                    nombre_episodes_traites++;
                }//Sinon, on le met à jour si les dates de dernière modification ne correspondent pas
                else {
                    if(event['lastModification'] != rawEvent['lastModification']){
                        //On ne modifie pas la date de création de l'évènement
                        rawEvent['created'] = event['created'];
                        console.log("event updated");
                        event.updateAttributes(rawEvent,function(err,event){
                            next();
                        });
                        nombre_episodes_traites++;
                    }
                }
            });
        }
        //On fait passer chacun des rawEvent dans la fonction processor
        async.eachSeries(episodes_details,processor,function(err){
            console.log('events created or updated');
            //Si le nombre d'épisodes traités correspondant au nombre d'épisodes récupérés, on effectue le callback
            if(nombre_episodes_traites == taille_tableau_episodes){
                nombre_episodes_traites = 0;
                taille_tableau_episodes = 0;
                callback();
            }
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
var recup_episodes_details = function(episodes,seriesName,banner){
    var rawEvents = [];
    for(var id in episodes){
        //On parcourt les épisodes
        //On récupère la valeur de l'ID de cet épisode
        for(var temp in (episodes[id])['id']){
            var EpisodeID = ((episodes[id])['id'])[temp];
        }
        //On récupère la date de première diffusion
        for(var temp in (episodes[id])["FirstAired"]){
            var start = "";
            var end = "";
            start = ((episodes[id])["FirstAired"])[temp];
            if(start != undefined && start != null && start != ""){
                //On ajoute a la date de première diffusion 1 jour
                //pour que l'évènement soit considéré comme prenant la journée entière
                var date_temporaire = new Date(start);
                date_temporaire.setDate(date_temporaire.getDate()+1);
                end = (date_temporaire.toISOString().split('T'))[0];

            }
        }
        //On récupère la description de l'épisode
        for(var temp in (episodes[id])["Overview"]){
            var details = ((episodes[id])["Overview"])[temp];
        }
        //On récupère l'affiche de l'épisode
        for(var temp in (episodes[id])["filename"]){
            var filename = ((episodes[id])["filename"])[temp];
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
        var rawEvent = {"_id": EpisodeID,"start" : start,"end" : end, "place" : "", "details" : details, "description" : seriesName+" : E"+ EpisodeNumber + " S"+EpisodeSeason+", nommé "+EpisodeName, "serie": seriesName, "banner" : banner, "tags" : ["default calendar"], "alarms" : [], "created" : lastModification, "lastModification" : lastModification, "readOnly" : "1", "filename" : filename};
        rawEvents.push(rawEvent);
    }
    return rawEvents;
}

//Fonction chargée d'effectuer la récupération de toutes les séries précisées en argument du script.
//Elle se relance automatiquement toutes les 24h une fois la récupération terminée.
var recup_all_series_every_24h = function() {
    var tab = process.argv;
    if(tab.length > 0){
        for(var i=0;i<tab.length;i++){
            recup_all("http://thetvdb.com/api/GetSeries.php?seriesname="+tab[i],function(err) {
                if(err){
                    console.log(err);
                }
                else{
                    console.log('La récupération de toutes les séries est terminée');
                    setTimeout(recup_all_series_every_24h, 1000*60*60*24);
                }
            });
        }
    }
    else{
        console.log('Veuillez préciser les séries à récupérer. (Ex: node recup_serie.js "Game of Thrones" "The Walking Dead")');
    }
}
recup_all_series_every_24h();
