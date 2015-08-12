'use strict';

let _ = require('lodash');
let KindaObject = require('kinda-object');
let KindaEventManager = require('kinda-event-manager');
let Property = require('./property');
let Validation = require('./validation');

let KindaModel = KindaObject.extend('KindaModel', function() {
  this.include(KindaEventManager);
  this.include(Validation);

  this.Property = Property;

  this.creator = function(value) {
    this.setValue(value, true);
    this.applyDefaultValues();
    this.emit('didCreate');
  };

  this.unserializer = function(json) {
    this.setValue(json, true);
    this.emit('didUnserialize');
  };

  Object.defineProperty(this, 'properties', {
    get() {
      if (!this._properties) this._properties = {};
      return this._properties;
    }
  });

  this.addProperty = function(name, type, options) {
    let prop = this.Property.create(name, type, options);
    this.properties[name] = prop;
    Object.defineProperty(this, name, {
      get() {
        return this.getPropertyValue(prop);
      },
      set(val) {
        if (this.setPropertyValue(prop, val)) this.emit('didChange');
        return this.getPropertyValue(prop);
      },
      enumerable: true
    });
    return prop;
  };

  this.getPropertyValue = function(prop) {
    if (this.hasOwnProperty('_propertyValues')) {
      return this._propertyValues[prop.name];
    } else {
      return undefined;
    }
  };

  this.setPropertyValue = function(prop, val) {
    let oldVal = this.getPropertyValue(prop);
    if (val != null) val = prop.convertValue(val);
    if (val === oldVal) return false;
    if (!this.hasOwnProperty('_propertyValues')) this._propertyValues = {};
    this._propertyValues[prop.name] = val;
    this.emit(prop.name + '.didChange', val, oldVal);
    return true;
  };

  this.setValue = function(value, updateMode) {
    let hasChanged;
    _.forOwn(this.properties, function(prop, key) {
      if (!updateMode || (value != null && key in value)) {
        let val = value != null ? value[key] : undefined;
        if (this.setPropertyValue(prop, val)) hasChanged = true;
      }
    }, this);
    if (hasChanged) this.emit('didChange');
    return this;
  };

  this.replaceValue = function(value) {
    return this.setValue(value, false);
  };

  this.updateValue = function(value) {
    return this.setValue(value, true);
  };

  this.clearValue = function() {
    return this.setValue(undefined, false);
  };

  this.serializer = function() {
    let json = {};
    _.forOwn(this.properties, function(prop, key) {
      let val = this.getPropertyValue(prop);
      if (val == null) return;
      val = prop.serializeValue(val);
      json[key] = val;
    }, this);
    return json;
  };

  this.applyDefaultValues = function() {
    _.forOwn(this.properties, function(prop) {
      let val = prop.defaultValue;
      if (val == null) return;
      if (this.getPropertyValue(prop) != null) return;
      if (typeof val === 'function') val = val.call(this);
      this.setPropertyValue(prop, val);
    }, this);
  };

  this.addValidator(function modelValidator(model, parentPath) {
    let reasons = [];
    _.forOwn(model.properties, function(prop, key) {
      let val = model.getPropertyValue(prop);
      let path = parentPath ? parentPath + '.' + key : key;
      let validity = prop.checkValidity(val, path);
      if (!validity.isValid) {
        reasons = reasons.concat(validity.reasons);
      }
    });
    if (reasons.length) {
      return { isValid: false, reasons };
    } else {
      return { isValid: true };
    }
  });
});

module.exports = KindaModel;
