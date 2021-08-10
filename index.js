
// socket 연결하기
const clientIo = io.connect("https://dev.knowledgetalk.co.kr:7100/SignalServer",{});

const roomIdInput = document.getElementById("roomIdInput");
const videoBox = document.getElementById("videoBox");
const printBox = document.getElementById("printBox");

const CreateRoomBtn = document.getElementById("CreateRoomBtn");
const RoomJoinBtn = document.getElementById("RoomJoinBtn");
const SDPBtn = document.getElementById("SDPBtn");

const CPCODE = "KP-CCC-demouser-01"
const AUTHKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdHNlcnZpY2UiLCJtYXhVc2VyIjoiMTAwIiwic3RhcnREYXRlIjoiMjAyMC0wOC0yMCIsImVuZERhdGUiOiIyMDIwLTEyLTMwIiwiYXV0aENvZGUiOiJLUC1DQ0MtdGVzdHNlcnZpY2UtMDEiLCJjb21wYW55Q29kZSI6IkxJQy0wMyIsImlhdCI6MTU5Nzk3NjQ3Mn0.xh_JgK67rNPufN2WoBa_37LzenuX_P7IEvvx5IbFZI4"

let members;
let roomId;
let userId;
let host;

let peers =  {};
let streams = {};

// 로그 출력
const socketLog = (type, contents) => {
    let jsonContents = JSON.stringify(contents);
    const textLine = document.createElement("p");
    const textContents = document.createTextNode(`[${type}] ${jsonContents}`);
    textLine.appendChild(textContents);
    printBox.appendChild(textLine);
}


const sendData = data => {
    data.cpCode = CPCODE
    data.authKey = AUTHKEY
    socketLog('send', data);    // cocode, authkey 보내기
    Vue.emit("knowlegetalk", data);
}

// 현재 사용중인 메서드인지 여부 확인
const deletePeers = async() => {
    for(let key in streams) {
        if(streams[key] && streams[key].getTrack()){
            streams[key].getTrack().forEach(track => {
                track.stop();
            })
            
            document.getElementById(key).srcObjcect = null; ///
            document.getElementById(key).remove();
        }
    }
    for(let key in peers) {
        if(peers[key]){
            peers[key].close();
            peers[key] = null;
        }
    }

}
// let은 변수에 재할당이 가능하지만 const는 변수재선언,재할당 모두 불가능
// 영상 출력 박스 생성 메서드
const createVideoBox = id => {
    let videoContainer = document.createElement("div");
    videoContainer.classList = "multi-video";
    videoContainer.id = id;

    let videoLable = document.createElement("p");   
    let videoLableText = document.createTextNode(id); // div안에 id생성
    videoLable.appendChild(videoLableText);

    videoContainer.appendChild(videoLabel);

    let multiVideo = document.createElement("video");
    multiVideo.autoplay = true; // 영상 자동 재생
    multiVideo.id = "multiVideo-" + id;
    videoContainer.appendChild(multiVideo);

    videoBox.appendChild(videoContainer);
}

// Local stream, peer 생성 및 SDP RETURN
const createSDPOffer = async id => {
    return new Promise(async (resolve, reject) => { // Promise객체는 비동기작업후에 완료 or 실패와 그 결과값을 나타냄.
        peers[id] = new RTCPeerConnection();
        streams[id] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});    // 오디오 비디오 둘다 요청
        // 보통, MediaDevices 싱글톤 객체는 다음과 같이 navigator.mediaDevices를 사용해 접근합니다.
        let str = 'multiVideo-'+id;
        let multiVideo = document.getElementById(str);
        multiVideo.srcObjcect = streams[id];    // 비디오요소에서 srcObeject 속성을 사용해 스트림을 가져옴
        streams[id].getTracks().forEach(track => {  // getTracks()를 사용해서 스트림의 트랙 목록을 가져오고  forEach를 이용하여 addTrack한다.
            peers[id].addTrack(track, streams[id]);
        });

        peers[id].createOffer.then(sdp => { // createOffer를 통해 수신자에게 전달할 SDP를 생성한다.
            peers[id].setLocalDescription(sdp); //연결 인터페이스와 관련이 있는 로컬 설명 (local description)을 변경.로컬 설명은 미디어 형식을 포함하는 연결의 로컬 엔드에 대한 속성을 명시
            return sdp;
        }).then(sdp => {
            resolve(sdp);
        })
    })
}

// send SDP answer
// SDP :  SDP란 Session Description Protocol 의 약자로 연결하고자 하는 Peer 서로간의 미디어와 네트워크에 관한 정보를 이해하기 위해 사용
const createSDPAnswer = async data => {
    let displayId = data.displayId;

    peers[displayId] = new RTCPeerConnection();
    peers[displayId].ontrack = e => {
        streams[displayId] = e.streams[0];

        let multiVideo = document.getElementById(`multiVideo-${displayId}`);
        multiVideo.srcObjcect = streams[displayId];    
    }

    await peers[displayId].setRemoteDescription(data.sdp);
    let answerSdp = await peers[displayId].createAnswer();
    await peers[displayId].setLocalDescription(answerSdp);
    peers[displayId].onicecandidate = e => {
        if(!e.candidate){
            let reqData = {
                "eventOp" : "SDP",
                "sdp" : peers[displayId].LocalDescription,
                "roomId" : data.roomId,
                "usage" : "cam",
                "pluginId" : data.pluginId,
                "userId" : userId
            };
            sendData(reqData);
        }
    }
}

//퇴장 시, stream,peer 제거
const leaveParticipant = id => {
    document.getElementById(`multiVideo-${id}`).remove();
    document.getElementById(id).remove();

    if(streams[id]){
        streams[id].getVideoTracks()[0].stop();
        streams[id].getAudioTracks()[0].stop();
        streams[id] = null;
        delete streams[id];
    }

    if(peers[id]){
        peers[id].close();
        peers[id] = null;
        delete peers[id];
    }

}

/********************** button event **********************/
CreateRoomBtn.addEventListener('click', () => {
    host = true;
    let data = {
        "eventOp":"CreateRoom"
    }

    sendData(data);
});

SDPBtn.addEventListener('click', async () => {

    let sdp = await createSDPOffer(userId);

    let data = {
        "eventOp":"SDP",
        "pluginId": undefined,
        "roomId": roomIdInput.value,
        "sdp": sdp,
        "usage": "cam",
        "userId": userId,
        "host": host
    }

    sendData(data);
})






