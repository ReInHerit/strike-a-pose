import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";

var socket = undefined;
var roomId;

$(async () => {
  const queryParams = new URLSearchParams(window.location.search);
  
  const player = queryParams.get("player");
  const endImg = document.getElementById("victoryImg");
  const endText = document.getElementById("final_title");
  var myResults;
  var opponentResults;

  if(player.normalize() === "solo".normalize()){
    endImg.src = "/static/assets/end/winner.gif";
    endText.innerHTML = "Congratulations, you win!";
  }else if(player.normalize() === "winner".normalize()){
    endImg.src = "/static/assets/end/winner.gif";
    endText.innerHTML = "Your opponent withdrawn, you win!";
    const serverUrl = `${window.location.protocol}//${window.location.hostname}`;
    const socket = io.connect(serverUrl);
    roomId = localStorage.getItem("roomId");
    socket.emit("end", roomId);
    socket.on("endGame", (msg) => {
      console.log(msg)
    });
  }else{
    endImg.src = "/static/assets/end/loadWinner.gif";
    endText.innerHTML = "Waiting for the opponent...";

    const serverUrl = `${window.location.protocol}//${window.location.hostname}`;
    const socket = io.connect(serverUrl);
    roomId = localStorage.getItem("roomId");
    socket.emit("join", roomId, null);
    socket.emit("acquireResults", roomId);

    socket.on("room_message", (msg) => {
      console.log("message from room: " + msg);
    });

    socket.on("user_retired", () => {
      endImg.src = "/static/assets/end/winner.gif";
      endText.innerHTML = "Your opponent withdrawn, you win!";
      //socket.emit("leave", roomId, false)
      socket.emit("end", roomId);
    });
    
    socket.on("getResults", (msg) => {
      if(player.normalize() === "1".normalize()){
        myResults = msg[0];
        opponentResults = msg[1];
      }else if(player.normalize() === "2".normalize()){
        myResults = msg[1];
        opponentResults = msg[0];
      }

      let roundP1=0,roundP2=0,posePR1=0,posePR2=0,timeP1=0,timeP2=0;
      let nRound = myResults.length;
      for(let i=0;i<nRound;i++){
        posePR1 += myResults[i].pose;
        posePR2 += opponentResults[i].pose;
        timeP1 += ((stringTimeToSeconds(Config.TIME_LIMIT) < myResults[i].time) ? 0 : stringTimeToSeconds(Config.TIME_LIMIT) - myResults[i].time);
        timeP2 += ((stringTimeToSeconds(Config.TIME_LIMIT) < opponentResults[i].time) ? 0 : stringTimeToSeconds(Config.TIME_LIMIT) - opponentResults[i].time);
        if(myResults[i].pose>opponentResults[i].pose){
          roundP1++;
        }else if(myResults[i].pose<opponentResults[i].pose){
          roundP2++;
        }
        document.getElementById("show_scores_button").style.display = "block";
        $("#tableG1").append('<tr><td>'+(i+1)+'</td><td>'+myResults[i].pose+'</td><td>'+myResults[i].time+'s</td></tr>');
        $("#tableG2").append('<tr><td>'+(i+1)+'</td><td>'+opponentResults[i].pose+'</td><td>'+opponentResults[i].time+'s</td></tr>');
      }

      let winner = victory(posePR1,posePR2,roundP1,roundP2,timeP1,timeP2);

      if(winner.normalize() === "TIE".normalize()){
        endImg.src = "/static/assets/end/tie.png";
        endText.innerHTML = "Tie!"
      }else if(winner.normalize() === "P1".normalize()){
        endImg.src = "/static/assets/end/winner.gif";
        endText.innerHTML = "Congratulations, you win!";
      }else if(winner.normalize() === "P2".normalize()){
        endImg.src = "static/assets/end/loser.gif";
        endText.innerHTML = "You lose!";
      }

      //socket.emit("leave", roomId, false);
      socket.emit("end", roomId);
    });

    socket.on("endGame", (msg) => {
      console.log(msg)
    });
  }

  const videoId = queryParams.get("id");
  if(videoId.normalize() === "No"){
    document.getElementById("testo_end").style.display = "none";
    document.getElementById("video_download").style.display = "none";
    return;
  }

  if (!videoId) {
    return;
  }

  const video = await getVideo(videoId);

  const downloadVideoEl = $("button#video_download");
  downloadVideoEl.click(() => {
    fetch(`${Config.SERVER_URL}${video.path}`)
      .then((response) => response.blob())
      .then((blob) => {
        const blobURL = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobURL;
        a.style = "display: none";
        a.download = "strike_a_pose.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  });
});

function victory(posePR1,posePR2,roundP1,roundP2,timeP1,timeP2){
  let who = "TIE";
  let pointsPose = 5,pointsRound = 10;
  let pointsP1 = pointsPose*posePR1 + pointsRound*roundP1 + timeP1;
  let pointsP2 = pointsPose*posePR2 + pointsRound*roundP2 + timeP2;
  if(pointsP1 > pointsP2){
    who = "P1";
  }else if(pointsP2 > pointsP1){
    who = "P2";
  }
  return who;
}

$("#show_scores_button").on("click", () => {
  $("#tableG1").show();
  $("#tableG2").show();
});

function stringTimeToSeconds(time){
  let fields = time.split(':');
  let seconds = parseFloat(fields[0]*60) + parseFloat(fields[1]) + parseFloat(fields[2]/100);
  return seconds;
}