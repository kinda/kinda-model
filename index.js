"use strict";

var KindaObject = require('kinda-object');
var Property = require('./property');
var Validation = require('./validation');

// TODO: ajouter une relation fils->pères dans les propriétés
// pour permettre à (par exemple) l'objet "person" d'être alerté en cas
// de changement de la propriété "person.company.name"

// Pour "person.company.name = '...'" il faudrait envoyer 5 événements :
// * À "company" : "name.didChange" et "didChange"
// * À "person" : "company.name.didChange", "company.didChange" et "didChange"

var KindaModel = KindaObject.extend('KindaModel', function() {
  this.include(Validation);

  this.setCreator(function(value) {
    this.setValue(value, true);
  });

  this.on('didCreate', function() {
    this.applyDefaultValues();
  });

  this.Property = Property;

  this.getProperties = function() {
    if (!this._properties)
      this._properties = {};
    return this._properties;
  };

  this.getProperty = function(name) {
    return this.getProperties()[name];
  };

  this.addProperty = function(name, type, options) {
    var prop = this.Property.create(name, type, options);
    this.getProperties()[name] = prop;
    Object.defineProperty(this, name, {
      get: function() {
        if (!this.hasOwnProperty('_propertyValues'))
          this._propertyValues = {};
        return this._propertyValues[name];
      },
      set: function(val) {
        var oldVal = this[name];
        if (val != null)
          val = prop.converter(val);
        if (val === oldVal) return;
        this.emit('willChange');
        this.emit(name + '.willChange', val, oldVal);
        this._propertyValues[name] = val;
        this.emitLater(name + '.didChange', val, oldVal);
        this.emitLater('didChange');
        return val;
      },
      enumerable: true
    });
    return prop;
  };

  this.forEachProperty = function(fn) {
    var props = this.getProperties();
    for (var name in props) {
      if (props.hasOwnProperty(name)) {
        fn.call(this, props[name], name, props);
      }
    }
  };

  this.setValue = function(value, updateMode) {
    this.runEventSession(function() {
      this.setValueHandler(value, updateMode);
    });
    return this;
  };

  this.setValueHandler = function(value, updateMode) {
    this.forEachProperty(function(prop, key) {
      if (!updateMode || (value != null && key in value)) {
        var val = value != null ? value[key] : undefined;
        this[key] = val;
      }
    });
  };

  this.replaceValue = function(value) {
    return this.setValue(value);
  };

  this.updateValue = function(value) {
    return this.setValue(value, true);
  };

  this.clearValue = function() {
    return this.setValue();
  };

  this.setSerializer(function() {
    var json = {};
    this.forEachProperty(function(prop, name) {
      var val = this[name];
      if (val == null) return;
      val = prop.serializer(val);
      json[name] = val;
    });
    return json;
  });

  this.setUnserializer(function(json) {
    this.setValue(json, true);
  });

  this.applyDefaultValues = function() {
    this.forEachProperty(function(prop, name) {
      if (this[name] != null) return;
      var val = prop.defaultValue;
      if (val == null) return;
      if (typeof val === 'function')
        val = val.call(this);
      this[name] = val;
    });
  };

  this.addValidator(function modelValidator(model, parentPath) {
    var reasons = [];
    model.forEachProperty(function(prop, name) {
      var val = model[name];
      var path = parentPath;
      if (path)
        path = path + '.' + name;
      else
        path = name;
      var validity = prop.checkValidity(val, path);
      if (!validity.isValid)
        reasons = reasons.concat(validity.reasons);
    });
    if (reasons.length)
      return { isValid: false, reasons: reasons };
    else
      return { isValid: true };
  });
});

module.exports = KindaModel;
