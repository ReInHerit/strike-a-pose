import { setRoomAttr, getRoom, getLevel } from "./scripts/fetchUtils.js";
import { Config } from "./scripts/config.js";
import { picture_ids_for_level } from "./scripts/utils.js";

const serverUrl = Config.SERVER_URL;
// const serverUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
console.log("serverUrl:", serverUrl);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());
    if (isSafari) {
        alert("Kindly utilize an alternative browser for accessing the game. Safari is not compatible. Recommended browsers include Chrome, Firefox, and Edge.");
    } else {
        console.log("Not Safari")
    }
const addRoomBtn = $("#add-room-btn");
// const joinRoomBtn = $("#join-room-btn");
// const join_room_input = $("#roomid_textInput");
// let serverRoomsData = [];
const uniqueId = $("#user-random-id").text();
// let isStartingGame = false;
localStorage.setItem('privacyAccepted', 'false')
let gameData = {};

let roomsData = [];
let level;
let poses;

$(document).ready(async function() {

    addRoomBtn.on("click", function() {
        const row = $(this).closest("tr");
        poses = row.find("#nPose_setted").val();
        level = row.find("#level_setted").val();
        createRoom(poses, level);
    });

    // Function to show the privacy policy popup
    function showPrivacyPopup() {
        $("#privacyPopup").fadeIn();
        $("#overlay").fadeIn();
    }

    // Event listener for the confirm button in the privacy policy popup
    $("#confirmButton").on("click", function () {
        // Check if the checkbox is checked
        if ($("#acceptCheckbox").prop("checked")) {
            // User has accepted the privacy policy, store the acceptance in localStorage
            localStorage.setItem('privacyAccepted', 'true');
            $("#privacyPopup").fadeOut();
            $("#overlay").fadeOut();
        } else {
            // Alert the user to check the box
            alert("Please check the privacy policy acceptance box before confirming.");
        }
    });

    // Check if the user has already accepted the privacy policy
    if (!localStorage.getItem('privacyAccepted')) {
        showPrivacyPopup();
    }


    async function createRoom(poses, level) {
        try {
            const formData = new FormData();
            formData.append("userId", uniqueId);
            formData.append("n_pose", poses);
            formData.append("level", level);

            const response = await fetch(`${Config.SERVER_URL}create_room`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                console.error("Response not OK:", response);
                return;
            }

            const json = await response.json();
            // console.log(json.id)
            const levelObj = await getLevel(level);
            const level_picture_ids = await picture_ids_for_level(levelObj);
            const idRandom = level_picture_ids.sort(() => Math.random() - 0.5);
            json.picture_ids = idRandom;

            addRoomToData(json);
            window.location = `/game?mode=solo&id=${level}&nPose=${poses}&playerId=${uniqueId}`;
            // await updateRoomsList()
            console.log(json);

        } catch (error) {
            console.error("Error:", error);
        }
    }

    function addRoomToData(newRoom) {
        roomsData.push({
            id: roomsData.length + 1,
            room_id: newRoom.id,
            num_clients: newRoom.num_clients,
            n_pose: newRoom.n_pose,
            n_round: newRoom.n_round,
            level: newRoom.level,
            picture_ids: newRoom.picture_ids,
            free_space: newRoom.free,
            creator: newRoom.creator,
            clients: newRoom.clients,
            players_mode: newRoom.players_mode
        });
        console.log("roomsData:", roomsData);
    }

    window.logout = async function() {
        window.location = `/logout?user_id=${uniqueId}`;

    };

    window.onbeforeunload = null
});



