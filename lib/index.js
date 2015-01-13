// Load modules
var _ = require('lodash');
var Boom = require('boom');
var schema = require(__dirname + '/schema-parser.js');
var config = require(__dirname + '/config.json')['development'];
var knex = require('knex')(config);
var namespace = config['namespace'];
var hgcommon = require(__dirname + '/hgcommon.js');
var Promise = require("bluebird");

schema.readSchema(__dirname + config['schema-path'], function(){});

var actions = {
	
	isHookDefined: function(endpoint, hookName) {
		return (typeof this[endpoint] === 'object' && typeof this[endpoint][hookName] === 'function');
	},
	
	// ------------------ Multiple Record Select
	// -----------------------------------------------------------------------
	beforeQuerySelect: function(endpoint, query, request){
		if( this.isHookDefined(endpoint, 'beforeQuerySelect' ) ) {
			return Promise.resolve(this[endpoint].beforeQuerySelect(query, request));
		}
		return Promise.resolve(false);
	},
	
	afterQuerySelect: function(endpoint, request, data){
		if( this.isHookDefined(endpoint, 'afterQuerySelect' ) ) {
			return Promise.resolve(this[endpoint].afterQuerySelect(row, request, body));
		}
		return Promise.resolve(false);
	},
	
	// ------------------ Single Record Select
	// -----------------------------------------------------------------------
	beforeRecordSelect: function(endpoint, query, request){
		if( this.isHookDefined(endpoint, 'beforeRecordSelect' ) ) {
			return Promise.resolve(this[endpoint].beforeRecordSelect(row, request, body));
		}
		return Promise.resolve(false);
	},
	
	afterRecordSelect: function(endpoint, request, data){
		if( this.isHookDefined(endpoint, 'afterRecordSelect' ) ) {
			return Promise.resolve(this[endpoint].afterRecordSelect(row, request, body));
		}
		return Promise.resolve(false);
	},
	
	// ------------------ Record Insert
	// -----------------------------------------------------------------------
	beforeInsert: function(endpoint, row, request, body){
		if( this.isHookDefined(endpoint, 'beforeInsert' ) ) {
			return Promise.resolve(this[endpoint].beforeInsert(row, request, body));
		}
		return Promise.resolve(false);
	},
	
	afterInsert: function(endpoint){  //Lazy not yet defined parameters
		if( this.isHookDefined(endpoint, 'afterInsert' ) ) {
			return Promise.resolve(this[endpoint].afterInsert());
		}
		return Promise.resolve(false);
	},
	
	// ------------------ Record Update
	// -----------------------------------------------------------------------
	beforeUpdate: function(endpoint){ //Lazy not yet defined parameters
		if( this.isHookDefined(endpoint, 'beforeUpdate' ) ) {
			return Promise.resolve(this[endpoint].beforeUpdate());
		}
		return Promise.resolve(false);
	},
	
	afterUpdate: function(endpoint){ //Lazy not yet defined parameters
		if( this.isHookDefined(endpoint, 'afterUpdate' ) ) {
			return Promise.resolve(this[endpoint].afterUpdate());
		}
		return Promise.resolve(false);
	},
	
	// ------------------ Record Delete
	// -----------------------------------------------------------------------
	beforeDelete: function(endpoint){ //Lazy not yet defined parameters
		if( this.isHookDefined(endpoint, 'beforeDelete' ) ) {
			return Promise.resolve(this[endpoint].beforeDelete());
		}
		return Promise.resolve(false);
	},
	
	afterDelete: function(endpoint){ //Lazy not yet defined parameters
		if( this.isHookDefined(endpoint, 'afterDelete' ) ) {
			return Promise.resolve(this[endpoint].afterDelete());
		}
		return Promise.resolve(false);
	},
	
	
	
	accounts: {
		beforeQuerySelect: function(query, request){
			query.whereRaw("account.account_path <> '1'");
			if(!_.isEmpty(request.query.header) && request.query.header == 'true') {
				query.whereRaw('account.flag & 32 = 32');
				query.orderBy(knex.raw('expand_path(account.account_path)'),'asc');
			}
			if(!_.isEmpty(request.query.detail) && request.query.detail == 'true') {
				query.whereRaw('account.flag & 32 = 0');
				query.orderBy('account_no');
			}
			if(request.query.parentAccountPath){
				query.whereRaw("is_direct_child('" + request.query.parentAccountPath + "', account.account_path)");
			}
			if(request.query.parentsOf) {
				query.whereRaw("is_a_child(account.account_path, '" + request.query.parentsOf + "') OR " + 
							   "account.account_path = '" + request.query.parentsOf + "'");
			}
		},

		beforeInsert: function(row, request, body) {
			if(body.parentPath) {
				return knex('account')
				.select('account_path')
				.whereRaw("is_direct_child(?, account.account_path)", [body.parentPath])
				.orderBy(knex.raw('expand_path(account_path)'),'desc')
				.limit(1)
				.then(function(rows){
					var accountPath = rows[0] ? rows[0]['account_path'] : null;
					row['account_path'] = hgcommon.increasePath(accountPath, body.parentPath);
				});
			}
		}	
	}
};

var myPlugin = {
	register: function (plugin, options, next) {

	// /api
	// =============================================================================
	// returns a json list of routes available grouped by classes defined in the schema
	plugin.route({
	    method: 'GET',
	    path: namespace,
	    handler: function (request, reply) {
        	reply({status: 'ok'});
    	}
    });

	// OPTIONS /api/items
	// =============================================================================
    plugin.route({
	    method: 'OPTIONS',
	    path: namespace + '/{plural}',
	    handler: function (request, reply) {
        	reply({status: 'ok'})
        		.header('Access-Control-Allow-Origin', '*')
        		.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        		.header('Access-Control-Allow-Headers', 'X-Requested-With, X-Prototype-Version, X-IP, accept, api_key, content-type');
    	}
    });

    // OPTIONS /api/items/15
	// =============================================================================
    plugin.route({
	    method: 'OPTIONS',
	    path: namespace + '/{plural}/{id}',
	    handler: function (request, reply) {
        	reply({status: 'ok'})
        		.header('Access-Control-Allow-Origin', '*')
        		.header('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
        		.header('Access-Control-Allow-Headers', 'X-Requested-With, X-Prototype-Version, X-IP, accept, api_key, content-type');
    	}
    });

	




	// HTTP GET /api/items?ids[]=5&ids[]=3&ids[]=1&keyword='pepsi'
	// =============================================================================
	// get the metaClass for items from the xml schema using schemaParser
	// prepare the list of columns to be selected
	// ability to retreive only specific ids by filtering with the primary key
	// 		if a field's hidden="true" then not include the field in the select list
	// 		if a class's table name is not defined, use the class name
	// 		if a field's column name is not defined, use the field name
	// 		if a primaryField's column name is not defined, use the field name
	// 		includes ones as fields in the results
	// -----------------
	// get the item metaClass from the schema
	// get the primary key field
	// prepare fields as columns for aditions to the select statement
	//		make sure the select='false' is not set in xml
	//		if column is not set, use name instead
	//		map field columns to field name using 'as' in the select
	// prepare ones as columns for aditions to the select statement
	//		make sure the select='false' is not set in xml
	//		if column is not set, use name instead
	//		map field columns to field name using 'as' in the select
	// add columns to the select query
	// select the item with the specified id 
	// check the results size is ok
	// 		rebase the data to items to class's name: to match ember's data schema
	// catch if model is not found
	// catch if id is not found

	plugin.route({
		method: 'GET',
		path: namespace + '/{plural}',
		handler: function (request, reply) {
			
			//change current class
			schema.lookAt({plural: request.params.plural});
			var classMeta = schema.currentClass;
			
  			//Check if Model is not found in the schema
			if(!classMeta) {
  				reply(Boom.notFound('Model Not Found'));
  			}

  			// get the primary key field
			var primaryField = schema.primaryKey();

  			// generate a basic select Statement
			var query = generateSelect(classMeta);

			// check if ids field is available and an array
			if(_.isArray(request.query.ids)) {
				// console.log(request.query.ids);
				query.whereIn(schema.fieldColumn(primaryField.$.name), request.query.ids);
			}

			// check if limit field is there
			if(!_.isEmpty(request.query.limit)) {
				// console.log(request.query.ids);
				var lim = parseInt(request.query.limit);
				query.limit(lim);

				//Check if page field is there
				//Page is only evaluated if the limit is available
				if(!_.isEmpty(request.query.page)) {
					// console.log(request.query.ids);
					var pg = parseInt(request.query.page) - 1; //so page 1 means 0 means no offset
					var off = pg * lim;
					query.offset(off);
				}
			}

			

			//check if keyword is available
			if(!_.isEmpty(request.query.keyword)) {
				// console.log(request.query.ids);
				// && searchable
				_.forEach(classMeta.field, function(aField) {
					if(aField.$.searchable && aField.$.searchable.toLowerCase() == 'true') {
						// console.log(aField.$);
					query.orWhere(schema.fieldColumn(aField.$.name),'LIKE', '%' + request.query.keyword + '%');
					}
				});
			}

			//check if there is some other query parameters
			_.forIn(request.query, function(value, key) {
				
				// planned special characters support in value:

				// bw: begin with
				// ew: end with
				// cn: contains
				
				// eq: equal
				// ne: not equal
				
				// gt: greater than
				// ge: greater equal
				// lt: less than
				// le: less than
				
				// in: in ()
				// nin: not in ()
				
				// nl: is null
				// nnl: is not null

				// rx: regex

				// extra: make search based on field types

				var aField = schema.field(key);
				if(aField && aField.$ && aField.$.filterable && aField.$.filterable.toLowerCase() == 'true') {
					// key is found as a field in metaClass, let's filter by it
					// console.log('=============================\n' + aField.$.name);
					// console.log(aField);
					// console.log('WHERE ' + schema.fieldColumn(aField.$.name) + ' = ' + value);
					query.where(schema.fieldColumn(aField.$.name) , 'like' , value);
				}
			});

			// emit beforeQuery action
			actions.beforeQuerySelect(request.params.plural, query, request)
				.then(function(){
					return query;
				}).then(function(data){ // execute Select and return results
				// fix many fields
				_(data).forEach(function(record) {
					_(classMeta.many).forEach(function(aManyElement) {
						// console.log(record[aManyElement['$']['name']]);
						if(!_.isEmpty(record[aManyElement['$']['name']]))
							record[aManyElement['$']['name']] = record[aManyElement['$']['name']].split(',');
					});
				});
				
				// rebase the data to class's plural
				var finalData = {};
				finalData[classMeta.$.plural] = data;
				
				// emit afterQuery action
				if(typeof actions !== 'undefined' && 
						actions[request.params.plural] && 
						actions[request.params.plural]['get'] && 
						_.isFunction(actions[request.params.plural]['get']['afterQuery'])) {
					actions[request.params.plural]['get']['afterQuery'](finalData, request);
				}
				
				// send results
				reply(finalData)
					.header('Access-Control-Allow-Origin', '*');
			}).catch(function(err){
				// catch if some error occured
				reply(Boom.badImplementation('Some Sql Error Occured'));
			});
		}
	});




	// HTTP GET /api/items/4
	// =============================================================================
	// get the item metaClass from the schema
	// get the primary key field
	// prepare fields as columns for aditions to the select statement
	//		make sure the select='false' is not set in xml
	//		if column is not set, use name instead
	//		map field columns to field name using 'as' in the select
	// prepare ones as columns for aditions to the select statement
	//		make sure the select='false' is not set in xml
	//		if column is not set, use name instead
	//		map field columns to field name using 'as' in the select
	// add columns to the select query
	// select the item with the specified id 
	// check the results size is ok
	// 		rebase the data to items to class's name: to match ember's data schema
	// catch if model is not found
	// catch if id is not found
    plugin.route({
	    method: 'GET',
	    path: namespace + '/{plural}/{id}',
	    handler: function (request, reply) {
	  		
	  		// change current class
			schema.lookAt({plural: request.params.plural});
			var classMeta = schema.currentClass;
			
  			// check if Model is not found in the schema
			if(!classMeta) {
  				reply(Boom.notFound('Model Not Found'));
  			}

  			// generate a basic select Statement
			var query = generateSelect(classMeta);

			// get the primary key field
			var primaryField = schema.primaryKey();

			// select the record with the specified id 
			query.where(schema.fieldColumn(primaryField.$.name)	, request.params.id);


			// execute query
			query.then(function(data){
				if(_.size(data) > 0) {
					var record = data[0];

					// fix many fields and convert to array
					_(classMeta.many).forEach(function(aManyElement) {
						if(!_.isEmpty(record[aManyElement['$']['name']]))
							record[aManyElement['$']['name']] = record[aManyElement['$']['name']].split(',');
					});
					
					// rebase the data to class's name
					var finalData = {};
					finalData[classMeta.$.name] = record;
					
					// send results
					reply(finalData)
						.header('Access-Control-Allow-Origin', '*');
				} else {
					// error, no results
					reply(Boom.notFound('Model Instance Id Not Found'));
				}
			}).catch(function(err){
				// catch if some error occured
				reply(Boom.badImplementation('Some Sql Error Occured'));
			});

	  	}
	});


	// HTTP POST /api/items
	// =============================================================================
	// get the item metaClass from the schema
	// prepare fields to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// prepare ones to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// add values to select statement
	// capture the last insert id
	// select the last inserted record and return it using same logic as with select
	// catch if model is not found
	plugin.route({
	    method: 'POST',
	    path: namespace + '/{plural}',
	    handler: function (request, reply) {
	    	//change current class
			schema.lookAt({plural: request.params.plural});
			var classMeta = schema.currentClass;

  			//check if model is available is the schema
  			if(!classMeta) {
  				reply(Boom.notFound('Model Not Found for post model'));
  			}

			var className = classMeta.$.name;
			var body = request.payload[schema.decapitalize(className)];

			if(!body) {
				reply(Boom.notFound('Wrong base for ' + request.params.plural + '. Expected ' + classMeta.$.name + ' as a base for the record.'));
			}

			var row = {};
			var isInsertable, isPrimaryKey, isIncoming, columnName, fieldName;

			// prepare fields for aditions to the select statement
			_(classMeta.field).forEach(function(aFieldElement) { 
				// make sure the field is insertable
				fieldName = aFieldElement.$.name;
				columnName = schema.fieldColumn(fieldName);
				isInsertable = schema.fieldInsertable(fieldName);
				isPrimaryKey = schema.isPrimaryKey(fieldName);
				isIncoming = !_.isUndefined(body[fieldName]);
				if(isInsertable && !isPrimaryKey && isIncoming) {
					row[columnName] = body[fieldName];
				}
			});

			// prepare fields for aditions to the select statement
			_(classMeta.one).forEach(function(aOne) { 
				// make sure the field is selectable
				fieldName = aOne.$.name;
				columnName = schema.oneColumn(fieldName);
				isInsertable = schema.oneInsertable(fieldName);
				isPrimaryKey = schema.isPrimaryKey(fieldName);
				isIncoming = !_.isUndefined(body[fieldName]);
				if(isInsertable && !isPrimaryKey && isIncoming) {
					row[columnName] = body[fieldName];
				}
			});
			
			console.log('********* Before Calling Function 1');
			actions.beforeInsert(request.params.plural, row, request, body)
			.then(function(){
				console.log('********* After Calling Funcion 3');
				console.dir(row);
				return  knex(schema.table()).insert(row);
			}).then(function(id){
					id = id[0];
					//--------------------------------------- insert many field if insertable and has values
  				_(classMeta.many).forEach(function(aManyElement) {
  					// Strategy:
  					// 		DELETE FROM PatientDrug WHERE patientId = {id}
  					// 		INSERT INTO PatientDrug (patientId, drugId) VALUES ({ID}, )
  					
	  				var fieldName = aManyElement['$']['name'];
  					var values = request.payload[className][fieldName];
  					
  					// Make sure that values exsist and incoming in request for this many field
  					if(_.size(values) > 0) {
	  					var throughTable = aManyElement['$']['through'];
	  					var throughRows = [];

	  					_(values).forEach(function(value) {
	  						var throughRow = {};
	  						throughRow[aManyElement['$']['throughLocalField']] = id;
	  						throughRow[aManyElement['$']['throughForiegnField']] = value;
	  						throughRows.push(throughRow);
	  					});

	  					//Insert throughRecords
	  					var q = knex.insert(throughRows)
		  					.into(throughTable);
	  					// console.log(q.toSQL());
		  				q.then();
  					}
  				});
  				
				//------------------------------------ copy the select section
  				// generate select query
  				var query = generateSelect(classMeta);

  				// get the primary key field
  				var primaryField = _.find(classMeta.field, function(aField) {
					return aField.$.primaryKey == 'true';
				});

  				// select the record with the specified id 
  				query.where(schema.fieldColumn(primaryField.$.name)	, id);

  				// execute the select query
  				query.then(function(data){
  					if(_.size(data) > 0) {	//Record Found, No Error
  						console.log(data);
  						
  						var record = data[0];
	  					// fix many fields and convert to array
	  					_(classMeta.many).forEach(function(aManyElement) {
	  						if(!_.isEmpty(record[aManyElement['$']['name']]))
	  							record[aManyElement['$']['name']] = record[aManyElement['$']['name']].split(',');
  						});
  						
  						// rebase the data to class's name
	  					var finalData = {};
	  					finalData[classMeta.$.name] = record;
	  					
	  					// send results
	  					reply(finalData)
	  						.header('Access-Control-Allow-Origin', '*');
  					} else { 
						// Error, No results from the select
  						reply(Boom.notFound('Some error occured. Could not reselect the inserted record.'));
  					}
  				}).catch(function(err){
  					// Error related to reselction of the inserted record
					console.dir(err);
  					reply(Boom.wrap(err), 500);
  				});
			}).catch(function(err){
				// Error prbably related to insert query
				console.dir(err);
				reply(Boom.wrap(err));
			});
    	}
    });

	// HTTP PUT /api/items
	// =============================================================================
	// get the item metaClass from the schema
	// prepare fields to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// prepare ones to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// add values to select statement
	// capture the last insert id
	// select the last inserted record and return it using same logic as with select
	// catch if model is not found
    plugin.route({
	    method: 'PUT',
	    path: namespace + '/{plural}/{id}',
	    handler: function (request, reply) {
	    	//change current class
			schema.lookAt({plural: request.params.plural});
			var classMeta = schema.currentClass;

  			//check if model is available is the schema
  			if(!classMeta) {
  				reply(Boom.notFound('Model Not Found for post model'));
  			}

			
			// get the primary key field
			var primaryField = schema.primaryKey();

			var className = classMeta.$.name;
			var obj = request.payload[schema.decapitalize(className)];

			if(!obj) {
				reply(Boom.notFound('Wrong base for ' + request.params.plural + '. Expected ' + classMeta.$.name + ' as a base for the records.'));
			}

			var row = {};
			var isUpdatable, isPrimaryKey, isIncoming, columnName, fieldName;

			// prepare fields for aditions to the select statement
			_(classMeta.field).forEach(function(aFieldElement) { 
				// make sure the field is updatable
				fieldName = aFieldElement.$.name;
				columnName = schema.fieldColumn(fieldName);
				isUpdatable = schema.fieldUpdateble(fieldName);
				isPrimaryKey = schema.isPrimaryKey(fieldName);
				isIncoming = !_.isUndefined(obj[fieldName]);
				if(isUpdatable && !isPrimaryKey && isIncoming) {
					row[columnName] = obj[fieldName];
				}
			});

			// prepare fields for aditions to the select statement
			_(classMeta.one).forEach(function(aOne) { 
				// make sure the field is selectable
				fieldName = aOne.$.name;
				columnName = schema.oneColumn(fieldName);
				isUpdatable = schema.oneUpdateble(fieldName);
				isPrimaryKey = schema.isPrimaryKey(fieldName);
				isIncoming = !_.isUndefined(obj[fieldName]);
				if(isUpdatable && !isPrimaryKey && isIncoming) {
					row[columnName] = obj[className][fieldName];
				}
			});

			// execute update query
			knex(schema.table())
				.update(row)
				.where(schema.fieldColumn(primaryField.$.name), '=', request.params.id)
				.then(function(){
					//------------------------------------- insert many field if insertable and has values
  				_(classMeta.many).forEach(function(aManyElement) {
  					// Strategy:
  					// 		DELETE FROM PatientDrug WHERE patientId = {id}
  					// 		INSERT INTO PatientDrug (patientId, drugId) VALUES ({ID}, )
  					
	  				var fieldName = aManyElement['$']['name'];
  					var values = request.payload[className][fieldName];
  					
  					// Make sure that values exsist and incoming in request for this many field
  					if(_.size(values) > 0) {
	  					var throughTable = aManyElement['$']['through'];
	  					var throughRows = [];

	  					_(values).forEach(function(value) {
	  						var throughRow = {};
	  						throughRow[aManyElement['$']['throughLocalField']] = request.params.id;
	  						throughRow[aManyElement['$']['throughForiegnField']] = value;
	  						throughRows.push(throughRow);
	  					});

	  					//Delete All Records
	  					knex(throughTable)
	  						.where(aManyElement['$']['throughLocalField'], request.params.id)
	  						.del()
	  						.then(function(numRowsAffected){
			  					//Insert throughRecords
			  					return knex
			  						.insert(throughRows)
			  						.into(throughTable);
	  						});
  					}
  				});

				//------------------------------------ copy the select section
				// generate select query
  				var query = generateSelect(classMeta);

  				// get the primary key field
  				var primaryField = _.find(classMeta.field, function(aField) {
					return aField.$.primaryKey == 'true';
				});

  				// select the record with the specified id 
  				query.where(schema.fieldColumn(primaryField.$.name)	, request.params.id);

  				// execute query
  				query.then(function(data){
  					if(_.size(data) > 0) { // Record Found, No Error
  						var record = data[0];
  						
  						// Rebase the data to class's name
	  					var finalData = {};
	  					finalData[classMeta.$.name] = record;
	  					
	  					// Send results
	  					reply(finalData)
	  						.header('Access-Control-Allow-Origin', '*');
  					} else {
  						// Error, no results found
  						reply(Boom.notFound('Model Instance Id Not Found'));
  					}
  				}).catch(function(err){
  					// catch if models id is not found
  					reply(Boom.notFound('Some SQL Error'));
  				});
					//------------------------------------
			}).catch(function(err){
				// catch if models id is not found
				reply(Boom.notFound('Some SQL Error Occured'));
			});
    	}
    });

	// HTTP DELETE /api/items
	// =============================================================================
	// get the item metaClass from the schema
	// prepare fields to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// prepare ones to be inserted
	//		must be insertable
	//		must be not primary key
	//		must be in the request pay load
	//		add the {columnName:value} from the json payload
	// add values to select statement
	// capture the last insert id
	// select the last inserted record and return it using same logic as with select
	// catch if model is not found
    plugin.route({
	    method: 'DELETE',
	    path:  namespace + '/{plural}/{id}',
	    handler: function (request, reply) {
	    	
	    	//change current class
			schema.lookAt({plural: request.params.plural});
			var classMeta = schema.currentClass;

  			//check if model is available is the schema
  			if(!classMeta) {
  				reply(Boom.notFound('Model Not Found for post model'));
  			}

			//get the primary key field
			var primaryField = schema.primaryKey();

			//TODO: Delete Many Related Data

			// execute delete query
			knex(schema.table())
				.where(schema.fieldColumn(primaryField.$.name), request.params.id)
				.del()
				.then(function(id){
					//Send results
	  				reply({status: "Record deleted successfully"})
	  				.header('Access-Control-Allow-Origin', '*');
				}).catch(function(err){
					// catch if models id is not found
					reply(Boom.notFound('Some SQL Error Occured:' + err));
				});
    	}
    });

	//Move Next
    next();
}
};

myPlugin.register.attributes = {
  pkg: require('../package.json')
};

module.exports = myPlugin;


// General Select Function
// =============================================================================
// the purpose of this funtion is generate a common basic select query that can be used by other functions
// it selects only the selectable fields and ones
// it fixes many fields using group_concat(id) function specific to mysql

function generateSelect(classMeta){
	var columns = [];	//Columns to be selected

	//Get the primaryKey field
	var primaryField = _.find(classMeta.field, function(field) {
		return field.$.primaryKey == 'true';
	});


	//Prepare fields for aditions to the select statement
	_(classMeta.field).forEach(function(aFieldElement) { 
		// make sure the field is selectable
		if(schema.fieldSelectable(aFieldElement.$.name)) {
			// SELECT Columns as Names
			if(schema.isPrimaryKey(aFieldElement.$.name)){
				columns.push(schema.fieldColumn(aFieldElement.$.name) + ' as id');
			} else {
				columns.push(schema.fieldColumn(aFieldElement.$.name) + ' as ' + aFieldElement.$.name);
			}
		}
	});

	//Prepare ones for aditions to the select statement
	_(classMeta.one).forEach(function(aOneElement) {
		// make sure the relation is selectable
		if(schema.oneSelectable(aOneElement.$.name))
			columns.push(schema.oneColumn(aOneElement.$.name) + ' as ' + aOneElement.$.name);
	});
	
	//Prepare the select query
	var query = knex.select(columns)
		.from(schema.table())
		.limit(50);

	//Prepare many relationship subqueries
	_(classMeta.many).forEach(function(aManyElement) {
		// SELECT group_concat(drugid)
		// FROM patientdrug
		// WHERE patientid = 1;
		var subQuery = knex.select(knex.raw('group_concat(' + aManyElement['$']['throughForiegnField'] + ')'))
			.from(aManyElement['$']['through'])
			.whereRaw(
				aManyElement['$']['through'] + '.' + aManyElement['$']['throughLocalField'] + ' = ' +
				schemaParser.classTable(classMeta) + '.' + aManyElement['$']['localField']
				)
			.as(aManyElement['$']['name']);
		// add subQuery to main select statement
		query.select(subQuery);
		// console.log(q.toSQL());
	});

	return query;
}