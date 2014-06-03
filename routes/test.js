var url = require("url");
var util = require('util');
var path = require("path");
var fs = require("fs");

var MongoClient = require('mongodb').MongoClient;


    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
        collection.find().toArray(function(err, results) {
           console.log(results.length);
           for(i=0;i<results.length;i++) {
              console.log("update "+results[i]["_id"]);
	      collection.update({"_id": results[i]["_id"] }, { "$set": { "fields.loc" : { "type" : "Point", "coordinates": [ results[i]["fields"]["location"][0], results[i]["fields"]["location"][1]]}}},{}, function(err,data) { console.log(err); });
	      console.log("updated "+results[i]["_id"]);
           }
         });
    });

