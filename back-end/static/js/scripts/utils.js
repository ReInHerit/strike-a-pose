import { Config } from "./config.js";
import { getLevel, getPicture, getAllPictures, postVideo } from "./fetchUtils.js";

let startTime;
let elapsedTime = 0;
let timerInterval;
// const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
// Utility Functions
async function picture_ids_for_level(level) {
    const picture_list = await getAllPictures();
    console.log(picture_list)
    let picture_ids = [];
    let level_pictures_ids = [];
    for (let i = 0; i < picture_list.length; i++) {
        picture_ids.push(picture_list[i].id);
    }
    console.log(picture_ids)
    for (let i = 0; i < picture_ids.length; i++) {
        console.log(picture_ids[i]);
        const id = picture_ids[i];
        // const picture = picture_list[i];
        //
        // console.log(picture_list[i].category)
        if (
            (level.id === 1 && picture_list[i].category === 'halfBust') ||
            (level.id === 2 && picture_list[i].category === 'fullLength') ||
            (level.id === 3)
        ) {
            level_pictures_ids.push(id);
        }
    }
    console.log(level_pictures_ids)
    return level_pictures_ids;
}
function normalizeKPs(poses, width, height) {
    return (poses?.[0]?.keypoints || [])
          .filter((kp) => kp.score > 0.3)
          .map(({ x, y, score, name }) => ({
              x: x / width,
              y: y / height,
              score,
              name
          }));
}

function createPoseDistanceFrom(keypointsA) {
    const [avgXA, avgYA] = keypointsA.reduce((sums, kpA) => [sums[0] + kpA.x, sums[1] + kpA.y], [0, 0]).map(sum => sum / keypointsA.length);

    return function(keypointsB) {
        const count = keypointsA.reduce((res, kpA) => (keypointsB.find(kpB => kpA.name === kpB.name) ? res + 1 : res), 0);
        if (count < keypointsA.length / 2) {
            return 1;
        }
        const [avgXB, avgYB] = keypointsB.reduce((sums, kpB) => [sums[0] + kpB.x, sums[1] + kpB.y], [0, 0]).map(sum => sum / keypointsB.length);

        return Math.sqrt(
              keypointsA.reduce((res, kpA) => {
                  const kpB = keypointsB.find(kpB => kpA.name === kpB.name);
                  if (!kpB) {
                      return res + 1;
                  }
                  const relativeDistanceXA = kpA.x - avgXA;
                  const relativeDistanceXB = kpB.x - avgXB;
                  const relativeDistanceYA = kpA.y - avgYA;
                  const relativeDistanceYB = kpB.y - avgYB;
                  const spaceDistance = Math.sqrt(Math.pow(relativeDistanceXA - relativeDistanceXB, 2) + Math.pow(relativeDistanceYA - relativeDistanceYB, 2));
                  return res + spaceDistance;
              }, 0) / keypointsA.length
        );
    };
}

function createPoseCanvas(canvas) {
    canvas.width = Config.WIDTH;
    canvas.height = Config.HEIGHT;
    const ctx = canvas.getContext("2d");

    function drawPoint({ x, y, r, color = "white" }) {
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.width, r, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawSegment({ pointA, pointB, color = "white" }) {
        if (pointA && pointB) {
            ctx.beginPath();
            ctx.moveTo(pointA.x * canvas.width, pointA.y * canvas.width);
            ctx.lineTo(pointB.x * canvas.width, pointB.y * canvas.width);
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    }

    return {
        canvas,
        drawPoint,
        drawSegment,
        drawImage: function(img) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        },

        drawSkeleton: function({ keypoints, color = "white" }) {
            const adjacentKeyPoints = [
                ["nose", "left_eye"],
                ["nose", "right_eye"],
                ["left_eye", "left_ear"],
                ["right_eye", "right_ear"],
                ["left_shoulder", "right_shoulder"],
                ["left_shoulder", "left_elbow"],
                ["left_elbow", "left_wrist"],
                ["right_shoulder", "right_elbow"],
                ["right_elbow", "right_wrist"],
                ["left_shoulder", "left_hip"],
                ["right_shoulder", "right_hip"],
                ["left_hip", "right_hip"],
                ["left_hip", "left_knee"],
                ["left_knee", "left_ankle"],
                ["right_hip", "right_knee"],
                ["right_knee", "right_ankle"]
            ];

            keypoints.forEach(({ x, y }) => {
                drawPoint({ x, y, r: 6 });
            });

            adjacentKeyPoints.forEach(([first, second]) => {
                drawSegment({
                    pointA: keypoints.find(({ name }) => name === first),
                    pointB: keypoints.find(({ name }) => name === second),
                    color
                });
            });
        }
    };
}

async function createImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.crossOrigin = "anonymous";
        img.src = src;
    });
}

function createPictureLoader(imgCanvas) {
    console.log(imgCanvas)
    return async (id) => {
        const strongDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
        });

        const picture = await getPicture(id);
        $("#artwork_label").text(picture.artwork_name + " - " + picture.author_name);
        const img = await createImage(`${Config.SERVER_URL}${picture.path}`);
        const imagePoses = await strongDetector.estimatePoses(img);
        const imageKPs = normalizeKPs(imagePoses, img.width, img.height);
        const imageKPNames = imageKPs.map((kp) => kp.name);
        imgCanvas.drawImage(img);

        if (img.width > img.height) {
            const aspRatio = img.width / img.height;
            $("#imgCanvas").first().css("transform", "scale(1," + 1 / aspRatio + ")");
        } else {
            const aspRatio = img.height / img.width;
            $("#imgCanvas").first().css("transform", "scale(" + 1 / aspRatio + ",1)");
        }

        if (Config.DEBUG) {
            imgCanvas.drawSkeleton({ keypoints: imageKPs });
        }
        const distanceFromImg = createPoseDistanceFrom(imageKPs);

        return {
            imageKPNames,
            distanceFromImg
        };
    };
}

// Timer
function timeToString(time) {
    let diffInHrs = time / 3600000;
    let hh = Math.floor(diffInHrs);

    let diffInMin = (diffInHrs - hh) * 60;
    let mm = Math.floor(diffInMin);

    let diffInSec = (diffInMin - mm) * 60;
    let ss = Math.floor(diffInSec);

    let diffInMs = (diffInSec - ss) * 100;
    let ms = Math.floor(diffInMs);

    let formattedMM = mm.toString().padStart(2, "0");
    let formattedSS = ss.toString().padStart(2, "0");
    let formattedMS = ms.toString().padStart(2, "0");

    return `${formattedMM}:${formattedSS}:${formattedMS}`;
}

function stringTimeToSeconds(time) {
    let fields = time.split(":");
    return parseFloat(fields[0] * 60) + parseFloat(fields[1]) + parseFloat(fields[2] / 100);
}

function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(function printTime() {
        elapsedTime = Date.now() - startTime;
        document.getElementById("timer").innerHTML = timeToString(elapsedTime);
    }, 10);
}

function resetTimer() {
    elapsedTime = 0;
    stopTimer();
}

function stopTimer() {
    clearInterval(timerInterval);
}

function queueGenerator(size) {
    let queue = [];
    return {
        queue,
        enqueue: (item) => {
            if (queue.length === size) {
                queue.splice(0, 1);
            }
            queue.push(item);
        },
        dequeue: () => {
            queue.splice(0, 1);
        },
        clear: () => {
            queue = [];
        },
        isFull: () => queue.length === size
    };
}

const updateScoreAndCanvas = (computedDistancePercentage, camCanvas, video, filteredVideoKPs) => {
    const $score = $("#score");
    $score.width(`${computedDistancePercentage}%`);
    $score.text(`${computedDistancePercentage}%`);
    camCanvas.drawImage(video);

    if (video.width > video.height) {
        const aspRatio = video.width / video.height;
        $("#camCanvas").first().css("transform", "scale(1," + 1 / aspRatio + ")");
    } else {
        const aspRatio = video.height / video.width;
        $("#camCanvas").first().css("transform", "scale(" + 1 / aspRatio + ",1)");
    }

    if (Config.DEBUG) {
        camCanvas.drawSkeleton({ keypoints: filteredVideoKPs });
    }
};

const initGame = async (levelId, poses, video, camCanvas, imgCanvas) => {
    const level = await getLevel(levelId);
    const level_picture_ids = await picture_ids_for_level(level);
    console.log(level.name, level.id, level_picture_ids, poses, levelId)
    let round = 0;
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
    const pictureLoad = await createPictureLoader(imgCanvas);

    let userVideoList = [];
    let idRandom = level_picture_ids.sort(() => Math.random() - 0.5);

    const nPictures = Math.min(idRandom.length, parseInt(poses));//Config.MAX_PICTURES_SOLO

    const nextRound = async () => {
        const id = idRandom[round];
        const userId = localStorage.getItem("userId");
        const { imageKPNames, distanceFromImg } = await pictureLoad(id);

        const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);

        const gameLoop = setInterval(async () => {
            $("#game-loading").remove();
            $("#main").show();
            const videoPoses = await detector.estimatePoses(video);
            const videoKPs = normalizeKPs(videoPoses, video.width, video.height);
            const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));

            const computedDistance = distanceFromImg(filteredVideoKPs);
            // console.log("1 - computedDistance:", computedDistance, "/ Config.MATCH_LEVEL:", Config.MATCH_LEVEL, "* 100=",Math.min(99, ((1 - computedDistance) / Config.MATCH_LEVEL) * 100).toFixed(0));
            const computedDistancePercentage = Math.min(100, ((1 - computedDistance) / Config.MATCH_LEVEL) * 100).toFixed(0);
            // console.log("computedDistancePercentage", computedDistancePercentage);
            updateScoreAndCanvas(computedDistancePercentage, camCanvas, video, filteredVideoKPs);
            // console.log(1 - computedDistance, ">", Config.MATCH_LEVEL)
            // console.log(1.1 - computedDistance, ">", Config.MATCH_LEVEL)
            if (imgQueue.isFull() && 1.1 - computedDistance > Config.MATCH_LEVEL) {
                clearInterval(gameLoop);
                console.log("MATCH!");
                round++;

                userVideoList.push({ id, frameList: imgQueue.queue });
                imgQueue.clear();
                if (round < nPictures) {
                    await nextRound();
                } else {
                    // Prepare data for video production
                    const formData = new FormData();
                    idRandom.forEach((pictureId) => {
                        formData.append("picture_ids[]", pictureId);
                    });
                    userVideoList.forEach(({ id, frameList }) => {
                        frameList.forEach((frame, j) => {
                            formData.append(`frames_${id}[]`, frame, `frame_${id}_${j}.jpg`);
                        });
                    });
                    formData.append("user_id", userId);
                    // create the message box element
                    const messageBox = createMessageBox()
                    try {
                        const video = await postVideo(formData);
                        // remove the message box from the page after the video is posted
                        messageBox.remove();
                        location.href = `/end?id=${video.id}&player=solo&poses=${poses}&paintings_ids=${idRandom}`;
                    } catch (e) {
                        console.error(e);
                        // remove the message box from the page after the video is posted
                        messageBox.remove();
                        location.href = `/end?player=solo`;
                    }
                }
            }
            // Encode the current frame and enqueue it in the image queue
            const base64image = camCanvas.canvas.toDataURL("image/jpeg", 0.2);
            const response = await fetch(base64image);
            const imageBlob = await response.blob();
            imgQueue.enqueue(imageBlob);
        }, 1000 / Config.FRAME_RATE);

        return gameLoop;
    };

    return nextRound();
};

const initGame2 = async (socket, roomId, paintings_ids, poses, nRound, video, camCanvas, imgCanvas, user_id, player) => {
    console.log("initGame2", roomId, paintings_ids, poses, nRound, video, camCanvas, imgCanvas, user_id, player)
    let first = true;
    // player === 1 ? first = true : first = false;

    let round = 0;
    let pose = 0;
    let userVideoList = [];
    let roundResults = {time: 0, pose: 0};
    let gameResults = [];

    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
    const pictureLoad = await createPictureLoader(imgCanvas);
    alert("Round " + (round + 1) + " begins!");
    console.log(round)

    const nextPose = async () => {
        const id = paintings_ids[pose];

        const { imageKPNames, distanceFromImg } = await pictureLoad(id);

        const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);

        const gameLoop = setInterval(async () => {
            $("#game-loading").remove();
            $("#main").show();

            let next = false;
            const videoPoses = await detector.estimatePoses(video);
            const videoKPs = normalizeKPs(videoPoses, video.width, video.height);
            const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));

            const computedDistance = distanceFromImg(filteredVideoKPs);
            const computedDistancePercentage = Math.min(100, ((1 - computedDistance) / Config.MATCH_LEVEL) * 100).toFixed(0);
            updateScoreAndCanvas(computedDistancePercentage, camCanvas, video, filteredVideoKPs);

            if (first) {
                resetTimer();
                startTimer();
                first = false;
            }
            if (imgQueue.isFull() && 1 - computedDistance > Config.MATCH_LEVEL) {
                roundResults.pose++;
                roundResults.time += stringTimeToSeconds(document.getElementById("timer").innerHTML);
                next = true;
            }
            if (Config.TIME_LIMIT <= document.getElementById("timer").innerHTML) {
                next = true;
                roundResults.time += stringTimeToSeconds(Config.TIME_LIMIT);
            }
            if (next) {
                resetTimer();
                clearInterval(gameLoop);
                pose++;
                userVideoList.push({ id, frameList: imgQueue.queue });
                imgQueue.clear();
                if (pose < poses) {
                    await nextPose();
                } else if (round >= nRound - 1) {
                    gameResults.push(roundResults);

                    const formData = new FormData();

                    paintings_ids.forEach((pictureId) => {
                        console.log('pictureId:',pictureId)
                        formData.append("picture_ids[]", pictureId);
                    });
                    userVideoList.forEach(({ id, frameList }) => {
                        frameList.forEach((frame, j) => {
                            formData.append(`frames_${id}[]`, frame, `frame_${id}_${j}.jpg`);
                        });
                    });
                    formData.append("user_id", user_id);
                    // create the message box element
                    const messageBox = createMessageBox()

                    try {
                        const video = await postVideo(formData);
                        socket.emit("sendResults", roomId, gameResults);

                        socket.on("results_received", async (player) => {
                            // remove the message box from the page after the video is posted
                            messageBox.remove();
                            console.log("Results received", roomId, player, player["player"], paintings_ids);
                            localStorage.setItem("retired", "false");

                            location.href = `/end?id=${video.id}&player=${player["player"]}&user_id=${user_id}&roomId=${roomId}&paintings_ids=${paintings_ids}&poses=${poses}`;

                        });
                    } catch (e) {
                        // remove the message box from the page after the video is posted
                        messageBox.remove();
                        console.error(e);
                        localStorage.setItem("retired", "false");
                        location.href = `/end?id=${video.id}&player=P1&user_id=${user_id}`;
                    }
                } else {
                    round++;
                    pose = 0;
                    gameResults.push(roundResults);
                    roundResults = { time: 0, pose: 0 };
                    alert("Round " + (round + 1) + " begins!"); //DA TOGLIERE?
                    await nextPose();
                }
            }
            const base64image = camCanvas.canvas.toDataURL("image/jpeg", 0.2);
            const response = await fetch(base64image);
            const imageBlob = await response.blob();
            imgQueue.enqueue(imageBlob);
        }, 1000 / Config.FRAME_RATE);
        first = true;
        startTimer();
        return gameLoop;
    };

    return nextPose();
};
function createMessageBox() {
    // create the message box element
    const messageBox = document.createElement("div");
    messageBox.textContent = "Producing video..."; // set the message
    // add styling to the message box element with CSS
    messageBox.style.position = "fixed";
    messageBox.style.top = "50%";
    messageBox.style.left = "50%";
    messageBox.style.transform = "translate(-50%, -50%)";
    messageBox.style.backgroundColor = "white";
    messageBox.style.padding = "10px";
    messageBox.style.border = "1px solid black";
    // add the message box to the page
    document.body.appendChild(messageBox);
    return messageBox;
}
export {
    initGame,
    initGame2,
    createPoseCanvas,
    stringTimeToSeconds,
      picture_ids_for_level
};