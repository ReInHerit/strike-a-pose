import { setRoomAttr, getRoom, getLevel } from "./scripts/fetchUtils.js";
import { Config } from "./scripts/config.js";
import { picture_ids_for_level } from "./scripts/utils.js";

const serverUrl = Config.SERVER_URL;
// const serverUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
console.log("serverUrl:", serverUrl);
// const socket = io.connect(window.location.origin);
// const waitingScreen = $("#waiting-screen")[0];
// const players_input = $("#nPlayers_setted");
// const poses_input = $("#nPose_setted")[0];
// const rounds_input = $("#nRound_setted")[0];
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
        // let room_id;
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


    // function create_room_row(table, room_obj, row_id) {
    //     const newRow = table.insertRow();
    //     const isGrayedOut = !room_obj.free_space && !room_obj.clients.includes(uniqueId);
    //     let iconButton;
    //     // let clientsIcons = "";
    //     // if (room_obj.players_mode === "2") {
    //     //     if (room_obj.creator === uniqueId) {
    //     //         if (room_obj.num_clients === 1) {
    //     //             iconButton = createIconButton(`delete/room/${room_obj.room_id}`, "fa-solid fa-trash icon-color", deleteRoom, isGrayedOut);
    //     //             clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-regular fa-user"></i>`;
    //     //         } else if (room_obj.num_clients === 2) {
    //     //             iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play icon-color", play_versus, isGrayedOut);
    //     //             clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
    //     //         }
    //     //     } else if (room_obj.clients.includes(uniqueId)) {
    //     //         if (room_obj.num_clients === 2) {
    //     //             iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play icon-color", play_versus, isGrayedOut);
    //     //             clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
    //     //         }
    //     //     } else {
    //     //         if (room_obj.num_clients === 1) {
    //     //             iconButton = createIconButton(`join/room/${room_obj.room_id}`, "fa-solid fa-right-to-bracket icon-color", joinRoom, isGrayedOut);
    //     //             clientsIcons = `<i id="you" class="fa-regular fa-user"></i><i class="fa-solid fa-user"></i>`;
    //     //         } else if (room_obj.num_clients === 2) {
    //     //             iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-gamepad icon-color", play_versus, isGrayedOut);
    //     //             clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
    //     //         }
    //     //     }
    //     // } else if (room_obj.players_mode === "1") {
    //     //     clientsIcons = `<i id="you" class="fa-solid fa-user"></i>`;
    //     //     if (room_obj.creator === uniqueId) {
    //     //         iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play icon-color", play_solo, isGrayedOut);
    //     //     } else {
    //     //         iconButton = createIconButton("#", "fa-solid fa-gamepad icon-color", play_solo, isGrayedOut);
    //     //     }
    //     // }
    //     //
    //     // console.log(iconButton)
    //     iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play icon-color", play_solo, isGrayedOut);
    //     for (let i = 0; i < 5; i++) {
    //         newRow.insertCell(i);
    //     }
    //
    //     newRow.cells[0].innerHTML = `<b>${row_id}</b>`;
    //     newRow.cells[1].textContent = room_obj.room_id;
    //     // newRow.cells[2].innerHTML = clientsIcons;
    //     newRow.cells[2].textContent = room_obj.n_pose;
    //     // newRow.cells[4].textContent = (room_obj.players_mode === "2") ? room_obj.n_round: "-";;
    //     newRow.cells[3].textContent = room_obj.level;
    //     newRow.cells[4].appendChild(iconButton);
    //
    //     // if (isGrayedOut) {
    //     //     newRow.classList.add("grayed-out");
    //     //     newRow.cells[6].classList.add("unclickable");
    //     // }
    // }

    // function createIconButton(href, iconClass, clickHandler, isGrayedOut) {
    //     const button = document.createElement("a");
    //     button.innerHTML = `<i class="${iconClass}""></i>`;
    //
    //     button.href = href;
    //     // Check if the button should be neutralized (unclickable)
    //     if (isGrayedOut) {
    //         button.onclick = function(event) {
    //             event.preventDefault(); // Prevent the default click behavior
    //         };
    //     } else {
    //         button.onclick = function(event) {
    //             event.preventDefault();
    //             clickHandler(this);
    //         };
    //     }
    //     return button;
    // }


    window.logout = async function() {
        window.location = `/logout?user_id=${uniqueId}`;

    };
window.onload = function() {
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
        alert("Kindly utilize an alternative browser for accessing the game. Safari is not compatible. Recommended browsers include Chrome, Firefox, and Edge.");
    } else {
        console.log("Not Safari")
    }
};
window.onbeforeunload = null
});



