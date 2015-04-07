var mockery = require('mockery');
var sinon = require('sinon');
var expect = require('expect.js');
var Promise = require('bluebird');

var F = require('./fixtures');


describe('Creator', function () {
	var c;
	var query;

	beforeEach(function () {
		mockery.enable({
			warnOnUnregistered: false,
			useCleanCache: true
		});

		query = sinon.stub();

		mockery.registerMock('pg-query', query);

		var Creator = require('../');
		c = new Creator();
	});

	describe('registration', function () {
		var d = F.defs[0];
		var NAME = d.name;
		var DEF = d.def;
		var NOTASTRING = F.notastring;

		it('should register definition', function () {
			c.register(NAME, DEF);
			expect(c.getDefinition(NAME)).to.equal(DEF);
		});

		it('should error if definition already present', function () {
			c.register(NAME, DEF);
			expect(c.register.bind(c)).withArgs(NAME, DEF).to.throwError(/duplicate registration/i);
		});

		it('should error if definition not a string', function () {
			expect(c.register.bind(c)).withArgs(NAME, NOTASTRING).to.throwError(/invalid definition/i);
		});
	});

	describe('setup', function () {
		beforeEach(function () {
			var d;
			d = F.defs[0];
			c.register(d.name, d.def);

			d = F.defs[1];
			c.register(d.name, d.def);
		});

		it('should be able to succeed', function () {
			query.reset();
			query.onFirstCall().returns(Promise.resolve());
			query.onSecondCall().returns(Promise.resolve());

			return c.setup()
				.then(function () {
					expect(query.callCount).to.equal(2);
				});
		});

		it('should fail if one of the setups fails', function () {
			query.reset();
			query.onFirstCall().returns(Promise.resolve());
			query.onSecondCall().returns(Promise.reject(F.queryError));

			return c.setup()
				.catch(function (err) {
					expect(err.message).to.equal(F.queryError.message);
					expect(query.callCount).to.equal(2);
				});
		});

		it('should clean up', function () {
			query.reset();
			query.onFirstCall().returns(Promise.resolve());
			query.onSecondCall().returns(Promise.resolve());

			return c.clean()
				.then(function () {
					expect(query.callCount).to.equal(2);
					expect(query.firstCall.args[0]).to.match(/DROP VIEW/);
					expect(query.firstCall.args[0]).to.contain(F.defs[0].name);
					expect(query.secondCall.args[0]).to.match(/DROP VIEW/);
					expect(query.secondCall.args[0]).to.contain(F.defs[1].name);
				});
		});

		it('should be able to do clean setup', function () {
			query.reset();
			query.returns(Promise.resolve());

			return c.cleanSetup()
				.then(function () {
					expect(query.callCount).to.equal(4);
				});
		});
	});


	afterEach(function () {
		query = null;
		mockery.deregisterMock('pg-query');
		mockery.disable();
	});
});
