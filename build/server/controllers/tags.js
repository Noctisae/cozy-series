<<<<<<< HEAD
// Generated by CoffeeScript 1.4.0
=======
// Generated by CoffeeScript 1.9.0
>>>>>>> c4dd9d82998543b6ac5a027466a99302d51de44c
var Tag;

Tag = require('../models/tag');

module.exports.fetch = function(req, res, next, id) {
  return Tag.find(id, function(err, tag) {
    if (err || !tag) {
      return res.send({
        error: "Tag not found"
      }, 404);
    } else {
      req.tag = tag;
      return next();
    }
  });
};

module.exports.all = function(req, res, next) {
  return Tag.all(function(err, results) {
    if (err) {
      return next(err);
    }
    return res.send(200, results);
  });
};

module.exports.read = function(req, res) {
  return res.send(req.tag);
};

module.exports.create = function(req, res) {
  var data;
  data = req.body;
  return Tag.getOrCreate(data, function(err, tag) {
    if (err != null) {
      return res.send({
        error: "Server error while creating tag."
      }, 500);
    } else {
      return res.send(tag, 201);
    }
  });
};

module.exports.update = function(req, res) {
  var data;
  data = req.body;
  return req.tag.updateAttributes(data, function(err, tag) {
    if (err != null) {
      return res.send({
        error: "Server error while saving tag"
      }, 500);
    } else {
      return res.send(tag, 200);
    }
  });
};

module.exports["delete"] = function(req, res) {
  return req.tag.destroy(function(err) {
    if (err != null) {
      return res.send({
        error: "Server error while deleting the tag"
      }, 500);
    } else {
      return res.send({
        success: true
      }, 200);
    }
  });
};
