const localVideo= document.getElementById('localVideo');
const remoteVideo= document.getElementById('remoteVideo');

var serverConnection;
var peerConnection;
var localStream;
var logcount=0;

const peerConnectionConfig = {
    'iceServers': [{'urls': ['stun:stun.services.mozilla.com']}, {'urls': ['stun:stun.l.google.com:19302']}]
};
// refer to https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
const getUserMediaConstraints = {
    video: true,
    audio: true,
};
const getDisplayMediaConstraints = {
}
async function pageReady() {
    localStream = await navigator.mediaDevices.getUserMedia(getUserMediaConstraints)
    localVideo.srcObject = localStream;
    serverConnection = new WebSocket('ws://127.0.0.1:1234');
    serverConnection.onmessage = gotMessageFromServer;
}
// log function
function l(msg){
    console.log(`log ${logcount++}: ${msg}`);
}

function getUserMediaSuccess(stream) {
    l("getUserMediaSuccess");
    localStream = stream;
    localVideo.srcObject = stream;
}

function start(isCaller) {
    document.querySelector('#startDiv').style= 'display:none;';
    document.querySelector('#sdpSemantics').style= 'display:none;';
    document.querySelector('#displayMediaDiv').style.display = 'inline';
    // refer to https://docs.google.com/document/d/1-ZfikoUtoJa9k-GZG1daN0BU3IjIanQ_JSscHxQesvU/edit
    peerConnectionConfig["sdpSemantics"]= document.querySelector('#sdpSemantics').value
    var peerRole = isCaller?"Caller":"Callee";
    l(`start ${peerRole}`);
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
    remoteVideo.srcObject = event.streams[0];
}
async function getDisplayMedia() {
    l("getDisplayMedia is called");
    localStream = await navigator.mediaDevices.getDisplayMedia(getDisplayMediaConstraints);
    localVideo.srcObject = localStream;
}

function rtcError(error) {
    console.log(error);
}

function gotMessageFromServer(message) {
    var caller=true;
    var signal = JSON.parse(message.data);
    if(!peerConnection && !signal.id){
        caller=false;
        start(caller);
    }
    if(signal.sdp) {
        l('gotMessageFromServer: signal.sdp' );
        document.querySelector('#guide').innerHTML='';
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
        l(`gotMessageFromServer: signal.ice : ${signal.ice.candidate}`);
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    } else if (signal.id) {
        l(`got client id: ${signal.id}`)
        if (signal.id%2 === 1) {
            document.querySelector('#guide').innerHTML='please open other tab to test peer connection';
            document.querySelector('#startDiv').style='display:none;';
        }
    }
}
