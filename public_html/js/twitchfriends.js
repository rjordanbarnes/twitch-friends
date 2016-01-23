var streamers = [];
var onlineStreamers = [];
var offlineStreamers = [];

if (localStorage.getItem("streamers") !== null) {
	streamers = localStorage.getItem("streamers").split(",");
}

function addFriends(friendList) {
	// Takes a list of friends separated by commas and adds them to the streamers array
	var cleanedFriendList = friendList.replace(/[^a-zA-Z0-9_,]+/g, '');

	var newFriends = cleanedFriendList.split(",");

	newFriends.forEach(friend => {
		if (!streamers.includes(friend.toLowerCase()) && friend.length > 0) {
			streamers.push(friend.toLowerCase());
		}
	});

	saveData();
	reBuildApp();
}

function buildFriendDiv(displayedStatus, streamerData) {
	// Builds the divs that contain the streamer logo, link, name, status, and game.
	var htmlOutput = "";
	var name = streamerData.display_name;
	var classStatus = displayedStatus.toLowerCase();
	var icon = streamerData.logo;
	var game = streamerData.game;
	var link = streamerData.url;
	var target = "_blank";
	
	if (icon === null) {
		icon = "http://static-cdn.jtvnw.net/jtv-static/404_preview-300x300.png";
	}
	
	if ([404, 422].includes(streamerData.status)){
		switch(streamerData.status) {
			case 404:
				displayedStatus = "Doesn't Exist";
				break;
			case 422:
				displayedStatus = "Invalid Account";
				break;
		}
		classStatus = "offline";
		name = streamerData.message.split("'")[1];
		icon = "http://static-cdn.jtvnw.net/jtv-static/404_preview-300x300.png";
		link = "#";
		target = "_self";
	}

	if (classStatus === "offline") {
		game = "";
	}

	htmlOutput += `<div class="friend ${classStatus}">`;
	htmlOutput += `<input type="checkbox" class="remove-checkbox" id="${name}-checkbox">`;
	htmlOutput += `<a target="${target}" href="${link}">`;
	htmlOutput += `<img class="border-${classStatus}" src="${icon}"></a>`;
	htmlOutput += `<ul class="${classStatus}-color">`;
	htmlOutput += `<li class="streamer-name">${name}</li>`;
	htmlOutput += `<li>${displayedStatus}</li>`;
	htmlOutput += `<li>${game}</li>`;
	htmlOutput += `</ul></div>`;

	return htmlOutput;
}

function buildApp() {
	var streamersProcessed = 0;
	updateFriendCount();

	streamers.forEach(streamerName => {
		$.getJSON("https://api.twitch.tv/kraken/streams/" + streamerName + "?callback=?", streamerData => {
			// First sort the streamers into an Array of Online streamers and an Array of Offline streamers
			sortStreamer(streamerName, streamerData);
			updateFriendCount();
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

function displayFriends() {
	// Get the streamer data and display it in the friends list.
	var onlineWaiting = onlineStreamers.length;

	onlineStreamers.forEach(streamer => {
		$.getJSON("https://api.twitch.tv/kraken/channels/" + streamer[0] + "?callback=?", streamerData => {
			// Get streamer data.
			onlineWaiting--;
			streamer.push(buildFriendDiv("In-Game", streamerData));

			if (onlineWaiting === 0) {
				onlineStreamers.forEach(streamer => {
				$(".online-friend-container").append(streamer[1]);
				});
			}
		});
	});

	var offlineWaiting = offlineStreamers.length;

	offlineStreamers.forEach(streamer => {
		$.getJSON("https://api.twitch.tv/kraken/channels/" + streamer[0] + "?callback=?", function(streamerData) {
			// Get offline streamer data.
			offlineWaiting--;
			streamer.push(buildFriendDiv("Offline", streamerData));

			if (offlineWaiting === 0) {
				offlineStreamers.forEach(streamer => {
				$(".offline-friend-container").append(streamer[1]);
				});
			}
		});
	});
}

function enableEventHandlers() {
	// Enable search box.
	var searchTimeout = null;
	$(".search-bar input").keyup(function() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(searchStreamers, 1000);
	});

	// Enable status filters
	$(".friend-title").click(function() {
		$(".friend").show();
	});
	$(".in-game-friend-count").click(function() {
		$(".in-game").show();
		$(".offline").hide();
	});
	$(".offline-friend-count").click(function() {
		$(".offline").show();
		$(".in-game").hide();
	});

	// Enable Add Friend button
	$(".fa-plus").click(function() {
		$(".friend-box").fadeToggle(() => {
			$(".friend-box").focus();
		});
	});

	// Enable Remove Friends button from dropdown
	$(".remove-friends").click(function() {
		$(".remove-checkbox").toggle();
		$(".remove-button").toggle();
	});

	// Enable button that deletes friends with checkboxes.
	$(".remove-button").click(function() {
		$(".remove-checkbox").each(function() {
			if (this.checked) {
				var streamer = $(this).attr("id").split("-")[0].toLowerCase();
				if (streamers.includes(streamer)) {
					streamers.splice($.inArray(streamer, streamers), 1);
				}
			}
		});
		$(".remove-button").hide();
		saveData();
		reBuildApp();
	});

	// Enable adding new friends when Enter is pressed.
	$(".friend-box").on('keypress', function(event) {
		if (event.which === 13) {
			addFriends($(this).val());
			$(this).hide();
			$(this).val("");
			$(this).blur();
		}
	});
}

function reBuildApp() {
	// Resets variables and rebuilds the app.
	onlineStreamers.length = 0;
	offlineStreamers.length = 0;
	$(".online-friend-container").empty();
	$(".offline-friend-container").empty();
	buildApp();
}

function saveData() {
	localStorage.setItem("streamers", streamers);
}

function searchStreamers() {
	// Show the stream if their name includes the search
	var search = $(".search-box").val().toLowerCase();
	$(".streamer-name").each(function() {
		var streamerName = $(this).text().toLowerCase();
		if (streamerName.includes(search)) {
			// If search string is found within the streamer name.
			$(this).parents(".friend").show();
		} else {
			$(this).parents(".friend").hide();
		}
	});
}

function sortByName(array) {
	// Sort the array alphabetically by Twitch name. Not case sensitive.
	// a[0] is the streamer name
	array.sort((a, b) => {
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

function updateFriendCount() {
	var totalFriends = onlineStreamers.length + offlineStreamers.length;
	$(".friend-title").text(totalFriends + " FRIENDS");
	$(".in-game-friend-count").text(onlineStreamers.length + " IN GAME");
	$(".offline-friend-count").text(offlineStreamers.length + " OFFLINE");
}

var main = function() {
	buildApp();
	enableEventHandlers();
};

$(document).ready(main);