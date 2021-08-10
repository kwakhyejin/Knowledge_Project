//socket 연결
const clientIo = io.connect("https://dev.knowledgetalk.co.kr:7100/SignalServer",{});

const roomIdInput = document.getElementById("roomIdInput");
const videoBox = document.getElementById("videoBox");
const printBox = document.getElementById("printBox")

const CreateRoomBtn = document.getElementById("CreateRoomBtn");
const RoomJoinBtn = document.getElementById("RoomJoinBtn");
const SDPBtn = document.getElementById("SDPBtn");

const CPCODE = "KP-CCC-demouser-01"
const AUTHKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdHNlcnZpY2UiLCJtYXhVc2VyIjoiMTAwIiwic3RhcnREYXRlIjoiMjAyMC0wOC0yMCIsImVuZERhdGUiOiIyMDIwLTEyLTMwIiwiYXV0aENvZGUiOiJLUC1DQ0MtdGVzdHNlcnZpY2UtMDEiLCJjb21wYW55Q29kZSI6IkxJQy0wMyIsImlhdCI6MTU5Nzk3NjQ3Mn0.xh_JgK67rNPufN2WoBa_37LzenuX_P7IEvvx5IbFZI4"

let members;
let roomId;
let userId;
let host;

let peers = {};
let streams = {};

/********************** 기타 method **********************/

// 하단 로그 출력하는 메서드
const socketLog = (type, contents) => {
    let jsonContents = JSON.stringify(contents);
    const textLine = document.createElement("p");
    const textContents = document.createTextNode(`[${type}] ${jsonContents}`);
    textLine.appendChild(textContents);
    printBox.appendChild(textLine);
}

//send message to signaling server
const sendData = data => {
    data.cpCode = CPCODE
    data.authKey = AUTHKEY
    socketLog('send', data);
    clientIo.emit("knowledgetalk", data);   // 현재 연결되어 있는 클라이언트 소켓에 전달.
}

// 현재 사용하지 않는 메서드.
// const deletePeers = async () => {
//     for(let key in streams) {
//         if (streams[key] && streams[key].getTracks()) {
//             streams[key].getTracks().forEach(track => {
//                 track.stop();
//             })

//             document.getElementById(key).srcObject = null;
//             document.getElementById(key).remove();
//         }
//     }

//     for(let key in peers) {
//         if (peers[key]) {
//             peers[key].close();
//             peers[key] = null;
//         }
//     }
// }

//영상 출력 화면 Box 생성
// let은 변수에 재할당이 가능하지만 const는 변수재선언,재할당 모두 불가능
const createVideoBox = id => {
    let videoContainner = document.createElement("div");
    videoContainner.classList = "multi-video";
    videoContainner.id = id;

    let videoLabel = document.createElement("p");
    let videoLabelText = document.createTextNode(id);
    videoLabel.appendChild(videoLabelText);

    videoContainner.appendChild(videoLabel);

    let multiVideo = document.createElement("video");
    multiVideo.autoplay = true;
    multiVideo.id = "multiVideo-" + id;
    videoContainner.appendChild(multiVideo);

    videoBox.appendChild(videoContainner);
}

// Local stream, peer 생성 및 SDP RETURN
const createSDPOffer = async id => {
    return new Promise(async (resolve, reject) => { // Promise객체는 비동기작업후에 완료 or 실패와 그 결과값을 나타냄.
        peers[id] = new RTCPeerConnection();
        streams[id] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});  // 오디오 비디오 둘다 요청
        let str = 'multiVideo-'+id;
        let multiVideo = document.getElementById(str);
        multiVideo.srcObject = streams[id]; // 비디오요소에서 srcObeject 속성을 사용해 스트림을 가져옴
        streams[id].getTracks().forEach(track => {  // getTracks()를 사용해서 스트림의 트랙 목록을 가져오고  forEach를 이용하여 addTrack한다.
            peers[id].addTrack(track, streams[id]);
        });

        peers[id].createOffer().then(sdp => {   // createOffer를 통해 수신자에게 전달할 SDP를 생성한다.
            peers[id].setLocalDescription(sdp); //연결 인터페이스와 관련이 있는 로컬 설명 (local description)을 변경.로컬 설명은 미디어 형식을 포함하는 연결의 로컬 엔드에 대한 속성을 명시
            return sdp;
        }).then(sdp => {
            resolve(sdp);
        })
    })
}

// send SDP answer
// SDP :  SDP란 Session Description Protocol 의 약자로 연결하고자 하는 Peer 서로간의 미디어와 네트워크에 관한 정보를 이해하기 위해 사용
// Promise 객체는 자바스크립트 비동기 처리를 위한 객체
// async...await : 비동기처리패턴 HTTP 통신을 하는 비동기 처리 코드 앞에 await을 붙인다.(비동기처리메서드는 꼭 프로미스객체를 반환해야함.)
const createSDPAnswer = async data => {
    let displayId = data.displayId;

    peers[displayId] = new RTCPeerConnection(); // 로컬기기와 원격 피어간의 WebRTC 연결을 담당, 원격 피어에 연결하기 위한 메서드 제공
    peers[displayId].ontrack = e => {
        streams[displayId] = e.streams[0];

        let multiVideo = document.getElementById(`multiVideo-${displayId}`);
        multiVideo.srcObject = streams[displayId];
    }

    await peers[displayId].setRemoteDescription(data.sdp);
    let answerSdp = await peers[displayId].createAnswer();
    await peers[displayId].setLocalDescription(answerSdp);
    peers[displayId].onicecandidate = e => {
        if(!e.candidate){
            let reqData = {
                "eventOp": "SDP",
                "sdp": peers[displayId].localDescription,
                "roomId": data.roomId,
                "usage": "cam",
                "pluginId": data.pluginId,
                "userId": userId
            };

            sendData(reqData);  // 데이터 전송
        }
    }
}

//퇴장 시, stream,peer 제거해주는 메서드
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
CreateRoomBtn.addEventListener('click', () => { //createRoom클릭시 발생하는 이벤트
    host = true;
    let data = {
        "eventOp":"CreateRoom"  // Call 이벤트 처리 명령어
    }

    sendData(data);
});

RoomJoinBtn.addEventListener('click', () => {   // RoomJoin 클릭시 발생하는 이벤트
    let data = {
        "eventOp":"RoomJoin",
        "roomId": roomIdInput.value     // 방의 value도 전달
    }

    sendData(data);
});

SDPBtn.addEventListener('click', async () => {  // SDP클릭시 발생하는 이벤트

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



/********************** event receive **********************/
clientIo.on("knowledgetalk", async data => {

    socketLog('receive', data);

    switch(data.eventOp || data.signalOp) {
        case 'CreateRoom':
            if(data.code == '200'){ // 200 (정상)
                createRoom(data);   // createRoom함수 실행후
                CreateRoomBtn.disabled = true;  // 재클릭방지
            }
            break;

        case 'RoomJoin':
            if(data.code == '200'){ 
                roomJoin(data);
                RoomJoinBtn.disabled = true;
                CreateRoomBtn.disabled = true;
            }
            break;

        case 'StartSession':
            startSession(data);
            break;

        case 'SDP':
            if(data.useMediaSvr == 'Y'){    // useMediaSvr == Y 다중화상통화
                if(data.sdp && data.sdp.type == 'offer'){   // 자기 자신
                    createSDPAnswer(data);  //내 화면 생성
                }
                else if(data.sdp && data.sdp.type == 'answer'){
                    peers[userId].setRemoteDescription(new RTCSessionDescription(data.sdp));
                }
            }
            break;
        case 'ReceiveFeed':
            receiveFeed(data)
            break;

        case 'Presence':
            if(data.action == 'exit'){
                leaveParticipant(data.userId)
            }
            break;

    }

});


const createRoom = data => {
    roomIdInput.value = data.roomId;

    //room id copy to clipboard
    roomIdInput.select();
    roomIdInput.setSelectionRange(0, 99999);
    document.execCommand("copy");

    alert('room id copied')
}

const roomJoin = data => {
    userId = data.userId;
}

const startSession = async data => {
    members = Object.keys(data.members);    //Object.keys() : members 이름들을 반복문과 동일한 순서로 순회해서 배열로 반환

    //3명 이상일 때, 다자간 통화 연결 시작
    if(data.useMediaSvr == 'Y'){
        for(let i=0; i<members.length; ++i){
            let user = document.getElementById(members[i]);
            if(!user){
                createVideoBox(members[i]);
            }
            
        }

        SDPBtn.disabled = false;
        host = data.host;
    }
}

const receiveFeed = (data) => {
    data.feeds.forEach(result => {
        let data = {
            "eventOp":"SendFeed",
            "roomId": roomIdInput.value,
            "usage": "cam",
            "feedId": result.id,
            "display": result.display
        }

        sendData(data);
    })
} 