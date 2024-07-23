import { Config } from "./config.js";
import { getLevel, getPicture, getAllPictures, postVideo } from "./fetchUtils.js";

let startTime;
let elapsedTime = 0;
let timerInterval;
let loading_text;

async function picture_ids_for_level(level) {
    const pictures_data = await getAllPictures();
    const picture_list = pictures_data.picturesList;
    // console.log(categories)
    const level_pictures_ids = picture_list
        .filter((picture) => no_upper_no_spaces(picture.category) === no_upper_no_spaces(level.name))
        .map((picture) => picture.id);
    console.log(level_pictures_ids)
    return level_pictures_ids;
}
function no_upper_no_spaces(string) {
    return string.replace(/\s+/g, '').toLowerCase();
}
function normalizeKPs(poses, width, height) {
    return (poses?.[0]?.keypoints || [])
          .filter((kp) => kp.score > 0.2)
          .map(({ x, y, score, name }) => ({
              x: x / width,
              y: y / height,
              score,
              name
          }));
}

function createPoseCanvas(canvas) {
    canvas.width = Config.WIDTH;
    canvas.height = Config.HEIGHT;
    const ctx = canvas.getContext("2d");
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
    function drawPoint({ x, y, r, color = "white" }) {
        ctx.beginPath();
        ctx.arc(x * canvas.width, y * canvas.width, r, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawSegment({ pointA, pointB, color = "white" }) {
        if (pointA && pointB) {
            // const lineWidth = 10; // Width of the white stroke
            const colorLineWidth = 6; // Width of the colored stroke
            // Draw the colored stroke
            ctx.beginPath();
            ctx.moveTo(pointA.x * canvas.width, pointA.y * canvas.width);
            ctx.lineTo(pointB.x * canvas.width, pointB.y * canvas.width);
            ctx.lineWidth = colorLineWidth;
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

        drawSkeleton: function({ keypoints, color =  "rgba(255, 255, 255, 0.5)" }) {
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
        },
        calculateAngles: function(used_names, normalized_keypoints) {
            const angles_array = [];
            const headKeyPoints = [
                ["nose", "left_eye"],
                ["nose", "right_eye"],
                ["left_eye", "right_eye"],
                ["left_ear", "left_eye"],
                ["right_eye", "right_ear"]
            ];
            const upperBodyKeyPoints = [
                ["left_shoulder", "left_elbow"],
                ["right_shoulder", "right_elbow"],
                ["left_wrist", "left_elbow"],
                ["right_wrist", "right_elbow"],
                ["right_shoulder", "left_shoulder"],
                ["left_shoulder", "left_hip"],
                ["right_shoulder", "right_hip"]
            ];
            const bottomBodyKeyPoints = [
                ["left_hip", "left_knee"],
                ["right_hip", "right_knee"],
                ["left_hip", "right_hip"],
                ["left_knee", "left_foot"],
                ["right_knee", "right_foot"]
            ];

            const calculateOrientationAngle = (kp1, kp2) => {
                const deltaY = kp2.y - kp1.y;
                const deltaX = kp2.x - kp1.x;
                let angleRad = Math.atan2(deltaY, deltaX);
                let angleDeg = (angleRad * 180) / Math.PI;
                angleDeg = Math.round((angleDeg + 360) % 360);
                return angleDeg;
            };

            const getKeyPoints = (groupKeyPoints) => {
                const keyPoints = [];
                groupKeyPoints.forEach(([kp1, kp2]) => {
                    if (used_names.includes(kp1) && used_names.includes(kp2)) {
                        const index1 = used_names.indexOf(kp1);
                        const index2 = used_names.indexOf(kp2);
                        keyPoints.push([normalized_keypoints[index1], normalized_keypoints[index2]]);
                    }
                });
                return keyPoints;
            };

            const headKeyPointsFiltered = getKeyPoints(headKeyPoints);
            const upperBodyKeyPointsFiltered = getKeyPoints(upperBodyKeyPoints);
            const bottomBodyKeyPointsFiltered = getKeyPoints(bottomBodyKeyPoints);

            const calculateAngleFromKeyPoints = (keyPoints) => {
                if (keyPoints) {
                    const angles = [];
                    keyPoints.forEach(([kp1, kp2]) => {
                        const angleValue = calculateOrientationAngle(kp1, kp2);
                        angles.push({ angle: angleValue, keypoints_names: kp1.name +' - ' +kp2.name });
                    });
                    return angles;
                }
            };

            angles_array.push(...calculateAngleFromKeyPoints(headKeyPointsFiltered));
            angles_array.push(...calculateAngleFromKeyPoints(upperBodyKeyPointsFiltered));
            angles_array.push(...calculateAngleFromKeyPoints(bottomBodyKeyPointsFiltered));

            return angles_array;
        }
    };
}

async function createImage(src) {
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        await img.decode();
        return img;
    } catch (error) {
        console.error("Error loading image:", error);
        throw error;
    }
}

function createPictureLoader(detector, imgCanvas) {
    return async (id) => {
        const picture_detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        });
        const picture = await getPicture(id);
        $("#artwork_label").text(picture.artwork_name + " - " + picture.author_name);
        const img = await createImage(`${Config.SERVER_URL}${picture.path}`);
        const imagePoses = await picture_detector.estimatePoses(img);
        const imageKPs = normalizeKPs(imagePoses, img.width, img.height);
        console.log(imageKPs)
        const imageKPNames = imageKPs.map((kp) => kp.name);
        console.log(imageKPNames)

        const image_angles= imgCanvas.calculateAngles(imageKPNames, imageKPs) //flippedKPs_reverted);

        imgCanvas.drawImage(img);
        adjustCanvasAspectRatio(imgCanvas.canvas, img);
        if (Config.DEBUG) {
            drawImageAndSkeleton(imgCanvas, img, imageKPs);
        }

        return {
            imageKPNames,
            image_angles
        };
        picture_detector.dispose();
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
    const window_dimensions = check_window_dimensions();
    const maxWidth = window_dimensions.width;
    const maxHeight = window_dimensions.height;
    const windowAspectRatio = maxWidth / maxHeight;
    const timer = $("#timer")
    const $score = $("#score");
    const $progress = $(".progress");
    const $score_container = $("#score_container");
    const scoreHeight = windowAspectRatio > 1 ? `${computedDistancePercentage}%` : "100%";
    const scoreWidth = windowAspectRatio > 1 ? "100%" : `${computedDistancePercentage}%`;
    const progressHeight = windowAspectRatio > 1 ? "100%" : "80%";
    const progressWidth = windowAspectRatio > 1 ? "80%" : "100%";
    const scoreContainerWidth = windowAspectRatio > 1 ? "6%" : "100%";
    const scoreContainerHeight = windowAspectRatio > 1 ? "100%" : "6%";

    $score.height(scoreHeight).width(scoreWidth);
    $progress.css({ "height": progressHeight, "width": progressWidth, "margin": "auto" });
    $score_container.css({ "height": scoreContainerHeight, "width": scoreContainerWidth });

    $score.text(`${computedDistancePercentage}%`);
    camCanvas.drawImage(video);
    console.log(Config.DEBUG)
    adjustCanvasAspectRatio(camCanvas.canvas, video);
    if (Config.DEBUG) {
        drawImageAndSkeleton(camCanvas, video, filteredVideoKPs);
    }
};
function adjustCanvasAspectRatio(canvas, source) {
    const window_dimensions = check_window_dimensions();
    const maxWidth = window_dimensions.width;
    const maxHeight = window_dimensions.height;
    const windowAspectRatio = maxWidth / maxHeight;
    const $main = $("#main");
    const $canvas = $(canvas);
    const $container = $('.canvas-container')
    let source_width, source_height;
    if (source.width > 0 && source.height > 0){
        source_width = source.width;
        source_height = source.height;
    } else {
        source_width = source.videoWidth;
        source_height = source.videoHeight;
    }

    const aspectRatio = source_width / source_height;
    console.log(maxWidth, maxHeight, aspectRatio, windowAspectRatio, $main, $canvas, $container, source_width, source_height)
    let width, height;
    if (windowAspectRatio > 1) {
        $main.css({ "flex-direction": "row", "align-items": "center", "width": "100%", "height": "80%" });
        $container.css({ "width": "47%", "height": "100%" });
        width = $main.width() * 0.47;
        height = $main.height();
    } else {
        $main.css({ "flex-direction": "column", "width": "95%", "height": "95%" });
        $container.css({ "width": "100%", "height": "47%" });
        width = $main.width();
        height = $main.height() * 0.47;
    }
    adjustCanvasDimensions($canvas, aspectRatio, width, height);
}
function adjustCanvasDimensions($canvas, aspectRatio, width, height) {
    if (aspectRatio > 1) {
        const newWidth = width;
        const newHeight = newWidth / aspectRatio;
        $canvas.css({ "width": newWidth, "height": newHeight });
    } else {
        const newHeight = height;
        const newWidth = newHeight * aspectRatio;
        $canvas.css({ "width": newWidth, "height": newHeight });
    }
}
function drawImageAndSkeleton(canvas, source, keypoints) {
    const $canvas = $(canvas);
    canvas.drawImage(source);
    if (Config.DEBUG) {
        canvas.drawSkeleton({ keypoints });
    }
}
const initGame_solo = async (levelId, poses, video, camCanvas, imgCanvas, user_id) => {
    console.log('0')
    const detector = window.detector
    loading_text = document.querySelector('#game-loading .text-in');
    loading_text.textContent = 'Initializing';
    console.log('utils', detector)
    const level = await getLevel(levelId);
    const level_picture_ids = await picture_ids_for_level(level);
    let round = 0;
    let userVideoList = [];
    console.log('1')

    console.log('2')
    const pictureLoad = await createPictureLoader(detector, imgCanvas);
    loading_text.textContent = 'Game starts!';
    let idRandom = level_picture_ids.sort(() => Math.random() - 0.5);

    const nPictures = Math.min(idRandom.length, parseInt(poses));
    const selectedPictures = idRandom.slice(0, nPictures);
    const userId = user_id;
    const nextRound = async () => {
        const id = selectedPictures[round];
        const { imageKPNames, image_angles } = await pictureLoad(id);
        const imgQueue = queueGenerator(Config.VIDEO_SECONDS * Config.FRAME_RATE);
        $("#main").show();
        $("#game-loading").remove();
        const gameLoop = setInterval(async () => {

            const computedDistance = await compute_match(detector, video, imageKPNames, image_angles, camCanvas)

            if (imgQueue.isFull() && computedDistance >= Config.MATCH_LEVEL) {
                clearInterval(gameLoop);
                round++;
                console.log("MATCH!");
                userVideoList.push({ id, frameList: imgQueue.queue });
                imgQueue.clear();
                if (round < nPictures) {
                    await nextRound();
                } else {
                    // Prepare data for video production
                    const formData = new FormData();
                    selectedPictures.forEach((pictureId) => {
                        console.log('picture_id', pictureId)
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

async function compute_match(detector, video, imageKPNames, image_angles, camCanvas) {
    console.log('before estimate poses')
    console.log(video)
    // const ghost_canvas = document.createElement('canvas');
    // ghost_canvas.width = video.videoWidth;
    // ghost_canvas.height = video.videoHeight;
    // const ghost_ctx = ghost_canvas.getContext('2d');
    // ghost_ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    // ghost_ctx.translate(video.videoWidth, 0);
    // ghost_ctx.scale(-1, 1);

    // const videoPoses = await detector.estimatePoses(ghost_canvas, {flipHorizontal: true});
    const videoPoses = await detector.estimatePoses(video);
    console.log('after estimate poses')
    const videoKPs = normalizeKPs(videoPoses, video.videoWidth, video.videoHeight);
    const videoKpsNames = videoKPs.map((kp) => kp.name);
    const filteredVideoKPs = videoKPs.filter((kp) => imageKPNames.includes(kp.name));
    const cam_angles = camCanvas.calculateAngles(videoKpsNames, videoKPs);
    const distance = calculateDistance(image_angles, cam_angles);
    updateScoreAndCanvas(Math.round(distance), camCanvas, video, filteredVideoKPs);
    return distance;
}
function calculateDistance(image_angles, cam_angles) {
    let totalDistance = 0;
    const maxPossibleDistance = 180 * image_angles.length;
    // Iterate over each angle object in image_angles
    image_angles.forEach((imageAngleObj) => {
        const matchingCamAngleObj = cam_angles.find((camAngleObj) =>{
            const [camKp1, camKp2] = camAngleObj.keypoints_names.split(' - ');
            const [imgKp1, imgKp2] = imageAngleObj.keypoints_names.split(' - ');
            // Check if keypoints are matched in both orders
            return (
                (camKp1 === imgKp1 && camKp2 === imgKp2) ||
                (camKp1 === imgKp2 && camKp2 === imgKp1)
            );
        });
        // Check if a matching angle object was found in cam_angles
        if (matchingCamAngleObj) {
            const minor = Math.min(imageAngleObj.angle, matchingCamAngleObj.angle);
            const major = Math.max(imageAngleObj.angle, matchingCamAngleObj.angle);
            const absoluteAngleDifference = Math.min(major - minor, 360 + minor-major)
            totalDistance += absoluteAngleDifference;
        } else {
            totalDistance += 180;
        }
    });
    // console.log(totalDistance)
    const distance_percentage = 100 - (totalDistance / maxPossibleDistance) * 100;
    return distance_percentage;
}

function check_window_dimensions() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    return {
        width: windowWidth,
        height: windowHeight
    };
}

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
    initGame_solo,
    createPoseCanvas,
    stringTimeToSeconds,
      picture_ids_for_level
};