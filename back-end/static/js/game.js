import { createPoseCanvas, initGame_solo } from "./scripts/utils.js";
import { Config } from "./scripts/config.js";
import { getLevel } from "./scripts/fetchUtils.js";

let roomId;
let user_id;
const width = 1024;
const aspectRatio = 1.77;
const detectorPromise = new Promise((resolve) => {
    window.addEventListener('load', async function() {
        console.log('loading detector')
        window.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        });
        console.log('detector loaded')
        resolve(); // Resolve the promise
    });
});
$(async () => {
    await detectorPromise;
    const video = $("#video").get(0);
    const camCanvas = createPoseCanvas($("#camCanvas").get(0));
    const cCanvas = document.getElementById("camCanvas");
    const camContext = cCanvas.getContext("2d");
    const imgCanvas = createPoseCanvas($("#imgCanvas").get(0));
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
            video.onloadedmetadata = async () => {
                // resolve();
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
            };
        });
        await video.play(); // Start playing the video
        console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);

        // Use the stream as needed
    } catch (error) {
        console.error("Error accessing webcam:", error);
    }
    console.log('init')
    // Function to draw the video frame onto the canvas
    const drawVideoFrame = () => {
        camContext.drawImage(video, 0, 0, cCanvas.width, cCanvas.height);
        requestAnimationFrame(drawVideoFrame); // Schedule the next frame
    };

    // Start drawing video frames onto the canvas
    drawVideoFrame();


    console.log("3) Video dimensions:", video.videoWidth, "x", video.videoHeight);

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

