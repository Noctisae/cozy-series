// Generated by CoffeeScript 1.9.0
var Alarm, Event, User, async, cozydb, log, moment;

cozydb = require('cozydb');

async = require('async');

moment = require('moment-timezone');

Event = require('./event');

log = require('printit')({
  prefix: 'alarm:model'
});

User = require('./user');

module.exports = Alarm = cozydb.getModel('Alarm', {
  action: {
    type: String,
    "default": 'DISPLAY'
  },
  trigg: {
    type: String
  },
  description: {
    type: String
  },
  timezone: {
    type: String
  },
  rrule: {
    type: String
  },
  tags: {
    type: [String]
  },
  related: {
    type: String,
    "default": null
  },
  created: {
    type: String
  },
  lastModification: {
    type: String
  }
});

Alarm.tags = function(callback) {
  return Alarm.rawRequest("tags", {
    group: true
  }, function(err, results) {
    var out, result, tag, type, _i, _len, _ref;
    if (err) {
      return callback(err);
    }
    out = {
      calendar: [],
      tag: []
    };
    for (_i = 0, _len = results.length; _i < _len; _i++) {
      result = results[_i];
      _ref = result.key, type = _ref[0], tag = _ref[1];
      out[type].push(tag);
    }
    return callback(null, out);
  });
};

Alarm.createOrGetIfImport = function(data, callback) {
  if (data["import"]) {
    return Alarm.request('byDate', {
      key: data.trigg
    }, function(err, alarms) {
      if (err) {
        log.error(err);
        return Alarm.create(data, callback);
      } else if (alarms.length === 0) {
        return Alarm.create(data, callback);
      } else if (data.description === alarms[0].description) {
        log.warn('Alarm already exists, it was not created.');
        return callback(null, alarms[0]);
      } else {
        return Alarm.create(data, callback);
      }
    });
  } else {
    return Alarm.create(data, callback);
  }
};

Alarm.prototype.getAttendeesEmail = function() {
  return [User.email];
};

Alarm.prototype.migrateDoctype = function(callback) {
  var body, date, timezone;
  timezone = this.timezone || 'UTC';
  date = moment.tz(this.trigg, timezone).format('YYYY-MM-DD');
  body = {
    start: date,
    end: date,
    description: this.description,
    place: '',
    rrule: '',
    tags: this.tags,
    alarms: [
      {
        id: 1,
        trigg: '-PT10M',
        action: 'DISPLAY'
      }
    ],
    attendees: [],
    created: moment().tz('UTC').toISOString(),
    lastModification: moment().tz('UTC').toISOString()
  };
  return Event.create(body, (function(_this) {
    return function() {
      return _this.destroy(callback);
    };
  })(this));
};

Alarm.migrateAll = function(callback) {
  return Alarm.all({}, function(err, alarms) {
    if (err) {
      console.log(err);
      return callback();
    } else {
      return async.eachLimit(alarms, 10, function(alarm, done) {
        return alarm.migrateDoctype(done);
      }, callback);
    }
  });
};
