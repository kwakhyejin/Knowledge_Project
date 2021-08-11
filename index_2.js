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
let remoteId;
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
// 이 메서드를 통해 서버에 전달.
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

// 영상 출력 화면 Box 생성
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
    return new Promise(async (resolve, reject) => {   // Promise객체는 비동기작업후에 완료 or 실패와 그 결과값을 나타냄.
        peers[id] = new RTCPeerConnection();
        streams[id] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});  // 오디오 비디오 둘다 요청
        let str = 'multiVideo-'+id;
        let multiVideo = document.getElementById(str);
        multiVideo.srcObject = streams[id];           // 비디오요소에서 srcObeject 속성을 사용해 스트림을 가져옴
        streams[id].getTracks().forEach(track => {    // getTracks()를 사용해서 스트림의 트랙 목록을 가져오고  forEach를 이용하여 addTrack한다.
            peers[id].addTrack(track, streams[id]);
        });

        peers[id].createOffer().then(sdp => {         // createOffer를 통해 수신자에게 전달할 SDP를 생성한다.
            peers[id].setLocalDescription(sdp);        /* 연결 인터페이스와 관련이 있는 로컬 설명 (local description)을 변경.
                                                          로컬 설명은 미디어 형식을 포함하는 연결의 로컬 엔드에 대한 속성을 명시*/
            return sdp;
        }).then(sdp => {
            resolve(sdp);
        })

        //상대방 영상 가져와서 화면에 출력
        peers[id].ontrack = e => {
            streams[remoteId] = e.streams[0];
            let multiVideo = document.getElementById(`multiVideo-${remoteId}`);
            multiVideo.srcObject = streams[remoteId];
        } 
    })
}

const createSDPAnswer = async data => {
    let displayId = data.userId;
    peers[displayId] = new RTCPeerConnection();
    peers[displayId].ontrack = e => {                   // RTCPeerConnection 속성인 ontrack은 RTCPeerConnection객체에 트랙이 등록됨을 알려주는 이벤트 핸들러.
        streams[displayId] = e.streams[0];              // MediaStream 객체
        let multiVideo = document.getElementById(`multiVideo-${displayId}`);
        multiVideo.srcObject = streams[displayId];
    }

    // 내 영상 화면에 출력하고 피어에 담기
    streams[userId] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    let str = 'multiVideo-'+userId;
    let multiVideo = document.getElementById(str);
    multiVideo.srcObject = streams[userId];
    streams[userId].getTracks().forEach(track => {       //스트림의 트랙 목록을 가져와, 각트랙의 addTrack()메서드 호출(addTrack() : 다른 유저에게 전송될 신규 미디어 트랙을 추가함.)
        peers[displayId].addTrack(track, streams[userId]);
    });

    await peers[displayId].setRemoteDescription(data.sdp);//////////////////////////////////////////////////////////
    let answerSdp = await peers[displayId].createAnswer();// WebRTC연결중 발생하는 offer에 대한 answer를 생성함.
    await peers[displayId].setLocalDescription(answerSdp);//////////////////////////////////////////////////////////

    peers[displayId].onicecandidate = e => {     
        if(!e.candidate){
            let reqData = {
                "eventOp": "SDP",
                "sdp": peers[displayId].localDescription,
                "roomId": data.roomId,
                "usage": "cam",
                "userId": userId
            };
            sendData(reqData);
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
CreateRoomBtn.addEventListener('click', () => {
    host = true;
    let data = {
        "eventOp":"CreateRoom"                  // Call 이벤트 처리 명령어
    }

    sendData(data);
});

RoomJoinBtn.addEventListener('click', () => {   // RoomJoin 클릭시 발생하는 이벤트
    let data = {
        "eventOp":"RoomJoin",
        "roomId": roomIdInput.value
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
            if(data.code == '200'){                                     // 200 (정상)
                createRoom(data);
                CreateRoomBtn.disabled = true;
            }
            break;

        case 'RoomJoin':
            if(data.code == '200'){ 
                roomJoin(data);

                RoomJoinBtn.disabled = true;
                CreateRoomBtn.disabled = true;
                if(data.members){
                    members = Object.keys(data.members);                // data.userId를 가져옴
                    for(let i=0; i<members.length; ++i){
                        let user = document.getElementById(members[i]); // div class="multi-video"를 가져옴. 없으면 생성
                        if(!user){
                            createVideoBox(members[i]);
                        }
                        if(members[i] !== userId) remoteId = members[i];
                    }
                    if(members.length<=2)    SDPBtn.disabled = false;
                }
            }
            break;

        case 'StartSession':
            startSession(data);
            break;

        case 'SDP':
            if(data.useMediaSvr == 'N'){   
                if(data.sdp && data.sdp.type == 'offer'){                 // 요청자..?
                   await createSDPAnswer(data);
                }
                else if(data.sdp && data.sdp.type == 'answer'){            // 상대방 허용후 응답받음
                    await peers[userId].setRemoteDescription(new RTCSessionDescription(data.sdp));
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


/*
data안에 roomId를 가져옴
*/
const createRoom = data => {
//console.log(data);  {eventOp: 'CreateRoom', code: '200', message: 'OK', roomId: '14197589'}
    roomIdInput.value = data.roomId;            // 방번호 배정
    //room id copy to clipboard
    roomIdInput.select();
    roomIdInput.setSelectionRange(0, 99999);    //setSelectionRange : 0~99999 범위 선택
    document.execCommand("copy");               // 텍스트 드래그 할떄 파란 박스 영역에 대하여 execCommand('copy') : 복사, execCommand('cut') : 잘라내기 등등 사용

    alert('room id copied')
}

const roomJoin = data => {
 //   console.log(data);
    userId = data.userId;

}

const startSession = async data => {        // 다른 유저가 들어오면 startSession 실행됨. 유저의 비디오박스를 생성함.
    members = Object.keys(data.members);    //Object.keys() : members 이름들을 반복문과 동일한 순서로 순회해서 배열로 반환
    if(data.useMediaSvr == 'N'){    
        for(let i=0; i<members.length; ++i){
            let user = document.getElementById(members[i]);
            if(!user){
                createVideoBox(members[i]);
            }
            if(members[i] !== userId) remoteId = members[i];
        }

        SDPBtn.disabled = false;
        host = data.host;                   /////////////////////////////////////
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
        //SDPBtn.disabled = false;

        sendData(data);
    })
} 