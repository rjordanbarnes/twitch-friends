if (localStorage.getItem("streamers") === null) {
	localStorage.setItem("streamers", ["TrumpSC", "TurtleKiddy"]);
}

var streamers = localStorage.getItem("streamers").split(",");
var eventHandlersDisabled = true;

var onlineStreamers = [];
var offlineStreamers = [];

function addFriends(friendList) {
	// Takes a list of friends separated by commas and adds them to the streamers array
	cleanedFriendList = friendList.replace(/\s+/g, '');

	var newFriends = cleanedFriendList.split(",");
	for (var i = 0; i < newFriends.length; i++) {
		if (streamers.indexOf(newFriends[i].toLowerCase()) === -1 && newFriends[i].length > 0) {
			streamers.push(newFriends[i].toLowerCase());
		}
	}
	localStorage.setItem("streamers", streamers);
	reBuildApp();
}

function buildFriendDiv(status, streamerData) {
  // Builds the divs that contain the streamer logo, link, name, status, and game.
  var htmlOutput = "";
  var name = streamerData.display_name;
  var displayedStatus = status;
  var icon = streamerData.logo;
  var game = streamerData.game;
  var link = streamerData.url;
  
  if (icon === null) {
    icon = "http://static-cdn.jtvnw.net/jtv-static/404_preview-300x300.png";
  }
  
  if ([404, 422].indexOf(streamerData.status) !== -1){
    switch(streamerData.status) {
      case 404:
        displayedStatus = "Doesn't Exist";
      case 422:
        displayedStatus = "Invalid Account";
      default:
        status = "Offline";
        name = streamerData.message.split("'")[1];
        icon = "http://static-cdn.jtvnw.net/jtv-static/404_preview-300x300.png";
        link = "#";
    }
  }

  if (status === "Offline") {
    game = "";
  }

  htmlOutput += '<div class="friend ' + status.toLowerCase() + '">';
  htmlOutput += '<a target="_blank" href="' + link + '">';
  htmlOutput += '<img class="border-' + status.toLowerCase() + '" src="' + icon + '"></a>';
  htmlOutput += '<ul class="' + status.toLowerCase() + '-color">';
  htmlOutput += '<li class="streamer-name">' + name + '</li>';
  htmlOutput += '<li>' + displayedStatus + '</li>';
  htmlOutput += '<li>' + game + '</li>';
  htmlOutput += '</ul></div>';

  return htmlOutput;
}

function buildApp() {
	var streamersProcessed = 0;

	streamers.forEach(function(streamerName) {
    $.getJSON("https://api.twitch.tv/kraken/streams/" + streamerName + "?callback=?", function(streamerData) {
      // First sort the streamers into an Array of Online streamers and an Array of Offline streamers
      sortStreamer(streamerName, streamerData);
      var totalFriends = onlineStreamers.length + offlineStreamers.length;
      $(".friend-title").text(totalFriends + " FRIENDS");
      $(".in-game-friend-count").text(onlineStreamers.length + " IN GAME");
      $(".offline-friend-count").text(offlineStreamers.length + " OFFLINE");
      streamersProcessed++;
      if (streamersProcessed === streamers.length) {
        // Then sort the arrays alphabetically and display them in the list.
        sortByName(onlineStreamers);
        sortByName(offlineStreamers);
        displayFriends();
      }
    });
  });
}

var delay = (function(){
  // Used to delay search box
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

function displayFriends() {
  // Get the streamer data and display it in the friends list.
  var streamersProcessed = 0;

  //////////////////////////////
  // Need to change because onlineStreamers and offlineStreamers could be empty. Use For loop here instead of ForEach
  /////////////////////////////


  onlineStreamers.forEach(function(streamerArray) {
    $.getJSON("https://api.twitch.tv/kraken/channels/" + streamerArray[0] + "?callback=?", function(streamerData) {
      // Get online streamer data and put it in the array.
      streamerArray.push(buildFriendDiv("In-Game", streamerData));
      streamersProcessed++;

      if (streamersProcessed === onlineStreamers.length) {
        streamersProcessed = 0;
        offlineStreamers.forEach(function(streamerArray) {
          $.getJSON("https://api.twitch.tv/kraken/channels/" + streamerArray[0] + "?callback=?", function(streamerData) {
            // Get offline streamer data.
            streamerArray.push(buildFriendDiv("Offline", streamerData));
            streamersProcessed++;
            if (streamersProcessed === offlineStreamers.length) {
              // Display everything once all streamer data has been converted into divs and placed into the arrays.
              onlineStreamers.forEach(function(streamer) {
                $(".online-friend-container").append(streamer[1]);
              });
              offlineStreamers.forEach(function(streamer) {
                $(".offline-friend-container").append(streamer[1]);
              });
              // Enable handlers that rely on data.
              if (eventHandlersDisabled){
              	enableEventHandlers();
              	eventHandlersDisabled = false;
              }
            }
          });
        });
      }
    });
  });
}

function enableEventHandlers() {
	// Enable search box.
	$(".search-bar input").keyup(function() {
		delay(searchStreamers, 1000 );
	});

	// Enable status filters
  	$(".friend-title").click(function(){
    	$(".friend").show();
  	});
  	$(".in-game-friend-count").click(function(){
    	$(".in-game").show();
    	$(".offline").hide();
  	});
  	$(".offline-friend-count").click(function(){
    	$(".offline").show();
    	$(".in-game").hide();
  	});

  	// Enable Add Friend button
  	$(".fa-plus").click(function() {
		$(".friend-box").fadeToggle();
	});

  	// Enable adding new friends when Enter is pressed.
	$(".friend-box").on('keypress', function(event) {
		if (event.which === 13) {
			addFriends($(this).val());
		}
	});
}

function reBuildApp() {
	onlineStreamers.length = 0;
	offlineStreamers.length = 0;
	$(".online-friend-container").empty();
	$(".offline-friend-container").empty();
	buildApp();
}

function searchStreamers() {
  // Show the stream if their name includes the search
  var search = $(".search-box").val();
  $(".streamer-name").each(function() {
    if ($(this).text().toLowerCase().indexOf(search.toLowerCase()) == -1) {
      // If search string isn't found within the streamer name.
      $(this).parents(".friend").hide();
    } else {
      $(this).parents(".friend").show();
    }
  });
}

function sortByName(array) {
  // Sort the array alphabetically by Twitch name. Not case sensitive.
  // a[0] is the streamer name
  array.sort(function(a, b) {
    var streamerAName = a[0].toLowerCase();
    var streamerBName = b[0].toLowerCase();

    if (streamerAName < streamerBName) {
      return -1;
    } else if (streamerAName > streamerBName) {
      return 1;
    } else {
      return 0;
    }
  });
}

function sortStreamer(streamerName, streamerData) {
  if (streamerData.stream === null || jQuery.isNumeric(streamerData.status)) {
    offlineStreamers.push([streamerName]);
  } else {
    onlineStreamers.push([streamerName]);
  }
}

var main = function() {
	buildApp();
};

$(document).ready(main);