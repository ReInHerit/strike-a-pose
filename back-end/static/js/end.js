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

    endImg.src = "/static/assets/end/winner.gif";
    endText.innerHTML = "Congratulations, you win!";
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
            const video_path = video.path.startsWith("back-end/") ? video.path.replace("back-end/", "") : video.path;

            const videoBlob = await fetch(`${Config.SERVER_URL}${video_path}`).then((response) => response.blob());
            console.log(videoBlob.size)
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


    function hideVideoElements() {
        document.getElementById("end-text").style.display = "none";
        document.getElementById("video_download").style.display = "none";
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
    async function deleteRoom() {
        try {
            const response = await fetch(`${Config.SERVER_URL}/delete/room/${roomId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                console.log("Room deleted successfully.");
            } else {
                console.error("Error deleting the room.");
            }
        } catch (error) {
            console.error("An error occurred while deleting the room:", error);
        }
    }
    window.logout = async function() {
        // socket.emit("player_leave", roomId, user_id)
        window.location = `/logout?user_id=${user_id}`;

    };
    window.onbeforeunload = async function() {
        console.log("beforeunload", videoDeleted)
        if (!videoDeleted) {
            console.log("deleting video")
            await deleteVideo();
            videoDeleted = true; // Set a flag to avoid deleting multiple times
        }
        await deleteRoom();
    };
});
