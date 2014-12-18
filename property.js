"use strict";

var _ = require('lodash');
var KindaObject = require('kinda-object');
var Validation = require('./validation');

var Property = KindaObject.extend('Property', function() {
  this.include(Validation);

  this.setCreator(function(name, type, options) {
    if (typeof name !== 'string' || !name)
      throw new Error('name is missing');
    if (!type)
      throw new Error('type is missing');
    if (!options)
      options = {};
    this.name = name;
    this.type = type;
    this.converter = getConverter(type);
    this.serializer = getSerializer(type);
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        if (!(key in this))
          throw new Error("option '" + key + "' is unknown");
        this[key] = options[key];
      }
    }
  });

  this.defaultValue = undefined;
});

var getConverter = function(type) {
  if (type === Boolean)
    return function(val) {
      if (typeof val !== 'boolean')
        val = Boolean(val);
      return val;
    };
  if (type === Number)
    return function(val) {
      if (typeof val !== 'number')
        val = Number(val);
      return val;
    };
  if (type === String)
    return function(val) {
      if (typeof val !== 'string')
        val = String(val);
      return val;
    };
  if (type === Object)
    return function(val) {
      return _.cloneDeep(val);
    };
  if (type === Array)
    return function(val) {
      if (!_.isArray(val))
        throw new Error('type mismatch (an array was expected)');
      return _.cloneDeep(val);
    };
  if (typeof type === 'function')
    return function(val) {
      if (!(val instanceof type))
        val = new (type)(val);
      return val;
    };
  if (type.unserialize)
    return function(val) {
      if (!(val.isInstanceOf && val.isInstanceOf(type)))
        val = type.unserialize(val);
      return val;
    };
  throw new Error('invalid type');
};

var getSerializer = function(type) {
  if (type === Object)
    return function(val) {
      return serializeObject(val)
    };
  if (type === Array)
    return function(val) {
      return serializeArray(val)
    };
  if (type.isKindaClass)
    return function(val) {
      return val.serialize();
    };
  if (type.prototype && type.prototype.toJSON)
    return function(val) {
      return val.toJSON();
    };
  return function(val) {
    return val;
  };
};

var serialize = function(input) {
  if (input == null) return;
  var type = typeof input;
  if (type === 'boolean' || type === 'number' || type === 'string')
    return input;
  if (input.toJSON)
    return input.toJSON();
  if (_.isArray(input))
    return serializeArray(input);
  return serializeObject(input);
};

var serializeObject = function(input) {
  var output = {};
  _.forOwn(input, function(val, key) {
    val = serialize(val);
    if (val != null) output[key] = val;
  });
  return output;
};

var serializeArray = function(input) {
  return input.map(serialize);
};

module.exports = Property;
