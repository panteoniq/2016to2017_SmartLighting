var WebSocketServer = require('ws').Server;
var mysql = require('mysql');
var wss = new WebSocketServer({
  port: 3000
});

//---변수---
var result;
var last_transaction_time=getTransactionTime();
var isConnected=false;
var device_ip; //status 변경을 위해서 ip와 mac은 별도로 갖고 있어야 합니다
var device_mac; //status 변경을 위해서 ip와 mac은 별도로 갖고 있어야 합니다.
//---변수---

var connection = mysql.createConnection({ //MySQL 연결을 위한 정보
  host: 'localhost',
  user: 'root',
  password: 'apmsetup',
  port: 3306,
  database: 'sl_node'
});

function getDayTime()
{
	var today=new Date();
	var dd = today.getDate()-1;
  var mo = today.getMonth()+1; //January is 0!
	var yyyy = today.getFullYear();
	var hh=today.getHours();
	var mi=today.getMinutes();
	var ss=today.getSeconds();
  if(dd<10)
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

function getTransactionTime()
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
  return yyyy+mo+dd+hh+mi+ss;
}


function printErr(txt)
{
  //console.log가 자동 개행되기 때문에 색상은 바꿀 수 있지만 여러 줄이 띄워져서 출력되는 문제가...
	// console.log('\u001b[1m');
	// console.log('\u001b[31m',txt);
	// console.log('\u001b[0m');
  console.log(txt);
}

function printNotice(txt)
{
  //console.log가 자동 개행되기 때문에 색상은 바꿀 수 있지만 여러 줄이 띄워져서 출력되는 문제가...
	// console.log('\u001b[1m');
	// console.log('\u001b[32m',txt);
	// console.log('\u001b[0m');
  console.log(txt);
}

connection.connect(function(err) { //MySQL 연결. 에러 발생 시 콜백함수로 에러 내용 표시
  if (err) {
    console.error('mysql connection error');
    console.error(err);
    throw err;
  }
});

console.log("[Notice] ws Server is running...");


//LTQ 데이터를 보내주는 함수. 필요한 부분에 끼워서 쓸 것.
function LTQSend() //알맞은 매개변수 추가해줄 것
{
  var LTQData = Object();

  LTQData = {
    Format: "LTQ",
    Data: {
      Time: "2017/02/01-14:23:01 ",
      Control: {
        Color: {
          Red: 100,
          Green: 100,
          Blue: 100
        },
        BLE: {
          Status: "OFF",
          Connect: "010-1234-1234" //사용자로부터 받은 전화번호를 넣을 것
        }
      }
    }
  };

  ws.send(JSON.stringify(LTQData));
}


//Lumen: 최대 밝기. 0이면 최대 밝기를 모르는 것.
wss.on('connection', function(ws, req) { //커넥션이 맺어지면 실행되는 부분

  //연결됐다는 메세지를 여기서 출력해야 하지만 local인 경우 127.0.0.1로 출력되므로
  //클라이언트 측에서 연결 시 보내는 LRQ Data의 ip를 사용하도록 합니다.

  isConnected=true;
  last_transaction_time=getTransactionTime();

  //타임아웃 확인. 타임아웃 시 디바이스의 status를 0으로 변경(완료)
  setInterval(function() {
    if ((getTransactionTime() - last_transaction_time>100) && isConnected)
    {
      //mysql 상태에서 status 변경하고 로그 출력할 것
      var DeviceData=[device_ip,device_mac];
      isConnected=false;
      console.log("[Notice] ["+device_ip+"] is timeout : ");
      var DevSearchQuery=connection.query("select * from device where ip=? and mac=?", DeviceData, function(err, rows, fields) {
        if (err)
        {
          console.log("[Error] Device Searching for Modifying Status Error (Timeout)")
        }
        else if (rows.length==0)
        {
          console.log("[Error] Device(ip : \'"+device_ip+"\'/ mac : \'"+device_mac+"\' is Not Exist (Timeout)");
        }
        else
        {
          var DevStatUpdateQuery=connection.query("update devices set status=0 where ip=? and mac=?",DeviceData, function(err,rows,fields)
          {
            if (err)
              console.log("[Error] Device Status Updating Error (Timeout)");
          });
        }
      });
    }
  }, 60000);

  //에러 발생(클라이언트의 연결 종료) 시 처리->완료
  ws.on('error', function() {
    var DeviceData=[device_ip,device_mac];
    console.log("[Notice] "+ device_ip + "\'s connection is closed. (Connection Close)");
    var DevSearchQuery=connection.query("select * from devices where ip=? and mac=?", DeviceData, function(err, rows, fields) {
      if (err)
      {
        console.log("[Error] Device Searching for Modifying Status Error (Connection Close)")
      }
      else if (rows.length==0)
      {
        console.log("[Error] Device(ip : \'"+device_ip+"\' mac : \'"+device_mac+"\' is Not Exist (Connection Close)");
      }
      else
      {
        var DevStatUpdateQuery=connection.query("update devices set status=0 where ip=? and mac=?", DeviceData, function(err,rows,fields)
        {
          if (err)
            console.log("[Error] Device Status Updating Error(Connection Close)");
        });
      }
    });
  });

  //클라이언트로부터 일반 Data를 받았을 때 실행되는 부분
  ws.on('message', function(message) {
    var reqObj = JSON.parse(message);
    if (reqObj.Format == "LRQ") //Light Registration Request
    {
      //LED 센서의 등록 요청.
      device_ip=reqObj.Data.IPAddr;
      device_mac=reqObj.Data.MacAddr;

      console.log("[Notice] connected with client [" + device_ip + "] at " + getDayTime());
      console.log("[Notice] Device and Light Registration of " + device_ip);

      var LRSData = Object();
      var correct=true;
      var devType = 1;
      var devMac = reqObj.Data.MacAddr;
      var devName = reqObj.Data.DevName;
      var devIP=reqObj.Data.IPAddr;

      var LEDType = 1;
      var LEDRoomId = reqObj.Data.Property.RoomID;
      var LEDRoomLightNum = reqObj.Data.Property.LightNumber;
      var red = reqObj.Data.Property.Color.Red;
      var green = reqObj.Data.Property.Color.Green;
      var blue = reqObj.Data.Property.Color.Blue;
      var controllerStatus=true;

      //insert into devices values("192.168.0.54", "b8:27:eb:7c:02:71", 0, "test",1);
      //insert into light values("192.168.0.54", "b8:27:eb:7c:02:71", 1, 1, 1, 255,255,255);

      var devSearchData = [devIP, devMac];
      var LEDSearchData = [devIP, devMac, LEDRoomId, LEDRoomLightNum];

      var devInsertData = [devIP, devMac, devType, devName];
      var LEDInsertData = [devIP, devMac, LEDType, LEDRoomId, LEDRoomLightNum, red, green, blue];

      //동일한 디바이스 있는지 검색
      var devSearchQuery = connection.query('select * from devices where ip=? and mac=?', devSearchData, function(err, rows, fields) {
        if (rows.length == 0)
        {
          var devInsertQuery = connection.query('insert into devices values(?,?,?,?,1)', devInsertData, function(err, rows, fields) {
            if (err)
            {
              console.log('[Error] Error while performing Query(devInsertData) : '+ err.code);
              LRSData = {
                Format: "LRS",
                Data: {
                  Status: "Fail",
                  Info : "DBError"
                }
              };
              ws.send(JSON.stringify(LRSData));
            }
          });
        }//중복된 디바이스라도 다른 LED가 들어갈 수 있으니 length가 1 이상이면 그냥 넘김
      });//devices select query end
      var LEDSearchQuery = connection.query("select * from light where device_ip=? and device_mac=? and room_id=? and room_light_num=?", LEDSearchData, function(err, rows, fields) {
        if (err)
        {
          console.log('[Error] Error while performing Query(LEDSearchData).' + err.code);
          LRSData = {
            Format: "LRS",
            Data: {
              Status: "Fail",
              Info : "DBError"
            }
          };
          ws.send(JSON.stringify(LRSData));
          last_transaction_time=getTransactionTime();
        }//if select query err end
        else if (rows.length == 0) {
          var LEDQuery = connection.query('insert into light values(?,?,?,?,?,?,?,?)', LEDInsertData, function(err, rows, fields) {
            if (err)
            {
              console.log('[Error] Error while performing Query(LEDInsertData).' + err.code);
              LRSData = {
                Format: "LRS",
                Data: {
                  Status: "Fail",
                  Info : "DBError"
                }
              };
              ws.send(JSON.stringify(LRSData));
              last_transaction_time=getTransactionTime();
            }//if insert query err end
            else {
              console.log("device, led 정상 insert");
              LRSData = {
                Format: "LRS",
                Data: {
                  Status: "Success",
                  Info: "None"
                }
              };
              ws.send(JSON.stringify(LRSData));
              last_transaction_time=getTransactionTime();
            }//if insert query not err end
          });
        } //  if (rows.length == 0) end
        else {
          LRSData = {
            Format: "LRS",
            Data: {
              Status: "Fail",
              Info: "AlreadyExist"
            }
          };
          ws.send(JSON.stringify(LRSData));
          last_transaction_time=getTransactionTime();
        }
      });
    } else if (reqObj.Format == "CCQ") {
      //마지막 트랜잭션 이후 1분이 지나면 클라이언트에서 자동으로 CCQ가 날아옵니다
      //서버는 이를 보낸 후 이 클라이언트에 대한 타이머를 갱신시켜줍니다.
      //응답 데이터 포맷은 CCS입니다.
      var CCQData = {
        Format: "CCS",
        Status: "Success"
      }
      ws.send(JSON.stringify(CCQData));
      last_transaction_time=getTransactionTime();

    } else if (reqObj.Format == "LCQ") {
      var LCSData=Object();
      var devIP=reqObj.Data.IPAddr;
      var devMac = reqObj.Data.MacAddr;
      var roomID=reqObj.Data.Property.RoomID;
      var lightNum=reqObj.Data.Property.LightNumber;
      var LightSearchData=[devIP,devMac,roomID,lightNum];

      var LightSearchQuery=connection.query("select * from light where device_ip=? and device_mac=? and room_id=? and room_light_num=?",LightSearchData, function(err,rows, fields) {
        if (err)
        {
          console.log('[Error] Error while performing Query.(LUQ Light Search)'+ err.code);
          LCSData = {
            Format: "LCS",
            Data: {
              Status: "Fail",
              Info : "DBError"
            }
          };
          ws.send(JSON.stringify(LCSData));
          last_transaction_time=getTransactionTime();
        }//if err end
        else if (rows.length==0)
        {
          LCSData = {
            Format: "LCS",
            Data: {
              Status: "Fail",
              Info : "LightNotExist"
            }
          };
          ws.send(JSON.stringify(LCSData));
          last_transaction_time=getTransactionTime();
        }//else if rows.length==0 end
        else
        {
          var DevStatUpdateQuery=connection.query("update devices set status=1 where ip=? and mac=?",[devIP,devMac], function(err, rows, fields)
          {
            if (err)
            {
              console.log("[Error] Error while performing Query.(Device Status Update)");
              LCSData = {
                Format: "LCS",
                Data: {
                  Status: "Fail",
                  Info : "DBError"
                }
              };
              ws.send(JSON.stringify(LCSData));
              last_transaction_time=getTransactionTime();
            }//if err end
            else
            {
              LCSData = {
                Format: "LCS",
                Data: {
                  Status: "Success",
                  Info : "None"
                }
              };
              ws.send(JSON.stringify(LCSData));
              last_transaction_time=getTransactionTime();
            }
          });

        }
      });
    } else if (reqObj.Format == "LTS")
    {
      //컨트롤러부터 제어에 대한 반응을 받았으므로 이에 대한 적절한 로그를 출력
      console.log("[Notice] Light Control Response of ["+ip+"] : "+ reqObj.Data.Status);
      console.log("[Notice] LED's Color - Red : " + reqObj.Data.Info.Color.Red + ", Green : " + reqObj.Data.Info.Color.Green + ", Blue : " + reqObj.Data.Info.Color.Red);
      //트랜잭션 완료되었으니 마지막 트랜잭션 시간 갱신(1분 뒤로)
      last_transaction_time=getTransactionTime();

    } else if (reqObj.Format == "LUQ")//180314. 정상 처리 확인!
    {
      //컨트롤러부터 현재 LED의 상태를 업데이트해달라는 메시지. 디비 처리한 후 처리 결과에 따른 응답을 보내줄 것(LUS)
      console.log("[Notice] Light Condition Update Request of : "+ device_ip);
      var LUSData = Object();

      var devIP=reqObj.Data.Info.IPAddr;
      var devMac = reqObj.Data.Info.MacAddr;
      var roomID=reqObj.Data.Info.Property.RoomID;
      var lightNum=reqObj.Data.Info.Property.LightNumber;
      var newRed = reqObj.Data.Info.Property.Color.Red;
      var newGreen = reqObj.Data.Info.Property.Color.Green;
      var newBlue = reqObj.Data.Info.Property.Color.Blue;

      var devSearchData=[devIP,devMac,roomID,lightNum];
      var LightSearchQuery = connection.query('select * from light where device_ip=? and device_mac=? and room_id=? and room_light_num=?', devSearchData, function(err, rows, fields) {
        if (err) {
          console.log('[Error] Error while performing Query.(LUQ Light Search)'+ err.code);
          LUSData = {
            Format: "LUS",
            Data: {
              Status: "Fail",
              Info : "DBError"
            }
          };
          ws.send(JSON.stringify(LUSData));
          last_transaction_time=getTransactionTime();
        } //if err end
        else if (rows.length==0)
        {
          LUSData = {
            Format: "LUS",
            Data: {
              Status: "Fail",
              Info : "LightNotExist"
            }
          };
          ws.send(JSON.stringify(LUSData));
          last_transaction_time=getTransactionTime();
        }//else if rows check end
        else {
          var updateParam = [newRed, newGreen, newBlue, devIP, devMac,roomID,lightNum];
          var LightUpdateQuery = connection.query('update light set red=?, green=?, blue=? where device_ip=? and device_mac=? and room_id=? and room_light_num=?', updateParam, function(err, rows, fields) {
            if (err) {
              console.log('[Error] Error while performing Query.'+ err.code);
              LUSData = {
                Format: "LUS",
                Data: {
                  Status: "Fail",
                  Info : "DBError"
                }
              };
              ws.send(JSON.stringify(LUSData));
              last_transaction_time=getTransactionTime();
            } else {
              console.log('[Notice] DB Processing is success!');
              LUSData = {
                Format: "LUS",
                Data: {
                  Status: "Success",
                  Info: "None"
                }
              };
              ws.send(JSON.stringify(LUSData));
              last_transaction_time=getTransactionTime();
            }
          });
        }
      });
    } else if (reqObj.Format == "UCQ") //User Connection Request
    {
      //사용자의 로그인 요청 정보를 확인하는 메세지입니다. BLE 통신이 구현된 후 제대로 테이블(User)을 구축할 것이므로
      //일단은 예상하여 코드를 짜놓겠습니다.
      console.log("[Notice] User Check Request from "+ ip);
      var result;
      var UCSData = Object();
      var mac;

      time = reqObj.Data.Time;
      id = reqObj.Data.UserID;
      pw = reqObj.Data.Password;

      var UCQSearchData=[id,pw];
      console.log(mac);
      var UCQquery = connection.query('select * from user where id=? and password=SHA(?)', UCQSearchData, function(err, rows, fields) {
        if (err) {
          console.log('[Error] Error while performing Query : ', err.code);
          UCSData = {
            Format: "UCS",
            Data: {
              Status: "Fail",
              Info: "DBError"
            }
          }
          ws.send(JSON.stringify(UCSData));
          last_transaction_time=getTransactionTime();
        }//if err end
        else if (rows.length==0) {
          UCSData = {
            Format: "UCS",
            Data: {
              Status: "Fail",
              Info: "NotExist"
            }
          }
          ws.send(JSON.stringify(UCSData));
          last_transaction_time=getTransactionTime();
        }//else if rows check end
        else {
          UCSData = {
            Format: "UCS",
            Data: {
              Status: "Success",
              Info: "None"
            }
          }
          ws.send(JSON.stringify(UCSData));
          last_transaction_time=getTransactionTime();
        }
      });//UCQquery end
    }//else if (UCQ) end

  });//ws.on('message',~~~) end
});
