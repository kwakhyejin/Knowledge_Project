

# WebRTC에 대하여

1. WebRTC란?
    - WebRTC(Web Real-Time Communications)란, 웹 어플리케이션(최근에는 android 및 ios도 지원) 및 사이트들이 별도의 소프트웨어 없이
    음성, 영상 미디어 혹은 텍스트, 파일 같은 데이터를 브라우저끼리 주고 받을 수 있게 만든 기술이다. 
    WebRTC로 구성된 프로그램들은 별도의 플러그인이나 소프트웨어 없이 p2p 화상회의 및 데이터 공유를 한다.

2. WebRTC의 주요 API 
    1) MediaStream - 카메라/마이크 등 데이터 스트림 접근
    2) RTCPeerConnection - 암호화 및 대역폭 관리, 오디오 또는 비디오 연결
    3) RTCDataChannel - json/text 데이터들을 주고받는 채널을 추상화한 API

3. Signaling
    - MediaStream으로 Peer(WebRTC의 Client)의 스트림을 얻고, RTCPeerConnection으로 연결하고자 하는 peer의 정보를 주고 받아 연결된다.
    이 과정을 "Signaling"이라고 한다.

4. SDP
    - Session Description Protocol 의 약자로 연결하고자 하는 Peer간의 미디어와 네트워크에 관한 정보를 이해하기 위해 사용한다.
    - setLocalDecription , setRemoteDecrption 을 이용하여 본인과 상대방의 SDP 정보를 저장 및 전송을 하는데 전송하는 역할은 webRTC 솔루션 에서 응답 데이터 값을 출력해준다.

5. Candidate
    - SDP를 통해 코덱 및 오디오의 정보를 수집이 진행되면, 상대방의 네트워크 정보를 교환하기 위해 실행한다.
    - Candidate 통해 서로의 네트워크 망에 대한 교환이 모두 끝났다면, web 에서 서로의 화면과 음성이 출력되는 것을 확인 할 수 있다. 

4. 주요 용어 및 설명
    1) SDP :  
    2) Promise 객체 : 자바스크립트 비동기 처리를 위한 객체
    3) async...await : 비동기처리패턴, HTTP 통신을 하는 비동기 처리 코드 앞에 await을 붙인다. (비동기처리메서드는 꼭 Promise객체를 반환해야함.)
    4) RTCPeerConnection : 로컬 컴퓨터와 원격 피어간의 WebRTC연결을 담당하며 원격 피어에 연결하기 위한 메서드들을 제공하고,
	                        연결을 유지하고 연결 상태를 모니터링 하며 더 이상 연결이 필요하지 않을 경우 연결을 종료한다.
    5) ICE(Interactive Connectivity Establishment) : 웹브라우저 간에 피어 투 피어 접속을 할수 있게 해주는 프레임워크(SDP,TURN..의 기술이 있음.)
    6) onicecandidate :  RTCPeerConnection인스턴스에서 icecandidate이벤트 발생시에 호출하려는 함수를 지정합니다.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## N:N 영상통화 & 1:1 영상통화 코드 분석

1. N : N 영상통화
 1) CreateRoom
    - 이 메서드로 방의 ID 를 생성.
 2) RoomJoin
    - 방의 ID를 유저가 받아서 들어간후 userId가 생성됨.
 3) StartSession
    - member를 확인하고 useMediaSvr이 Y이면 비디오박스를 생성함.
 4) createSDPOffer
    - RTCPeerConnection객체를 생성해서 스트림을 생성하고 setRemoteDecrption,setLocalDecription 상대방의 SDP와
      자신의 SDP를 저장하고 서버에 전달함.서버에서도 상대 유저에게 전달함.
 5) createSDPAnswer
    - RTCPeerConnection객체를 생성하고 스트림도 생성한후에 내 정보와 상대방의 SDP 정보 두개를 저장하고 서버에 전달함.
 6) leaveParticipant
    - 통화 종료시 비디오박스, 스트림, peer를 제거함.
 7) receiveFeed ★★★★


2. 1 : 1 영상통화
 1) createRoom
    - 방 ID 생성
 2) RoomJoin
    - 방 입장시 UserId 생성.
 3) StartSession
    - useMediaSvr이 N이면 비디오 박스 생성해주고 remoteId와 member의 ID가 다를경우 맞춰줌.
 4) createSDPOffer
    - (N:N과 차이점만 기술해놓음) 상대방의 영상을 가져와서 요청자의 화면에 출력해주는 부분이 추가됨.
 5) createSDPAnswer
    - (N:N과 차이점만 기술해놓음) 나의 영상을 화면에 출력해주고 내 정보와 상대방의 정보를 저장한후에 서버에 전달.
 6) leaveParticipant
    - 통화 종료시 비디오박스, 스트림, peer를 제거함.
 7) receiveFeed

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Question.
1. N:N 영상통화해서는 화면출력해주는 부분을 못봤는데 서버에서 화면 출력해주는 부분이 구현이 되어 있는건지?
2. receiveFeed 는 어떤 메서드인가?