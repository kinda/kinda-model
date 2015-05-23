'use strict';

let nodeUtil = require('util');
let _ = require('lodash');
let KindaObject = require('kinda-object');
let util = require('kinda-util').create();

let Validation = KindaObject.extend('Validation', function() {
  Object.defineProperty(this, 'validators', {
    get() {
      if (!this._validators) this._validators = [];
      return this._validators;
    },
    set(validators) {
      if (!_.isArray(validators)) validators = [validators];
      this._validators = [];
      validators.forEach(this.addValidator, this);
    },
    configurable: true,
    enumerable: true
  });

  let standardValidators = {
    isRequired(val) {
      return val != null;
    },
    isFilled(val) {
      return !!val;
    },
    isPositive(val) {
      return val > 0;
    },
    isNegative(val) {
      return val < 0;
    }
  };

  this.addValidator = function(validator) {
    if (!validator) throw new Error('validator is missing');
    if (typeof validator === 'string') {
      if (!(validator in standardValidators)) {
        throw new Error('validator \'' + validator + '\' is unknown');
      }
      validator = standardValidators[validator];
    } else if (typeof validator !== 'function') {
      throw new Error('validator should be a string or a function');
    }
    this.validators.push(validator);
  };

  this.checkValidity = function(val, path) {
    if (arguments.length < 2) path = '';
    if (arguments.length < 1) val = this;
    let reasons = [];
    this.validators.forEach(function(validator) {
      let validity = validator(val, path);
      if (validity == null) validity = false;
      if (validity.hasOwnProperty('isValid')) {
        if (!validity.isValid) {
          reasons = reasons.concat(validity.reasons);
        }
      } else if (!validity) {
        let name = util.getFunctionName(validator);
        reasons.push({ failedValidator: name, path });
      }
    });
    if (val && val !== this && val.checkValidity) {
      let validity = val.checkValidity(val, path);
      if (!validity.isValid) {
        reasons = reasons.concat(validity.reasons);
      }
    }
    if (reasons.length) {
      return { isValid: false, reasons };
    } else {
      return { isValid: true };
    }
  };

  this.validate = function() {
    let validity = this.checkValidity();
    if (!validity.isValid) {
      let reasons = nodeUtil.inspect(validity.reasons);
      throw new Error('validation failed (reasons=' + reasons + ')');
    }
  };
});

module.exports = Validation;
