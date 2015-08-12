'use strict';

let _ = require('lodash');
let KindaObject = require('kinda-object');
let Validation = require('./validation');

let Property = KindaObject.extend('Property', function() {
  this.include(Validation);

  this.creator = function(name, type, options = {}) {
    if (typeof name !== 'string' || !name) throw new Error('name is missing');
    if (!type) throw new Error('type is missing');
    this.name = name;
    this.type = type;
    this.convertValue = getConverter(type);
    this.serializeValue = getSerializer(type);
    _.forOwn(options, (val, key) => {
      if (!(key in this)) throw new Error('option \'' + key + '\' is unknown');
      this[key] = val;
    }, this);
  };

  this.defaultValue = undefined;
});

let getConverter = function(type) {
  let converter;
  if (type === Boolean) {
    converter = (val) => {
      if (typeof val !== 'boolean') val = Boolean(val);
      return val;
    };
  } else if (type === Number) {
    converter = (val) => {
      if (typeof val !== 'number') val = Number(val);
      return val;
    };
  } else if (type === String) {
    converter = (val) => {
      if (typeof val !== 'string') val = String(val);
      return val;
    };
  } else if (type === Object) {
    converter = (val) => {
      return _.cloneDeep(val);
    };
  } else if (type === Array) {
    converter = (val) => {
      if (!_.isArray(val)) {
        throw new Error('type mismatch (an array was expected)');
      }
      return _.cloneDeep(val);
    };
  } else if (typeof type === 'function') {
    converter = (val) => {
      if (!(val instanceof type)) val = new (type)(val); // eslint-disable-line  new-cap
      return val;
    };
  } else if (type.unserialize) {
    converter = (val) => {
      if (!(val.isInstanceOf && val.isInstanceOf(type))) {
        val = type.unserialize(val);
      }
      return val;
    };
  } else {
    throw new Error('invalid type');
  }
  return converter;
};

let getSerializer = function(type) {
  let serializer;
  if (type === Object) {
    serializer = serializeObject;
  } else if (type === Array) {
    serializer = serializeArray;
  } else if (type.isKindaClass) {
    serializer = (val) => val.serialize();
  } else if (type.prototype && type.prototype.toJSON) {
    serializer = (val) => val.toJSON();
  } else {
    serializer = (val) => val;
  }
  return serializer;
};

let serialize = function(input) {
  if (input == null) return undefined;
  let output;
  let type = typeof input;
  if (type === 'boolean' || type === 'number' || type === 'string') {
    output = input;
  } else if (input.toJSON) {
    output = input.toJSON();
  } else if (_.isArray(input)) {
    output = serializeArray(input);
  } else {
    output = serializeObject(input);
  }
  return output;
};

let serializeObject = function(input) {
  let output = {};
  _.forOwn(input, (val, key) => {
    val = serialize(val);
    if (val != null) output[key] = val;
  });
  return output;
};

let serializeArray = function(input) {
  return input.map(serialize);
};

module.exports = Property;
