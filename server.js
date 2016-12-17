// Dependencies
var request = require("request");
var cheerio = require("cheerio");
var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Invoke Models: Comment, User, and Feed
var Comment = require("./models/Comment.js");
var User = require("./models/User.js");
var Feed = require("./models/Feed.js");

//Import Mongo keys
var Keys = require("./keys.js");

//Establish the Mongo connection
const creds = `${Keys.mongo.username}:${Keys.mongo.password}@`;
const mongoSuffix = `${Keys.mongo.hostname}:${Keys.mongo.port}/${Keys.mongo.database}`;
const connString = creds.length > 2 ? 'mongodb://' + creds + mongoSuffix : 'mongodb://' + mongoSuffix;

const mongoConnection = connString;
const PORT = process.env.PORT || 3000;

// Mongoose mpromise deprecated - use bluebird promises
var Promise = require("bluebird");
mongoose.Promise = Promise;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
//app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

// Make public a static dir
app.use(express.static("./public", {index: false} ) );

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/newsfeeddb");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
	console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
	console.log("Mongoose connection successful.");
});

app.get('/', function(req, response) {

	request("http://www.foxnews.com", function(error, response, html) {

		var $ = cheerio.load(html);

		//Initialize array to store scraped data
		var result = {};

		// Use cheerio to find each li with the vr-content data type
		// (i: iterator. element: the current element)
		$("section#latest").find("li").each(function(i, element) {

			// Save the text of the element (this) in a "title" variable
			result.title = $(element).children().text();
			result.link = $(element).find("a").attr("href");

			// Create new entry via the Feed model
			// This effectively passes the result object to the entry (and the title and link)
			var entry = new Feed(result);

			//Check whether link is already in db: if count is one or higher, ignore; if count is 0, save new entry
			//The titles from Fox News sometimes get combined, yielding a different value even when the link is identical

			Feed.count({link: entry.link}, function(err,count) {
			 	if (err) throw err;
			 	if (count < 1) {
					// Save the entry to the db
					entry.save(function(err, doc) {
					  // Log any errors
						if (err) {
							console.log(err);
						}
						// Or log the doc
						else {
							console.log(doc);
						}
					});					
			 	}
			});
		});
	});
//The response may need to go in here, it throws error as index.html undefined
	// Announce when the scrape is completed
	response.sendFile(__dirname + "/public/index.html");;

});

//Find all headlines
app.get('/headlines', function(req,response){
	Feed.find({}, function (err, doc){
		if (err) {
			console.log(err);
		} else {
			response.json(doc);
		}
	});
});

//Find all comments
app.get('/comments', function(req, response){
	Comment.find({}, function(err, doc){
		if (err) {
			console.log(err);
		} else {
			response.json(doc);
		}
	});
});

//Find all users
app.get('/users', function(req, response){
	User.find({}, function(err, doc){
		if (err) {
			console.log(err);
		} else {
			response.json(doc);
			//get the comments for each user
		}
	});
});

// Select a headlined article by its ObjectId
app.get("/users/:name", function(req, res) {
	// Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
	User.findOne({ "name": req.params.name })
	// Populate all of its associated comments
	.populate("comments")
	// now, execute our query
	.exec(function(error, doc) {
		// Log any errors
		if (error) {
			console.log(error);
		}
		// Otherwise, send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});

// Select a headlined article by its ObjectId
app.get("/headlines/:id", function(req, res) {
	// Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
	Feed.findOne({ "_id": req.params.id })
	// Populate all of its associated comments
	.populate("comments")
	// now, execute our query
	.exec(function(error, doc) {
		// Log any errors
		if (error) {
			console.log(error);
		}
		// Otherwise, send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});

// Create a new comment
app.post("/headlines/:id", function(req, response) {
	// Create a new comment and pass the req.body to the entry
	// Retrieve the user name, pass this to User model to check before saving

	var newComment = new Comment(req.body);

	var userName = req.body.name;
	console.log(userName);

	//Create new User if the name doesn't already exist
	User.count({name: userName}, function(err,count) {
		if (err) throw err;
		console.log(count);
		if (count < 1) {

			// Create a new user by using the User model as a class
			// The "unique" rule in the User model's schema will prevent duplicate users from being added to the server
			var Author = new User({
				name: userName,
				comments: [newComment]
			});
			// Using the save method in mongoose, create user in db
			Author.save(function(error, doc) {
				// Log any errors
				if (error) {
					console.log(error);
				}
				// Or log the doc
				else {
					console.log(doc);
				}
			});
		}
	});

	// Save the new comment to the db
	newComment.save(function(error, doc) {
		// Log any errors
		if (error) {
		console.log(error);
		}
		// Otherwise
		else {
			// Use the article id to find and add its note
			
			Feed.findOneAndUpdate({ "_id": req.params.id }, { $push: { "comments": doc._id } }, {new: true})
			// Execute the above query
			.exec(function(err, feedDoc) {
				// Log any errors
				if (err) {
					console.log(err);
				}
				else {
					// Or send the document to the browser
					// This seems to be causing a crash on reload after posting
					// response.send(feedDoc);
					// response.redirect('/');
				}
			});

			//Apply to both User and Feed models
			User.findOneAndUpdate({name: userName}, { $push: { "comments": doc._id } }, { new: true }, function(err, newdoc) {
				// Send any errors to the browser
				if (err) {
					response.send(err);
				}
				// Or send the newdoc to the browser
				// else {
				// 	res.send(newdoc);
				// }
			});
		}
		response.redirect('/');
	}); //Closes the whole SAVE function

});

//Delete a selected comment by its ID
app.post('/delete/:id', function(request, response){
	var currId = request.params.id;
	Comment.remove({ _id: currId }, function(err, data) {
		// TODO: Unset with user
		// TODO: Unset with feed
		// TODO: Send the updated comments
		User.update( {}, {$unset: {comments: currId} }, function(err, data) {
			Feed.update( {}, {$unset: {comments: currId} }, function(err, data) {
				Comment.find({}, function(err, data) {
				if (err) {
					throw err;
				} else {
					response.json(data);
				}
				})
			})
		})
	});
});

// Listen on Port 3000
app.listen(3000, function() {
	console.log("App running on port 3000!");
});