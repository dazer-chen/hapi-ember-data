// Load modules
var _ = require('lodash');
var fs = require('fs');
var xml2js = require('xml2js');
var JSONSelect = require('JSONSelect');

var hgSchemaParser = exports;

hgSchemaParser.isPrimaryKey = function(aField) {
    //Default is true
    var isPrimary = 
        !_.isEmpty(aField.$.primaryKey)
        && (aField.$.primaryKey.toLowerCase() == 'true')
    return isPrimary;
}

hgSchemaParser.isSelectable = function(aField) {
    //Default is true
    var notSelectable = 
        !_.isEmpty(aField.$.select)
        && (aField.$.select.toLowerCase() == 'false')
    return !notSelectable;
}

hgSchemaParser.isInsertable = function(aField) {
    //Default is true
    var notInsertable = 
        !_.isEmpty(aField.$.insert)
        && (aField.$.insert.toLowerCase() == 'false')
    return !notInsertable;
}


hgSchemaParser.isUpdatable = function(aField) {
    //Default is true
    var notUpdateable = 
        !_.isEmpty(aField.$.update)
        && (aField.$.update.toLowerCase() == 'false')
    return !notUpdateable;
}


hgSchemaParser.fieldColumn = function(aField) {
    if(_.isEmpty(aField.$.column)) {
        // if column is not set then return the name value
        return aField.$.name;
    } else {
        // else return the column value
        return aField.$.column;
    }
}

hgSchemaParser.classTable = function(aClass) {
    if(_.isEmpty(aClass.$.table)) {
        // if table attribute is not set then return the class name value
        return aClass.$.name;
    } else {
        // else return the column value
        return aClass.$.table;
    }
}


hgSchemaParser.replaceKey = function(obj, oldKey, newKey) {
    if (obj.hasOwnProperty(oldKey) &&  oldKey !== newKey) {
        Object.defineProperty(obj, newKey,
            Object.getOwnPropertyDescriptor(obj, oldKey));
        delete obj[oldKey];
    }
}

hgSchemaParser.getPrimaryKey = function(options, callback_) {
    //Options: name | plural | table, path
    //Validations And Logic:
        //Options is valid
        //File path should be configurable
        //File should be found
        //File should be valid xml
        //JSON Selector should be based on a valid option
        //Options Keyword should be found
        //Return atleast one object representing the class
    try {
        var filePath = options.path;
        var parser = new xml2js.Parser();
        fs.readFile(filePath, function(err, data) {
            parser.parseString(data, function (err, data) {
                var selector = ':has(:root > :root > .plural:val("' + options.plural + '"))';
                var resultObjects = JSONSelect.match(selector, data);
                if(resultObjects[0]) {
                    var primaryField = _.find(resultObjects[0].field, function(aField) {
                        return aField.primaryKey == 'true';
                    });
                    console.log(primaryField);
                    callback_(primaryField);
                } else {
                    callback_(null);
                }
            });
        });
    } catch (ex) {
        console.log("HG Schema Parser Error. File: '" + filePath + "'.");
        console.log(ex);
    }
};

hgSchemaParser.getClass = function(options, callback_) {
	//Options: name | plural | table, path
	//Validations And Logic:
		//Options is valid
		//File path should be configurable
		//File should be found
		//File should be valid xml
		//JSON Selector should be based on a valid option
		//Options Keyword should be found
		//Return atleast one object representing the class
    try {
        var filePath = options.path;
        var parser = new xml2js.Parser();
        fs.readFile(filePath, function(err, data) {
            parser.parseString(data, function (err, data) {
                classMeta = _.find(data['mappings']['class'], function(aClass){
                    return aClass.$.plural.toLowerCase() == options.plural.toLowerCase();
                });

                if(classMeta)
                	callback_(classMeta);
                else
                	callback_(null);
            });
        });
    } catch (ex) {
        console.log("HG Schema Parser Error. File: '" + filePath + "'.");
        console.log(ex);
    }
};

hgSchemaParser.getMappings = function(options, callback_) {
	//Options: path
	//Validations And Logic:
		//Options is valid
		//File path should be configurable
		//File should be found
		//File should be valid xml
    try {
        var filePath = options.path;
        var parser = new xml2js.Parser();
        fs.readFile(filePath, function(err, data) {
            parser.parseString(data, function (err, data) {
            	var selector = '.class';
            	var resultObjects = JSONSelect.match(selector, data);
                if(resultObjects[0])
                	callback_(resultObjects);
                else
                	callback_(null);
            });
        });
    } catch (ex) {
        console.log("HG Schema Parser Error. File: '" + filePath + "'.");
        console.log(ex);
    }
};