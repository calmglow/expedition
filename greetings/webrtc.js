var localVideo;
var remoteVideo;
var peerConnection;
var logcount=0;

var peerConnectionConfig = {'iceServers': [{'urls': ['stun:stun.services.mozilla.com']}, {'urls': ['stun:stun.l.google.com:19302']}]};

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

function pageReady() {
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    serverConnection = new WebSocket('ws://127.0.0.1:1234');
    serverConnection.onmessage = gotMessageFromServer;

    var constraints = {
        video: true,
        audio: true,
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(getUserMediaSuccess)
        .catch(rtcError);
}
// log function
function l(msg){
    console.log("log "+ logcount++ +":"+ msg);
}

function getUserMediaSuccess(stream) {
    l("getUserMediaSuccess");
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

function start(isCaller) {
    var peerRole = isCaller?"Caller":"Callee";
    l("start("+ peerRole+")");
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.ontrack = gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
        l("Caller: createOffer");
        peerConnection.createOffer().then(gotDescription).catch(rtcError);
    }
}

function gotDescription(description) {
    l('got local description');
    peerConnection.setLocalDescription(description, function () {
        l('send local sdp to server');
        serverConnection.send(JSON.stringify({'sdp': description}));
    }, rtcError);
}

function gotIceCandidate(event) {
    l('got local IceCandidate and send it to server');
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate}));
    }
}

function gotRemoteStream(event) {
    l("got remote stream");
    //remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteVideo.srcObject = event.streams[0];
}

function rtcError(error) {
    console.log(error);
}

function gotMessageFromServer(message) {
    var caller=true;
    if(!peerConnection){
        start(false);
        caller=false;
    }

    var signal = JSON.parse(message.data);
    if(signal.sdp) {
        l('gotMessageFromServer: signal.sdp' );
        if(caller) peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.sdp), function(){},rtcError);
        else{
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then( function() {
                    l("Callee: CreateAnswer");
                    peerConnection.createAnswer().then(gotDescription).catch( rtcError);
                })
                .catch( rtcError);
        }
    } else if(signal.ice) {
        l('gotMessageFromServer: signal.ice' + signal.ice.candidate);
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    }
}