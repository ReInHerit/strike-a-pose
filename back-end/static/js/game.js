import { createPoseCanvas, initGame_solo } from "./scripts/utils.js";
import { Config } from "./scripts/config.js";
import { getLevel } from "./scripts/fetchUtils.js";

// const serverUrl = Config.SERVER_URL; // `${window.location.protocol}//${window.location.hostname}`;
// let socket = io.connect(serverUrl);
let roomId;
let user_id;
const width = 1024;
const aspectRatio = 1;

$(async () => {
    const video = $("#video").get(0);

    console.log("1) Video dimensions:", video.videoWidth, "x", video.videoHeight);
    // await setCameraDimensions(1024, 1, video);
    const constraints = {
        video: {
            width: { ideal: width },
            height: { ideal: width / aspectRatio },
            aspectRatio: { ideal: aspectRatio }
        }
    };

    try {
        video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
        await video.play(); // Start playing the video
        console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);

        // Use the stream as needed
    } catch (error) {
        console.error("Error accessing webcam:", error);
    }
    const camCanvas = createPoseCanvas($("#camCanvas").get(0));
    const cCanvas = document.getElementById("camCanvas");
    const camContext = cCanvas.getContext("2d");
    const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));
    video.addEventListener('loadedmetadata', async() => {

        const queryParams = new URLSearchParams(window.location.search);
        console.log("4) Video dimensions:", video.videoWidth, "x", video.videoHeight);
        const gameMode = queryParams.get("mode");
        const initGame = async () => {
            await initGameIfNeeded(queryParams, gameMode, video, camCanvas, imgCanvas, camContext);
        };
        // Check if TensorFlow is loaded
        if (typeof tf === "undefined") {
            console.log("TensorFlow is not loaded yet. Waiting...");
            setTimeout(initGame, 1000); // Adjust the delay time as needed
        } else {
            await initGame();
        }
    });

    console.log("3) Video dimensions:", video.videoWidth, "x", video.videoHeight);
    const webcam = new Webcam(video, "user", cCanvas);
    await webcam.stream();
});


async function initGameIfNeeded(queryParams, gameMode, video, camCanvas, imgCanvas){
    const levelId = queryParams.get("id");
    user_id = queryParams.get("playerId");
    const poses = queryParams.get("nPose");
    adjustSoloLayout();
    await initGame_solo(levelId, poses, video, camCanvas, imgCanvas, user_id);//, camContext

};
function adjustSoloLayout() {
    document.getElementById("timer").style.display = "none";
    document.getElementById("score_container").style.display = "flex";
    document.getElementById("score_container").style.alignContent = "center";
}


// window.onbeforeunload = function() {
//     const retired = localStorage.getItem("retired") === "true";
//     if (retired) {
//         const queryParams = new URLSearchParams(window.location.search);
//         const mode = queryParams.get("mode");
//         if (mode && mode.normalize() === "versus" && socket !== undefined) {
//             socket.emit("leaveGame", roomId);
//             console.log("Disconnect from game");
//             delay(1000);
//         }
//     }
// };
//
// function delay(ms) {
//     var start = +new Date;
//     while ((+new Date - start) < ms) ;
// }