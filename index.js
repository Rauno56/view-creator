var query = require('pg-query');
var Promise = require('bluebird');
var semiColonEndingRegExp = /;$/;

module.exports = Creator;

function Creator(connection) {
	var client;

	query.connectionParameters = connection;

	this.definitions = {};
}

Creator.prototype = {
	definitions: {},
	client: null,
	getDefinition: function (name) {
		return this.definitions[name];
	},
	setDefinition: function (name, definition) {
		return (this.definitions[name] = definition.trim().replace(semiColonEndingRegExp, ''));
	},
	unregister: function (name) {
		this.definitions[name] = null;
	},
	register: function (name, definition) {
		if (this.getDefinition(name)) {
			throw new Error('Duplicate registration of view ' + name + '.');
		}
		if ('string' !== typeof definition) {
			throw new Error('Invalid type of definition for view ' + name + ': ' + JSON.stringify(definition) + '.');
		}
		return this.setDefinition(name, definition);
	},
	cleanSetup: function () {
		return this.clean().then(this.setup.bind(this));
	},
	setup: function () {
		return Promise.all(Object.keys(this.definitions))
			.bind(this)
			.map(function (key) {
				return this.setupOne(key, this.definitions[key]);
			});
	},
	setupOne: function (name, definition) {
		return query('CREATE OR REPLACE VIEW ' + name + ' AS (' + definition + ');')
			.catch(function (error) {
				error.message = 'Error setting up \'' + name + '\': ' + error.message;
				throw error;
			})
			.return(name);
	},
	clean: function () {
		return Promise.all(Object.keys(this.definitions).map(function (key) {
			return this.cleanOne(key);
		}.bind(this)));
	},
	cleanOne: function (name, sql) {
		return query(sql || ('DROP VIEW IF EXISTS ' + name + ';'))
			.catch(function (error) {
				error.message = 'Error cleaning up \'' + name + '\': ' + error.message;
				throw error;
			})
			.return(name);
	},
};
