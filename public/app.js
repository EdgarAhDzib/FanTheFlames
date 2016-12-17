// Get the JSON from the newsfeed collection
$.getJSON("/headlines", function(data) {
	// For each document
	for (var i = 0; i < data.length; i++) {
		// assign document id as attribute to each P element, and provide title and link
		$("#headlines").prepend("<div><h4><span class='snippet' id='" + data[i]._id + "'>" + data[i].title + "</span></h4><h5><a href='" + data[i].link + "' target='_blank'>" + data[i].link + "</a></h5></div>");

		for (var j =0; j < data[i].comments.length; j++) {
			//Create empty DIV elements that will populated with comment body text with the getJSON("/comments") function
			//Each empty DIV and Delete button will receive a common identifier from the comments' data
			//$("#" + data[i]._id).append("<h5><div class='newsComment' id='" + data[i].comments[j] + "'><br/><button class='eraseComment' id='comm" + data[i].comments[j] + "'>I will silence my opponents!</button></div></h5>");
			$("<h5><div class='newsComment' id='" + data[i].comments[j] + "'><br/><button class='eraseComment' id='comm" + data[i].comments[j] + "'>I will silence my opponents!</button></div></h5>").insertAfter("a");
		}
	}

});

// Get the JSON from the comments collection
$.getJSON("/comments", function(data) {
	for (var i=0; i<data.length; i++) {

		//Populate each created DIV with the comment body text, which will be matched to the comment ID previously assigned
		//from the getJSON("/headlines") function
		$('#' + data[i]._id).prepend("<span class='commentBody' id='span" + data[i]._id + "'>" + data[i].body + "</span>");
	}

	//After populating the comments with their articles, remove those with empty values from the DOM
	$(".newsComment").each(function(index,value){
		var commText = $(this).find('.commentBody').text();
		if (commText.length === 0){
			$(this).remove();
		}
	});
});

// Get the JSON from the users collection
$.getJSON("/users", function(data) {
	for (var i=0; i<data.length; i++) {

		//Find all comments associated with User[i] and prepend the User name
		for (var j=0; j<data[i].comments.length; j++) {
			$('#' + data[i].comments[j]).prepend("<em><a href= 'users/" + data[i].name + "'>" + data[i].name + "</a> sez:</em> ");
		}
	}
});

$(document).on("click", ".snippet", function(){
	//Get the id of the current "snippet" division
	var currId = $(this).attr('id');

	//Return to top of page upon click
	$("html, body").animate({ scrollTop: 0 },{duration: 500, queue: false});
	
	//Empty the comments window if already occupied
	$("#postItNote").empty();

	// Ajax call to get the selected article
	$.ajax({
		method: "GET",
		url: "/headlines/" + currId
	})
	// Attach data from the selection to the note
	.done(function(data) {
		// Article title
		$("#postItNote").append("<h2>" + data.title + "</h2>");
		// Input for user name
		$("#postItNote").append("<h4>Your Handle Name: <input type='text' id='nameinput' name='username' ></h4>");
		// Input for user password
		// $("#postItNote").append("<h4>Password: <input type='password' id='pw' name='userpw' ></h4>");
		// Textarea for comment body
		$("#postItNote").append("<h4>Comments:</h4><textarea rows='10' cols='50' id='bodyinput' name='body'></textarea><br/><br/>");
		// A button to submit a new comment, with the id of the article saved to it
		$("#postItNote").append("<button data-id='" + data._id + "' id='savenote'>Flame On!</button>");
	});

});

// Click the savenote button
$(document).on("click", "#savenote", function() {
	// Grab the id associated with the headline from the submit button
	var headlineId = $(this).attr("data-id");

	// Run a POST request to save the note, using what's entered in the inputs
	$.ajax({
		method: "POST",
		url: "/headlines/" + headlineId,
		data: {
			// Value from user name
			name: $('#nameinput').val(),
			// Value from password field
			// password: $('#pw').val(),
			// Value taken from comment textarea
			body: $("#bodyinput").val()
		}
	})
	// With that done
	.done(function(data) {
		// Empty the notes section
		$("#postItNote").empty();
	});

	// Blank out the values entered in the input and textarea for comment entry
	$("#nameinput").val("");
	//$("#pw").val();
	$("#bodyinput").val("");
});

//Click the button to erase a comment by its commID marker
$(document).on("click", ".eraseComment", function(){
	var currButton = $(this).attr("id");
	var splicedVal = currButton.substring(4);
	console.log(splicedVal);

	$.ajax({
		method: "POST",
		url: "/delete/" + splicedVal,
		data: {
			// Value from clicked button
			id: splicedVal
		}
	});
});