import { createPoseCanvas, initGame, initGame2 } from "./scripts/utils.js";

var socket = undefined;
var roomId;
localStorage.setItem("retired","true");

$(async () => {
  const video = $("#video").get(0);
  const webcam = new Webcam(video, "user");
  await webcam.stream();
  const camCanvas = createPoseCanvas($("#camCanvas").get(0));
  const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));

  const queryParams = new URLSearchParams(window.location.search);

  const gameMode = queryParams.get("mode");

  if(gameMode.normalize() === "solo"){
    const levelId = queryParams.get("id");
    document.getElementById("canvas-container-img").id = "canvas-container-imgSolo";
    document.getElementById("canvas-container-cam").id = "canvas-container-camSolo";
    document.getElementById("timer").display = "none !important";
    document.getElementById("score_container").setAttribute("display", "flex");
    document.getElementById("score_container").setAttribute("align-content", "center");

    initGame(levelId, video, camCanvas, imgCanvas);
  }else if(gameMode.normalize() === "versus"){
    document.getElementById("canvas-container-img").style.height = "42%";
    document.getElementById("canvas-container-cam").style.height = "46%";
    const picturesArray = JSON.parse(localStorage.getItem("picturesArray"));
    const serverUrl = `${window.location.protocol}//${window.location.hostname}`;
    const socket = io.connect(serverUrl);
    roomId = localStorage.getItem("roomId");
    socket.emit("join", roomId, null);

    socket.on("room_message", (msg) => {
      console.log("message from room: " + msg);
    });

    socket.on("user_retired", () => {
      socket.emit("leave", roomId, true);

      socket.on("retired_message", (msg) => {
        console.log("message from room: " + msg);
        localStorage.setItem("retired","false");
        location.href = `/end?id=No&player=winner`;
      });
    });
    
    const nPose = queryParams.get("nPose");
    const nRound = queryParams.get("nRound");

    document.getElementById("timer").style.display = "flex";
    initGame2(socket,roomId,picturesArray,nPose, nRound, video, camCanvas,imgCanvas);
  }
});

window.onbeforeunload = function () {
  if(localStorage.getItem("retired") === "true"){
    const queryParams = new URLSearchParams(window.location.search);
    if(queryParams.get("mode") != null && queryParams.get("mode").normalize() === "versus" && socket !== undefined){
      socket.emit("leaveGame", roomId);
      console.log("Disconnect from game");
      delay(1000);
    }
  }
}

function delay(ms) {
  var start = +new Date;
  while ((+new Date - start) < ms);
}