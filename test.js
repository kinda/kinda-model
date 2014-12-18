#!/usr/bin/env node --harmony-generators

"use strict";

var Model = require('./');
var util = require('kinda-util').create();

var Person = Model.extend('Person', function() {
  this.addProperty('name', String, { defaultValue: 'Anonymous' });
  this.addProperty('age', Number, { validators: ['isRequired'] });
});

var mvila = Person.create({ age: 3 });
mvila.validate();
util.log(mvila);
