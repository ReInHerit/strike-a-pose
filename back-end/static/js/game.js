import { createPoseCanvas, initGame_solo, initGame_versus, picture_ids_for_level } from "./scripts/utils.js";
import { Config } from "./scripts/config.js";
import { getLevel } from "./scripts/fetchUtils.js";

const serverUrl = Config.SERVER_URL; // `${window.location.protocol}//${window.location.hostname}`;
let socket = io.connect(serverUrl);
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
        // const stream =
        // const video = document.querySelector('video');
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

// async function setCameraDimensions(width, aspectRatio, videoElement) {
//     const constraints = {
//         video: {
//             width: { ideal: width },
//             height: { ideal: width / aspectRatio },
//             aspectRatio: { ideal: aspectRatio }
//         }
//     };
//
//     try {
//         const stream = await navigator.mediaDevices.getUserMedia(constraints);
//         // const video = document.querySelector('video');
//         videoElement.srcObject = stream;
//         await new Promise((resolve) => {
//             videoElement.onloadedmetadata = () => {
//                 resolve();
//             };
//         });
//         await videoElement.play(); // Start playing the video
//         console.log("Video dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
//
//         // Use the stream as needed
//     } catch (error) {
//         console.error("Error accessing webcam:", error);
//     }
//     return videoElement;
// }
async function initGameIfNeeded(queryParams, gameMode, video, camCanvas, imgCanvas, camContext) {
    const mode = gameMode.normalize();
    console.log(video.width, video.height);
    if (mode === "solo") {
        const levelId = queryParams.get("id");
        user_id = queryParams.get("playerId");
        const poses = queryParams.get("nPose");
        adjustSoloLayout();
        await initGame_solo(levelId, poses, video, camCanvas, imgCanvas, user_id);//, camContext
    } else if (mode === "versus") {
        const gameData = JSON.parse(queryParams.get("gameData"));
        // const player = queryParams.get("player");
        const { paintings_ids, roomId, playerId, nPose, nRound } = gameData;
        // user_id = playerId;
        const poses = parseInt(nPose, 10);
        const rounds = parseInt(nRound, 10);
        adjustVersusLayout();

        await initGame_versus(socket, roomId, paintings_ids, poses, rounds, video, camCanvas, imgCanvas, playerId);
    }
};
function adjustSoloLayout() {
    document.getElementById("timer").style.display = "none";
    document.getElementById("score_container").style.display = "flex";
    document.getElementById("score_container").style.alignContent = "center";
}

function adjustVersusLayout() {
    document.getElementById("timer").style.display = "flex";
}


window.onbeforeunload = function() {
    const retired = localStorage.getItem("retired") === "true";
    if (retired) {
        const queryParams = new URLSearchParams(window.location.search);
        const mode = queryParams.get("mode");
        if (mode && mode.normalize() === "versus" && socket !== undefined) {
            socket.emit("leaveGame", roomId);
            console.log("Disconnect from game");
            delay(1000);
        }
    }
};

function delay(ms) {
    var start = +new Date;
    while ((+new Date - start) < ms) ;
}