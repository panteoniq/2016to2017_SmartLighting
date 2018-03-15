//따로 필요한 변수들은 모바일에서 받거나 직접 추출하여 저장해야 함
//테스트 용도로 초기화한 값들이 많으니 확인 후 수정할 것
//require문에 들어간 모듈들은 직접 설치해야 함 (sudo npm install 모듈명)
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3000/sl_node');
const macaddress=require('macaddress');
const ip=require("ip");


//const timer= require('timer');


var macAddr;
var localIP=ip.address();
var LRQData=Object();
var LRQdataStr;
var LUQData=Object();
var UCQData=Object();
var LTSData=Object();
var CCQData=Object();

//현재 날짜-시간 반환 함수(yyyy/mm/dd hh:mm:ss)
function getDayTime()
{
	var today=new Date();
	var dd = today.getDate()-1;
  var mo = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();
	var hh=today.getHours();
	var mi=today.getMinutes();
	var ss=today.getSeconds();
  if(dd<10);
    dd='0'+dd;
  if(mo<10)
    mo='0'+mo;
  if(hh<10)
    hh='0'+hh;
  if(mi<10)
    mi='0'+mi;
	if(ss<10)
		ss='0'+ss;
  return yyyy+'/'+mo+'/'+dd+ ' '+ hh+":"+mi+":"+ss;
}

function printErr(txt)
{
	// console.log('\u001b[1m');
	// console.log('\u001b[31m',txt);
	// console.log('\u001b[0m');
}

function printNotice(txt)
{
	// console.log('\u001b[1m');
	// console.log('\u001b[32m',txt);
	// console.log('\u001b[0m');
}

//맥 주소 추출
macaddress.one(function(err,mac) {
	macAddr= mac;
});

//파이 켤 때 등 등록하는 과정(디바이스랑 같이)
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

LRQdataStr=JSON.stringify(LRQData);
console.log(LRQdataStr);

UCQData = { // Light Registration Request
	Format : "UCQ",
	Data : {
		Time : getDayTime(),
		UserID: "test",
		Password: "testpassword"
	}
};
try
{
	ws.on('open', function() {
		//컨트롤러를 켠 후 서버와 연결되면 바로 컨트롤러와 LED를 서버에 등록하는 과정을 거쳐야 합니다.
		//기존의 등록된 컨트롤러와 LED라면 알아서 무시됩니다.
			console.log("[Notice] Connected With Server!");
			ws.send(JSON.stringify(LRQData));
			console.log("[Notice] Device & Light Registration Request...");
			setInterval(function() {
				CCQData= {
					Format: "CCQ",
					Data: {
						MacAddr : macAddr,
						Time : getDayTime()
					}
				}
				ws.send(JSON.stringify(CCQData));
			},59000);
	});
	ws.on('message', function(message) {
		var result=JSON.parse(message);
		switch(result.Format)
		{
			//Light Control Request에 대한 응답
			case "LTQ":

				//이
				//부분에
				//LTQ에 담긴 상태값에 맞게 LED를 제어하는 코드를 넣어놓습니다.
				//그리고 LED 제어 결과에 따라 LTS 포맷의 응답 데이터를 작성하여 반환하십시오.
				//아래는 예시입니다.

				LTSData = {
					Format : "LTS",
					Data : {
						Status : "Success",
						Info : {
							DevName : "Test",
							MacAddr : macAddr,
							IPAddr : localIP,
							Color : {
								Red : result.Data.Control.Color.Red,
								Green : result.Data.Control.Color.Green,
								Blue : result.Data.Control.Color.Blue
							},
							BLE : {
								Status : result.Data.Control.BLE.Status,
								Connect : result.Data.Control.BLE.Connect
							}
						}
					}
				};
				ws.send(JSON.stringify(LTSData));
				break;

			//Light Registration Response를 받아 그대로 출력
			case "LRS":
				console.log("[Notice] Response of Light Registration : " + result.Data.Status);
				if (result.Data.Status!="Success")//만얀 정상 등록이 안 되었을 경우 자세한 에러 내용을 출력
					console.log("[Error] Error Information of LRS Data: " + result.Data.Info);
				break;

			//Light Control Update Response를 받아 그대로 출력
			case "LUS":
				console.log("[Notice] Response of Light Condition Update : " + result.Data.Status);
				if (result.Data.Status!="Success")//만얀 정상 등록이 안 되었을 경우 자세한 에러 내용을 출력
					console.log("[Error] Error Information of LUS Data : " + result.Data.Info);
				break;

			//User Check Response를 받아 그대로 출력
			case "UCS" :
				console.log("[Notice] Response of User Information Check : " + result.Data.Status);
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

//BLE와 통신하는 부분은 관련 하드웨어가 없어 구현하지 않았습니다.
//====================================================
//LUQ 데이터는 모바일에서 LED의 상태를 변경했을 때 서버로 해당 변경 사항을 알리기 위해 사용됩니다.
//★★★★★그러므로 모바일과 통신하는 지역으로 옮겨주세요★★★★★
LUQData = { // Light Condition Update Request
	Format : "LUQ",
	Data : {
		Time : getDayTime(),
		Info : {
			MacAddr : macAddr,
			Color : {
				Red : 100,
				Green : 100,
				Blue : 100
			},
			BLE : {
				Status : "ON", // 핸드폰과 BLE로 통신할 것이므로 이 field는 변경할 필요 없습니다.
				Connect : "010-1234-1234" //전화번호는 모바일에서 받아온 데이터로 수정해야 합니다.
			}
		}
	}
}; //ws.send(LUQData);
