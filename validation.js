"use strict";

var KindaClass = require('kinda-class');
var util = require('kinda-util').create();

var Validation = KindaClass.extend('Validation', function() {
  Object.defineProperty(this, 'validators', {
    get: function() {
      if (!this._validators)
        this._validators = [];
      return this._validators;
    },
    set: function(validators) {
      if (!validators || !validators.forEach)
        throw new Error('invalid validators');
      this._validators = [];
      validators.forEach(function(validator) {
        this.addValidator(validator);
      }, this);
    },
    enumerable: true
  });

  var standardValidators = {
    isRequired: function isRequired(val) {
      return val != null;
    },
    isFilled: function isFilled(val) {
      return !!val;
    },
  };

  this.addValidator = function(validator) {
    if (!validator)
      throw new Error('validator is missing');
    if (typeof validator === 'string') {
      if (!(validator in standardValidators))
        throw new Error("validator '" + validator + "' is unknown");
      validator = standardValidators[validator];
    } else if (typeof validator !== 'function')
      throw new Error('validator should be a string or a function');
    this.validators.push(validator);
  }

  this.checkValidity = function(val, path) {
    if (arguments.length < 2)
      path = '';
    if (arguments.length < 1)
      val = this;
    var reasons = [];
    this.validators.forEach(function(validator) {
      var validity = validator(val, path);
      if (validity == null) validity = false;
      if (validity.hasOwnProperty('isValid')) {
        if (!validity.isValid) {
          reasons = reasons.concat(validity.reasons);
        };
      } else if (!validity) {
        var name = util.getFunctionName(validator);
        reasons.push({ failedValidator: name, path: path });
      }
    });
    if (val && val !== this && val.checkValidity) {
      var validity = val.checkValidity(val, path);
      if (!validity.isValid) {
        reasons = reasons.concat(validity.reasons);
      }
    }
    if (reasons.length)
      return { isValid: false, reasons: reasons };
    else
      return { isValid: true };
  };

  this.validate = function() {
    var validity = this.checkValidity();
    if (!validity.isValid) {
      var reasons = util.node.inspect(validity.reasons);
      throw new Error('validation failed (reasons=' + reasons + ')');
    }
  };
});

module.exports = Validation;
