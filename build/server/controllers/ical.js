// Generated by CoffeeScript 1.9.3
var Event, Tag, User, archiver, async, createCalendar, fs, ical, localization, multiparty;

ical = require('cozy-ical');

Event = require('../models/event');

Tag = require('../models/tag');

User = require('../models/user');

multiparty = require('multiparty');

fs = require('fs');

archiver = require('archiver');

async = require('async');

localization = require('../libs/localization_manager');

module.exports["export"] = function(req, res) {
  var calendarId;
  calendarId = req.params.calendarid;
  return createCalendar(calendarId, function(err, calendar) {
    res.header({
      'Content-Type': 'text/calendar'
    });
    return res.send(calendar.toString());
  });
};

createCalendar = function(calendarName, callback) {
  var calendar;
  calendar = new ical.VCalendar({
    organization: 'Cozy',
    title: 'Cozy Calendar',
    name: calendarName
  });
  return Event.byCalendar(calendarName, function(err, events) {
    var event, i, len;
    if (err) {
      return callback(err);
    }
    if (events.length > 0) {
      for (i = 0, len = events.length; i < len; i++) {
        event = events[i];
        calendar.add(event.toIcal());
      }
      return callback(null, calendar);
    }
  });
};

module.exports["import"] = function(req, res, next) {
  var form;
  form = new multiparty.Form();
  return form.parse(req, function(err, fields, files) {
    var cleanUp, file, options, parser, ref;
    if (err) {
      return next(err);
    }
    cleanUp = function() {
      var arrfile, file, key, results;
      results = [];
      for (key in files) {
        arrfile = files[key];
        results.push((function() {
          var i, len, results1;
          results1 = [];
          for (i = 0, len = arrfile.length; i < len; i++) {
            file = arrfile[i];
            results1.push(fs.unlink(file.path, function(err) {
              if (err) {
                return console.log("failed to cleanup file", file.path, err);
              }
            }));
          }
          return results1;
        })());
      }
      return results;
    };
    if (!(file = (ref = files['file']) != null ? ref[0] : void 0)) {
      res.send({
        error: 'no file sent'
      }, 400);
      return cleanUp();
    }
    parser = new ical.ICalParser();
    options = {
      defaultTimezone: User.timezone
    };
    return parser.parseFile(file.path, options, function(err, result) {
      if (err) {
        console.log(err);
        console.log(err.message);
        res.send(500, {
          error: 'error occured while saving file'
        });
        return cleanUp();
      } else {
        return Event.tags(function(err, tags) {
          var calendarName, calendars, defaultCalendar, key, ref1;
          calendars = tags.calendar;
          key = 'default calendar name';
          defaultCalendar = (calendars != null ? calendars[0] : void 0) || localization.t(key);
          calendarName = (result != null ? (ref1 = result.model) != null ? ref1.name : void 0 : void 0) || defaultCalendar;
          res.send(200, {
            events: Event.extractEvents(result, calendarName),
            calendar: {
              name: calendarName
            }
          });
          return cleanUp();
        });
      }
    });
  });
};

module.exports.zipExport = function(req, res, next) {
  var addToArchive, archive, makeZip, zipName;
  archive = archiver('zip');
  zipName = 'cozy-calendars';
  makeZip = function(zipName, files) {
    var disposition;
    archive.pipe(res);
    req.on('close', function() {
      return archive.abort();
    });
    disposition = "attachment; filename=\"" + zipName + ".zip\"";
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Type', 'application/zip');
    return async.eachSeries(files, addToArchive, function(err) {
      if (err) {
        return next(err);
      }
      return archive.finalize(function(err, bytes) {
        if (err) {
          return next(err);
        }
      });
    });
  };
  addToArchive = function(cal, cb) {
    archive.append(cal.toString(), {
      name: cal.model.name + ".ics"
    });
    return cb();
  };
  return async.map(JSON.parse(req.params.ids), createCalendar, function(err, cals) {
    if (err) {
      return next(err);
    }
    return makeZip(zipName, cals);
  });
};