'use strict';

let _ = require('lodash');
let assert = require('chai').assert;
let KindaModel = require('./src');

suite('KindaModel', function() {
  test('simple model', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('firstName', String);
      this.addProperty('lastName', String);
    });

    let properties = Person.prototype.properties;
    let keys = Object.keys(properties);
    assert.strictEqual(_.union(keys, ['firstName', 'lastName']).length, 2);
    assert.strictEqual(properties.firstName.name, 'firstName');

    let person;
  
    person = Person.create();
    assert.deepEqual(person.serialize(), {});

    person = Person.create(
      { firstName: 'Jean', lastName: 'Dupont', unknownProperty: 123 }
    );
    assert.deepEqual(
      person.serialize(), { firstName: 'Jean', lastName: 'Dupont' }
    );
    person.firstName = 'Eric';
    assert.strictEqual(person.firstName, 'Eric');
  });

  test('serialization', function() {
    let Model = KindaModel.extend('Model', function() {
      this.addProperty('boolean', Boolean);
      this.addProperty('number', Number);
      this.addProperty('string', String);
      this.addProperty('array', Array);
      this.addProperty('object', Object);
      this.addProperty('date', Date);
    });

    let instance = Model.create({
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: new Date('2015-08-12T09:39:21.226Z')
    });

    assert.deepEqual(instance.serialize(), {
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: '2015-08-12T09:39:21.226Z'
    });

    let instance2 = Model.unserialize({
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: '2015-08-12T09:39:21.226Z'
    });

    assert.strictEqual(instance2.boolean, true);
    assert.strictEqual(instance2.number, 123);
    assert.strictEqual(instance2.string, 'abc');
    assert.deepEqual(instance2.array, [1, 2, 3]);
    assert.deepEqual(instance2.object, { a: 1, b: 2 });
    assert.strictEqual(instance2.date.toJSON(), '2015-08-12T09:39:21.226Z');
  });

  test('property conversion', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('name', String);
      this.addProperty('age', Number);
      this.addProperty('isCool', Boolean);
    });

    let person = Person.create({ name: 123, age: '42', isCool: 'absolutely' });
    assert.deepEqual(
      person.serialize(), { name: '123', age: 42, isCool: true }
    );
  });

  test('property default value', function() {
    let defaultCountry = 'France';
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('name', String);
      this.addProperty('isAlive', Boolean, { defaultValue: true });
      this.addProperty('country', String, { defaultValue: () => defaultCountry });
    });

    let person;

    person = Person.create({ name: 'Dupont' });
    assert.deepEqual(
      person.serialize(), { name: 'Dupont', isAlive: true, country: 'France' }
    );

    person = Person.unserialize({ name: 'Dupont' });
    assert.deepEqual(person.serialize(), { name: 'Dupont' });
  });

  test('events', function() {
    let didCreateCount, didUnserializeCount, didChangeCount, firstNameDidChangeCount;

    let initializeCounters = () => {
      didCreateCount = 0;
      didUnserializeCount = 0;
      didChangeCount = 0;
      firstNameDidChangeCount = 0;
    };

    let Person = KindaModel.extend('Person', function() {
      this.addProperty('firstName', String);
      this.addProperty('lastName', String);

      this.on('didCreate', () => didCreateCount++);
      this.on('didUnserialize', () => didUnserializeCount++);
      this.on('didChange', () => didChangeCount++);
      this.on('firstName.didChange', () => firstNameDidChangeCount++);
    });

    let person;

    initializeCounters();
    person = Person.create();
    assert.strictEqual(didCreateCount, 1);
    assert.strictEqual(didUnserializeCount, 0);
    assert.strictEqual(didChangeCount, 0);
    assert.strictEqual(firstNameDidChangeCount, 0);

    initializeCounters();
    person = Person.create({ lastName: 'Dupont' });
    assert.strictEqual(didCreateCount, 1);
    assert.strictEqual(didUnserializeCount, 0);
    assert.strictEqual(didChangeCount, 1);
    assert.strictEqual(firstNameDidChangeCount, 0);
    person.lastName = 'Dupont';
    assert.strictEqual(didChangeCount, 1);
    person.lastName = 'Durand';
    assert.strictEqual(didChangeCount, 2);
    person.updateValue({ lastName: 'Dupas' });
    assert.strictEqual(didChangeCount, 3);

    initializeCounters();
    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    assert.strictEqual(didCreateCount, 1);
    assert.strictEqual(didUnserializeCount, 0);
    assert.strictEqual(didChangeCount, 1);
    assert.strictEqual(firstNameDidChangeCount, 1);
    person.firstName = 'Jean';
    assert.strictEqual(didChangeCount, 1);
    assert.strictEqual(firstNameDidChangeCount, 1);
    person.firstName = 'Eric';
    assert.strictEqual(didChangeCount, 2);
    assert.strictEqual(firstNameDidChangeCount, 2);
    person.updateValue({ lastName: 'Durand' });
    assert.strictEqual(didChangeCount, 3);
    assert.strictEqual(firstNameDidChangeCount, 2);
    person.updateValue({ firstName: 'Joe', lastName: 'Dupont' });
    assert.strictEqual(didChangeCount, 4);
    assert.strictEqual(firstNameDidChangeCount, 3);

    initializeCounters();
    person = Person.unserialize({ firstName: 'Jean', lastName: 'Dupont' });
    assert.strictEqual(didCreateCount, 0);
    assert.strictEqual(didUnserializeCount, 1);
    assert.strictEqual(didChangeCount, 1);
    assert.strictEqual(firstNameDidChangeCount, 1);
  });

  test('replaceValue', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('firstName', String);
      this.addProperty('lastName', String);
    });

    let person;

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.replaceValue(undefined);
    assert.deepEqual(person.serialize(), {});

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.replaceValue({});
    assert.deepEqual(person.serialize(), {});

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.replaceValue({ lastName: 'Durand' });
    assert.deepEqual(person.serialize(), { lastName: 'Durand' });
  });

  test('updateValue', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('firstName', String);
      this.addProperty('lastName', String);
    });

    let person;

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.updateValue(undefined);
    assert.deepEqual(
      person.serialize(), { firstName: 'Jean', lastName: 'Dupont' }
    );

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.updateValue({});
    assert.deepEqual(
      person.serialize(), { firstName: 'Jean', lastName: 'Dupont' }
    );

    person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.updateValue({ lastName: 'Durand' });
    assert.deepEqual(
      person.serialize(), { firstName: 'Jean', lastName: 'Durand' }
    );
  });

  test('clearValue', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('firstName', String);
      this.addProperty('lastName', String);
    });

    let person = Person.create({ firstName: 'Jean', lastName: 'Dupont' });
    person.clearValue();
    assert.deepEqual(person.serialize(), {});
  });

  test('validation', function() {
    let Person = KindaModel.extend('Person', function() {
      this.addProperty('name', String, { validators: 'isFilled' });
      this.addProperty('age', Number, { validators: 'isPositive' });
      this.addProperty('status', String, {
        validators: [
          function hasValidStatus(status) {
            return status === 'alive' || status === 'dead';
          }
        ]
      });
    });

    let person, validity;

    person = Person.create();
    validity = person.checkValidity();
    assert.isFalse(validity.isValid);
    assert.strictEqual(validity.reasons.length, 3);

    person = Person.create({ name: '', age: 0, status: '' });
    validity = person.checkValidity();
    assert.isFalse(validity.isValid);
    assert.strictEqual(validity.reasons.length, 3);

    person = Person.create({ name: 'Dupont', age: -3, status: 'unknown' });
    validity = person.checkValidity();
    assert.isFalse(validity.isValid);
    assert.strictEqual(validity.reasons.length, 2);

    person = Person.create({ name: 'Dupont', age: 30, status: 'unknown' });
    validity = person.checkValidity();
    assert.isFalse(validity.isValid);
    assert.strictEqual(validity.reasons.length, 1);
    assert.deepEqual(validity.reasons[0], {
      failedValidator: 'hasValidStatus', path: 'status'
    });

    person = Person.create({ name: 'Dupont', age: 30, status: 'alive' });
    validity = person.checkValidity();
    assert.isTrue(validity.isValid);
  });
});
