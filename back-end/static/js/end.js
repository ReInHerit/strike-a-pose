import { Config } from "./scripts/config.js";
import { getVideo } from "./scripts/fetchUtils.js";
import { stringTimeToSeconds } from "./scripts/utils.js";

let socket = undefined;
let roomId;
let user_id
$(async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const player = queryParams.get("player");
    user_id = queryParams.get("user_id");
    const endImg = document.getElementById("victoryImg");
    const endText = document.getElementById("final_title");

    const serverUrl = Config.SERVER_URL // `${window.location.protocol}//${window.location.hostname}`;
    socket = io.connect(serverUrl);
    roomId = queryParams.get("roomId");

    if (player.normalize() === "solo".normalize()) {
        endImg.src = "/static/assets/end/winner.gif";
        endText.innerHTML = "Congratulations, you win!";
    } else if (player.normalize() === "winner".normalize()) {
        handleWinnerWithdrawn();
    } else {
        handleOpponentWithdrawn();
    }
    const videoId = queryParams.get("id");
    if (videoId.normalize() === "No") {
        hideVideoElements();
        return;
    }

    const video = await getVideo(videoId);
    // Add an event listener for the form submission
    $("#email_form").submit(async (event) => {
        event.preventDefault(); // Prevent the default form submission behavior

        // Get the user's email input
        const userEmail = $("#user_email").val();

        // Check if the email is valid (you can add more robust email validation)
        if (!isValidEmail(userEmail)) {
            alert("Please enter a valid email address.");
            return;
        }

        // Fetch the video and send it as an attachment
        try {
            const videoBlob = await fetch(`${Config.SERVER_URL}${video.path}`).then((response) => response.blob());
            console.log(videoBlob)
            // Send the video as an attachment using a server-side script
            const formData = new FormData();
            formData.append("email", userEmail);
            formData.append("video", videoBlob);
            fetch("/send-video", {
            method: "POST",
            body: formData,
        })
        .then((response) => {
            if (response.ok) {
                return response.text(); // or response.json() if the server sends JSON
            } else {
                throw new Error("Error sending the video.");
            }
        })
        .then((data) => {
            alert("Video sent successfully!");
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
    // Regular expression pattern for a valid email address
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

    function handleOpponentWithdrawn() {
        endImg.src = "/static/assets/end/loadWinner.gif";
        endText.innerHTML = "Waiting for the opponent...";
        console.log(roomId)
        socket.emit("start_game_player2", roomId);

        // socket.emit("join", roomId, null, user_id);
        socket.emit("acquireResults", roomId);
        listenForRoomMessage();
        listenForUserRetired();
        listenForResults();
        listenForEndGame();
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
            const { myResults, opponentResults } = processResults(player, msg);
            displayResults(myResults, opponentResults);
            const winner = determineWinner(myResults, opponentResults);
            handleGameEnd(winner);
        });
    }

    function listenForEndGame() {
        socket.on("endGame", (msg) => {
            console.log(msg);
        });
    }

    function processResults(player, msg) {
        let myResults, opponentResults;

        if (player.normalize() === "1".normalize()) {
            myResults = msg[0];
            opponentResults = msg[1];
        } else {
            myResults = msg[1];
            opponentResults = msg[0];
        }

        return { myResults, opponentResults };
    }

    function displayResults(myResults, opponentResults) {
        let roundP1 = 0,
              roundP2 = 0,
              posePR1 = 0,
              posePR2 = 0,
              timeP1 = 0,
              timeP2 = 0;

        const nRound = myResults.length;
        for (let i = 0; i < nRound; i++) {
            posePR1 += myResults[i].pose;
            posePR2 += opponentResults[i].pose;
            timeP1 += stringTimeToSeconds(Config.TIME_LIMIT) - myResults[i].time;
            timeP2 += stringTimeToSeconds(Config.TIME_LIMIT) - opponentResults[i].time;

            if (myResults[i].pose > opponentResults[i].pose) {
                roundP1++;
            } else if (myResults[i].pose < opponentResults[i].pose) {
                roundP2++;
            }

            document.getElementById("show_scores_button").style.display = "block";
            $("#tableG1").append(`<tr><td>${i + 1}</td><td>${myResults[i].pose}</td><td>${myResults[i].time}s</td></tr>`);
            $("#tableG2").append(`<tr><td>${i + 1}</td><td>${opponentResults[i].pose}</td><td>${opponentResults[i].time}s</td></tr>`);
        }
    }

    function determineWinner(posePR1, posePR2, roundP1, roundP2, timeP1, timeP2) {
        const pointsPose = 5;
        const pointsRound = 10;
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
        if (winner.normalize() === "TIE".normalize()) {
            endImg.src = "/static/assets/end/tie.png";
            endText.innerHTML = "Tie!";
        } else if (winner.normalize() === "P1".normalize()) {
            endImg.src = "/static/assets/end/winner.gif";
            endText.innerHTML = "Congratulations, you win!";
        } else {
            endImg.src = "static/assets/end/loser.gif";
            endText.innerHTML = "You lose!";
        }

        socket.emit("end", roomId);
    }
});
