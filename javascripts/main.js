// the ID for your app. Used to reference the app.
var appid = "2157ed7e-83ee-4e1f-a06c-97eedec16570";
var call = null;
var audioCall = null;
var urlParams = parseUrl();
var baseUrl = getUrl();

console.log('baseUrl: ', baseUrl);

// Set the respoke log level to 'debug' for more info
//respoke.log.setLevel('debug');

// parse URL parameters


// generate a random room
var room = "5VB8N";

/*if (urlParams.room) { // room provided by URL
  room = urlParams.room;
} else { // no room provided
  room = makeRandomString();
}*/

var client = new respoke.Client({
  appId: appid,
  developmentMode: true
});

// called when we connect to the Respoke service
client.listen('connect', function() {
  // update URL
  var url = baseUrl + '?room=' + room;
  
  //history.pushState(null, null, url); 
  
  $(".share .link").text(room);
});

// called when we disconnect to the Respoke service
client.listen('disconnect', function() {
  $('#callControls').hide();
});

// listen for and answer incoming calls
client.listen('call', function(evt) {
  
  if (evt.call.caller !== true) {
      if (evt.call.incomingMedia.hasScreenShare()) {
          call = evt.call;
          call.answer({
              onConnect: onConnect,
              onHangup: function() {
                  call = null;
                  $('#callControls').hide();
              }
          });
      } else {
          audioCall = evt.call;
          audioCall.answer({
              constraints: {
                  audio: true,
                  /* There's some kind of bug preventing video from working for the non-screensharer. This
                   * flag makes it all the way to getUserMedia correctly and the media returned contains video
                   * and audio, but after the call to pc.addStream(), the RTCPeerConnection reports that only
                   * the audio track exists. I tried setting OfferToReceiveVideo on the other side to no avail. ES */
                  video: true
              },
              onLocalMedia: onLocalVideo,
              onHangup: function () {
                  audioCall = null;
              }
          });
      }
  }
  
});


$('#hangupButton').click(function hangup() {
  if (call) {
    call.hangup();
    audioCall.hangup();
    call = null;
    audioCall.null;
    $('#callControls').hide();
  }
});


console.log('connect()');

var endpoint =  makeRandomString();

console.log('client: ', client);
console.log('client.calls.length: ', client.calls.length);

// create the respoke connection
client.connect({
  endpointId: endpoint
}).then(function connectDone() {
  console.log('connected');
  
  // join the room specified in the URL
  return client.join({
    id: room,
    onLeave: someoneLeft
  });
}).then(function roomJoined(group) {
  console.log(group);
  
  return group.getMembers();
}).done(function getMembers(members) {
  // join the new member to the call
  var url = baseUrl + '?room=' + makeRandomString();
  console.log('members: ', members);
  console.log('members.length: ', members.length);
  
  if(members.length > 2) {
    console.log('members.length > 2');
    
    $(".share .text").text("Sorry, that room is full. Join this room to screenshare:");
    $(".share .link").text(room);
  } else {
    console.log('members.length < 2');
    
    members.forEach(function proccessEachMember(member) {
      handleNewEndoint(client.endpointId, member.endpointId);
    });
  }
});

function someoneLeft(evt) {
  console.log('someone left: ', evt);
  
  if (call && !evt.target.connections.length) {
    call.hangup();
    call = null;
    $('#callControls').hide();
  }
}

function handleNewEndoint(myName, theirName) {
  // is this me
  if (myName === theirName) {
    console.log('not calling myself');
    return;
  }
  
  var otherEndpoint = client.getEndpoint({
    id: theirName
  });
  
  console.log('joined: ', otherEndpoint);
  
  var shouldCall = doIPlaceTheCall(myName, theirName);
  
  console.log('shouldCall:', shouldCall);
  
  if (shouldCall) {
    otherEndpoint.startScreenShare({
      onLocalMedia: onLocalVideo
    });
    // hack to get around an elusive race condition. Soon, we'll make it so a second call
    // isn't needed to get audio going with a screen share.
    setTimeout(function () {
        otherEndpoint.startAudioCall({
          onConnect: onConnect
        });
    }, 100);
  }
}

function doIPlaceTheCall(myName, theirName) {
  console.log('deciding if I should call ', myName, theirName);
  
  if (myName !== theirName) {
    return true;
  } else {
    return false;
  }
}

function onConnect(evt) {
  console.log('onConnect()', evt);
  
  $(evt.element).addClass('remote-video');
  
  if($('#remoteVideoContainer video').length) {
	  $('#remoteVideoContainer video').replaceWith(evt.element);
  } else {
	  $('#remoteVideoContainer').append(evt.element);
  }
  
  $('#callControls').show();
}

function onLocalVideo(evt) {
  console.log('onLocalVideo()', evt);
  
  $(evt.element).addClass('local-video');
  
  if($('#localVideoContainer video').length) {
	  $('#localVideoContainer video').replaceWith(evt.element);
  } else {
	  $('#localVideoContainer').append(evt.element);
  }
}

function makeRandomString() {
  var newName = '';
  var space = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';

  for (var i = 0; i < 5; i += 1) {
      newName += space.charAt(Math.floor(Math.random() * space.length));
  }

  return newName;
}

function parseUrl() {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
      query  = window.location.search.substring(1),
	  urlParams = {};
  
  console.log('parseUrl()');

  match = search.exec(query);
  
  while (match) {
      urlParams[decode(match[1])] = decode(match[2]);
      match = search.exec(query);
  }
  
  console.log('urlParams: ', urlParams);
  
  return urlParams;
}

function getUrl() {
	var components = window.location.href.split( '/' );
	var baseUrl = components[0] + '//' + components[2] + '/' + components[3] + '/';

	return baseUrl;
}
