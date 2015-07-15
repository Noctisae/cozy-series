<<<<<<< HEAD
// Generated by CoffeeScript 1.4.0
=======
// Generated by CoffeeScript 1.9.0
>>>>>>> c4dd9d82998543b6ac5a027466a99302d51de44c
var cozydb, tagsView;

cozydb = require('cozydb');

tagsView = {
  map: function(doc) {
    var _ref;
    return (_ref = doc.tags) != null ? typeof _ref.forEach === "function" ? _ref.forEach(function(tag, index) {
      var type;
      type = index === 0 ? 'calendar' : 'tag';
      return emit([type, tag], true);
    }) : void 0 : void 0;
  },
  reduce: "_count"
};

module.exports = {
  tag: {
    byName: cozydb.defaultRequests.by('name')
  },
  alarm: {
    all: cozydb.defaultRequests.all,
    byDate: function(doc) {
      return emit(new Date(doc.trigg), doc);
    },
    tags: tagsView
  },
  event: {
    all: cozydb.defaultRequests.all,
    byDate: function(doc) {
      return emit(new Date(doc.start), doc);
    },
    tags: tagsView,
    byCalendar: cozydb.defaultRequests.by('tags[0]')
  },
  contact: {
    all: cozydb.defaultRequests.all
  },
  webdavaccount: {
    all: cozydb.defaultRequests.all
  }
};
