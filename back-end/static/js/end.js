import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";
import { stringTimeToSeconds } from "./scripts/utils.js";

const serverUrl = Config.SERVER_URL // `${window.location.protocol}//${window.location.hostname}`;
const socket = io.connect(serverUrl);
let roomId;
let user_id;
let paintings_ids;
let poses;
let videoDeleted = false;

$(async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const player = queryParams.get("player");
    user_id = queryParams.get("user_id");
    roomId = queryParams.get("roomId");
    paintings_ids = queryParams.has("paintings_ids") ? queryParams.get("paintings_ids").split(',').map(Number) : [];
    poses = queryParams.has("poses") ? parseInt(queryParams.get("poses"), 10) : 0;
    console.log(paintings_ids, poses)
    const endImg = document.getElementById("victoryImg");
    const endText = document.getElementById("final_title");
    socket.on("connect", () => {
        console.log("Connected to server");
    });
    socket.on("disconnect", () => {
        console.log("Disconnected from server");
    });
    socket.emit("join_room", roomId)

    if (player.normalize() === "solo".normalize()) {
        endImg.src = "/static/assets/end/winner.gif";
        endText.innerHTML = "Congratulations, you win!";
    } else if (player.normalize() === "winner".normalize()) {
        handleWinnerWithdrawn();
    } else {
        console.log("handleOpponentWithdrawn", paintings_ids)
        await handleOpponentWithdrawn();
    }
    const videoId = queryParams.get("id");
    if (videoId.normalize() === "No") {
        hideVideoElements();
        return;
    }

    const video = await getVideo(videoId);
    // Add an event listener for the form submission
    $("#email_form").submit(async (event) => {
        event.preventDefault();

        const userEmail = $("#user_email").val();
        // Check if the email is valid (you can add more robust email validation)
        if (!isValidEmail(userEmail)) {
            alert("Please enter a valid email address.");
            return;
        }

        // Fetch the video and send it as an attachment
        try {
            const videoBlob = await fetch(`${Config.SERVER_URL}${video.path}`).then((response) => response.blob());

            // Send the video as an attachment
            const formData = new FormData();
            formData.append("email", userEmail);
            formData.append("video", videoBlob);
            formData.append(("poses"), poses);
            formData.append(("paintings_ids"), paintings_ids);
            fetch("/send-video", {
            method: "POST",
            body: formData,
        })
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error("Error sending the video.");
            }
        })
        .then((data) => {
            alert("Video sent successfully!");
            // delete the video
        })
        .catch((error) => {
            alert(error.message);
            console.error(error);
        });
        } catch (error) {
            console.error(error);
        }
    });

    $("#show_scores_button").on("click", () => {
        $("#tableG1").show();
        $("#tableG2").show();
    });

    function isValidEmail(email) {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        // Test the email against the pattern
        return emailPattern.test(email);
    }

    function handleWinnerWithdrawn() {
        endImg.src = "/static/assets/end/winner.gif";
        endText.innerHTML = "Your opponent withdrew, you win!";
        socket.emit("end", roomId);
        listenForEndGame();
    }

    async function handleOpponentWithdrawn() {
        endImg.src = "/static/assets/end/loadWinner.gif";
        endText.innerHTML = "Waiting for the opponent...";

        console.log(roomId, user_id, player)
        if (player === "1") {
            socket.emit("start_game_player2", roomId, paintings_ids);
        } else if (player === "2") {
            console.log("acquireResults")
            socket.emit("acquireResults", roomId);
            listenForResults();
            listenForEndGame();
        }
        listenForUserRetired();
    }

    function hideVideoElements() {
        document.getElementById("end-text").style.display = "none";
        document.getElementById("video_download").style.display = "none";
    }

    function listenForRoomMessage() {
        socket.on("room_message", (msg) => {
            console.log("message from room: " + msg);
        });
    }

    function listenForUserRetired() {
        socket.on("user_retired", () => {
            handleWinnerWithdrawn();
        });
    }

    function listenForResults() {
        socket.on("getResults", (msg) => {
            console.log("getResults", msg, player)
            const player1_results = msg[0];
            const player2_results = msg[1];
            console.log(player1_results, player2_results)
            displayResults(player1_results, player2_results);
            const winner = determineWinner(player1_results, player2_results);
            console.log("winner: " + winner);
            let p1Text, p2Text, p1ImgSrc, p2ImgSrc;

            if (winner.normalize() === "TIE".normalize()) {
                p1Text = p2Text = "Tie!";
                p1ImgSrc = p2ImgSrc = "/static/assets/end/tie.png";
            } else if (winner.normalize() === "P2".normalize()) {
                p2Text = "Congratulations, you win!";
                p2ImgSrc = "/static/assets/end/winner.gif";
                p1Text = "You lose!";
                p1ImgSrc = "static/assets/end/loser.gif";
            } else {
                p1Text = "Congratulations, you win!";
                p1ImgSrc = "/static/assets/end/winner.gif";
                p2Text = "You lose!";
                p2ImgSrc = "static/assets/end/loser.gif";
            }
            endText.innerHTML = p2Text;
            endImg.src = p2ImgSrc;
            console.log("sendWinnerToP1", roomId, p1Text, p1ImgSrc)
            socket.emit("sendWinnerToP1", {"roomId": roomId, "p1_text": p1Text, "p1_ImgSrc": p1ImgSrc})

            handleGameEnd(winner);
        });
    }

    socket.on("receiveWinnerFromP2", data =>{
        console.log("receiveWinnerFromP2", data)
            if (player === "1"){endText.innerHTML = data["p1_text"];
            endImg.src = data["p1_ImgSrc"];}
        })

    socket.on("receiveDataFromP2", data => {
        console.log("receiveDataFromP2", data)
        if (player === "1") {
            const p1_results = data["p1_results"];
            const p2_results = data["p2_results"];
            const i = data["i"];
            document.getElementById("show_scores_button").style.display = "block";
            $("#tableG1").append(`<tr><td>${i + 1}</td><td>${p1_results[i].pose}</td><td>${p1_results[i].time}s</td></tr>`);
            $("#tableG2").append(`<tr><td>${i + 1}</td><td>${p2_results[i].pose}</td><td>${p2_results[i].time}s</td></tr>`);
        }
    })

    socket.on("player_left", (data) => {
        const playerId = data["player_id"];
        console.log("player_left", playerId)
        // Update the UI or game state to reflect the player's departure
    });

    function listenForEndGame() {
        socket.on("endGame", (msg) => {
            console.log(msg);
        });
    }


    function displayResults(p1_results, p2_results, winner) {
        let roundP1 = 0,
              roundP2 = 0,
              posePR1 = 0,
              posePR2 = 0,
              timeP1 = 0,
              timeP2 = 0;

        const nRound = p1_results.length;
        for (let i = 0; i < nRound; i++) {
            posePR1 += p1_results[i].pose;
            posePR2 += p2_results[i].pose;
            timeP1 += stringTimeToSeconds(Config.TIME_LIMIT) - p1_results[i].time;
            timeP2 += stringTimeToSeconds(Config.TIME_LIMIT) - p2_results[i].time;

            if (p1_results[i].pose > p2_results[i].pose) {
                roundP1++;
            } else if (p1_results[i].pose < p2_results[i].pose) {
                roundP2++;
            }
            document.getElementById("show_scores_button").style.display = "block";
            $("#tableG2").append(`<tr><td>${i + 1}</td><td>${p1_results[i].pose}</td><td>${p1_results[i].time}s</td></tr>`);
            $("#tableG1").append(`<tr><td>${i + 1}</td><td>${p2_results[i].pose}</td><td>${p2_results[i].time}s</td></tr>`);
            const data = {p1_results, p2_results, i, winner}
            socket.emit("sendDataToP1", roomId, data)
        }
    }

    function determineWinner(p1_results, p2_results) {
        const pointsPose = 5;
        const pointsRound = 10;
        const posePR1 = p1_results.reduce((total, result) => total + result.pose, 0);
        const posePR2 = p2_results.reduce((total, result) => total + result.pose, 0);
        const roundP1 = p1_results.reduce((total, result) => total + (result.pose > 0 ? 1 : 0), 0);
        const roundP2 = p2_results.reduce((total, result) => total + (result.pose > 0 ? 1 : 0), 0);
        const timeP1 = p1_results.reduce((total, result) => total + (stringTimeToSeconds(Config.TIME_LIMIT) - result.time), 0);
        const timeP2 = p2_results.reduce((total, result) => total + (stringTimeToSeconds(Config.TIME_LIMIT) - result.time), 0);

        const pointsP1 = pointsPose * posePR1 + pointsRound * roundP1 + timeP1;
        const pointsP2 = pointsPose * posePR2 + pointsRound * roundP2 + timeP2;

        if (pointsP1 > pointsP2) {
            return "P1";
        } else if (pointsP2 > pointsP1) {
            return "P2";
        } else {
            return "TIE";
        }
    }

    function handleGameEnd(winner) {
        let resultText, resultImgSrc;

        if (winner.normalize() === "TIE".normalize()) {
            resultText = "Tie!";
            resultImgSrc = "/static/assets/end/tie.png";
        } else if (winner.normalize() === "P2".normalize()) {
            resultText = "Congratulations, you win!";
            resultImgSrc = "/static/assets/end/winner.gif";
        } else {
            resultText = "You lose!";
            resultImgSrc = "static/assets/end/loser.gif";
        }

        endText.innerHTML = resultText;
        endImg.src = resultImgSrc;

        // Emit the "end" event with the winner data
        socket.emit("end", roomId, player, winner);
    }

    async function deleteVideo() {
        try {
            // Use an appropriate method to delete the video from the server
            // For example, you can make an API request to delete the video file
            const response = await fetch(`${Config.SERVER_URL}/delete-video`, {
                method: "DELETE",
                body: JSON.stringify({ videoId }), // You may need to pass the videoId
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                console.log("Video deleted successfully.");
            } else {
                console.error("Error deleting the video.");
            }
        } catch (error) {
            console.error("An error occurred while deleting the video:", error);
        }
    }
    window.logout = async function() {
        socket.emit("player_leave", roomId, user_id)
        window.location = `/logout?user_id=${user_id}`;

    };
    window.onbeforeunload = async function() {
        console.log("beforeunload", videoDeleted)
        if (!videoDeleted) {
            console.log("deleting video")
            deleteVideo();
            videoDeleted = true; // Set a flag to avoid deleting multiple times
        }
        socket.emit("player_leave", roomId, user_id)
            window.location = `/logout?user_id=${user_id}`;
    };
});
