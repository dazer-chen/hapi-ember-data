// Load modules
var _ = require('lodash');
var fs = require('fs');
var xml2js = require('xml2js');

module.exports = {
	version: '0.0.1',
	schema: null,
	currentClass: null,
	file: null,

	//readSchema:
	//Check filePath is valid and exsists
	//Read the xml file
	//use xml2js to convert the xml file to object
	//store object in local self for later reference
	readSchema: function(filePath, callback_) {
		try {
			var parser = new xml2js.Parser();
			self = this;
			fs.readFile(filePath, function(err, xml) {
				parser.parseString(xml, function (err, data) {
					self.schema = data['mappings'];
					callback_();
				});
			});
		} catch (ex) {
			console.log("YH Schema Parser Error. File: '" + filePath + "'.");
			console.log(ex);
		}
	},

	lookAt: function(options) {
		//options support finding class by plural, table, name, in the following order:
		//options = {plural: 'items'}
		//options = {table: item}
		//options = {name: Item}
		var found = false;
	    this.currentClass = _.find(this.schema['class'], function(aClass){
	    	if(options['plural']) {
	    		found = true;
	        	return aClass.$.plural.toLowerCase() == options.plural.toLowerCase();
	    	} else if(options['table']) {
	    		found = true;
	    		return aClass.$.table.toLowerCase() == options.table.toLowerCase();
	    	} else if(options['name']) {
	    		found = true;
	    		return aClass.$.name.toLowerCase() == options.name.toLowerCase();
	    	}
	    });
	    return found;
	},

	metaClass: function(options) {
	    return this.currentClass;
	},

	primaryKey: function() {
		var field;
		field = _.find(this.currentClass.field, function(aField){
	        return aField['$']['primaryKey'].toLowerCase() == 'true';
	    });
	    return field;
	},

	isPrimaryKey: function(fieldName) {
		var aField = this.field(fieldName);
	    //Default is true
	    var isPrimary = !_.isEmpty(aField.$.primaryKey) && (aField.$.primaryKey.toLowerCase() == 'true')
	    return isPrimary;
	},

	table: function() {
		if(_.isEmpty(this.currentClass.$.table)) {
		    // if table attribute is not set then return the class name value
		    return this.currentClass.$.name;
		} else {
		    // else return the column value
		    return this.currentClass.$.table;
		}
	},
	
	//Field Related Functions
	//----------------------------------------

	field: function(fieldName) {
		return _.find(this.currentClass.field, function(aField){
	        return aField['$']['name'].toLowerCase() == fieldName.toLowerCase();
	    });
	},

	fieldColumn: function(fieldName) {
		var aField = this.field(fieldName);
		if(_.isEmpty(aField.$.column)) {
		    // if column is not set then return the name value
		    return aField.$.name;
		} else {
		    // else return the column value
		    return aField.$.column;
		}
	},

	fieldInsertable: function(fieldName){
		var aField = this.field(fieldName);
		//Default is true
		var notInsertable = !_.isEmpty(aField.$.insert) && (aField.$.insert.toLowerCase() == 'false')
		return !notInsertable;
	},

	fieldUpdateble: function(fieldName) {
		var aField = this.field(fieldName);
		//Default is true
		var notUpdateable = !_.isEmpty(aField.$.update) && (aField.$.update.toLowerCase() == 'false')
		return !notUpdateable;
	},

	fieldSelectable: function(fieldName) {
		var aField = this.field(fieldName);
	    //Default is true
	    var notSelectable = !_.isEmpty(aField.$.select) && (aField.$.select.toLowerCase() == 'false')
	    return !notSelectable;
	},

	//One Related Functions
	//----------------------------------------

	one: function(oneName) {
		return _.find(this.currentClass.one, function(aOne){
	        return aOne['$']['name'].toLowerCase() == oneName.toLowerCase();
	    });
	},

	oneColumn: function(oneName) {
		var aOne = this.one(oneName);
		if(_.isEmpty(aOne.$.column)) {
		    // if column is not set then return the name value
		    return aOne.$.name;
		} else {
		    // else return the column value
		    return aOne.$.column;
		}
	},

	oneInsertable: function(oneName){
		var aOne = this.one(oneName);
		//Default is true
		var notInsertable = !_.isEmpty(aOne.$.insert) && (aOne.$.insert.toLowerCase() == 'false')
		return !notInsertable;
	},

	oneUpdateble: function(oneName) {
		var aOne = this.one(oneName);
		//Default is true
		var notUpdateable = !_.isEmpty(aOne.$.update) && (aOne.$.update.toLowerCase() == 'false')
		return !notUpdateable;
	},

	oneSelectable: function(oneName) {
		var aOne = this.one(oneName);
	    //Default is true
	    var notSelectable = !_.isEmpty(aOne.$.select) && (aOne.$.select.toLowerCase() == 'false')
	    return !notSelectable;
	},

	//Many Related Functions
	//----------------------------------------

	many: function(manyName) {
		return _.find(this.currentClass.many, function(aMany){
	        return aMany['$']['name'].toLowerCase() == manyName.toLowerCase();
	    });
	},

	decapitalize: function(str)
	{
	    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toLowerCase() + txt.substr(1);});
	}

};