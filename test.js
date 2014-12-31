#!/usr/bin/env node --harmony-generators

"use strict";

var Model = require('./');
var log = require('kinda-log').create();

var Person = Model.extend('Person', function() {
  this.addProperty('name', String, { defaultValue: 'Anonymous' });
  this.addProperty('age', Number, { validators: ['isRequired'] });
});

var mvila = Person.create({ age: 3 });
mvila.validate();
log.info(mvila);
