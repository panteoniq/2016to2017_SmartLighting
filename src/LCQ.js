//따로 필요한 변수들은 모바일에서 받거나 직접 추출하여 저장해야 함
//테스트 용도로 초기화한 값들이 많으니 확인 후 수정할 것
//require문에 들어간 모듈들은 직접 설치해야 함 (sudo npm install 모듈명)
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3000/sl_node');
const macaddress=require('macaddress');
const ip=require("ip");

var macAddr;
var localIP=ip.address();
macaddress.one(function(err,mac) {
	macAddr= mac;
});
var LCQData=Object();
var LRQData=Object();
LRQData = { // Light Registration Request
	Format : "LRQ",
	Data : {
		DevName : "Test",
		MacAddr : macAddr,
		IPAddr : localIP,
		BLEMacAddr : "aa-bb-cc-dd-ee-ff",
		Property : {
			RoomID : 1,
			LightNumber : 1,
			Color : {
				Red:255,
				Green:255,
				Blue:255
			},
			BLE : "4.1"
		}
	}
};


LCQData = { // Light Registration Request
	Format : "LCQ",
	Data : {
		DevName : "Test",
		MacAddr: macAddr,
		IPAddr: localIP,
		Property : {
			RoomID : 1,
			LightNumber : 1
		}
	}
};
try
{
	ws.on('open', function() {
		//컨트롤러를 켠 후 서버와 연결되면 바로 컨트롤러와 LED를 서버에 등록하는 과정을 거쳐야 합니다.
		//기존의 등록된 컨트롤러와 LED라면 알아서 무시됩니다.
			console.log("[Notice] Connected With Server!");
			ws.send(JSON.stringify(LRQData));
	});
	ws.on('message', function(message) {
		var result=JSON.parse(message);
		switch(result.Format)
		{
			case "LRS" :
				ws.send(JSON.stringify(LCQData));
				console.log("[Notice] LCQ 보냄");
				break;
			case "LCS" :
				console.log("[Notice] Response of Light Connection Request : " + result.Data.Status);
				if (result.Data.Status!="Success")//만얀 정상 등록이 안 되었을 경우 자세한 에러 내용을 출력
					console.log("[Error] Error Information of UCS Data : " + result.Data.Info);
				break;
		}
	});
}
catch(err)
{
	console.log("[Error] error is detected : "+err);
}
