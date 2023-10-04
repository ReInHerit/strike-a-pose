import { setRoomAttr, getRoom } from "./scripts/fetchUtils.js";
import { Config } from "./scripts/config.js";

const serverUrl = Config.SERVER_URL;
const socket = io.connect(serverUrl);
const waitingScreen = $("#waiting-screen")[0];
const players_input = $("#nPlayers_setted");
const poses_input = $("#nPose_setted")[0];
const rounds_input = $("#nRound_setted")[0];
const addRoomBtn = $("#add-room-btn");
const joinRoomBtn = $("#join-room-btn");
const join_room_input = $("#roomid_textInput");
let serverRoomsData = [];
const uniqueId = $("#user-random-id").text();
console.log("uniqueId:", waitingScreen, $("#waiting-screen"));
let isStartingGame = false;
let gameData = {};
socket.on("connect", () => {
    console.log("Connected to server");
});
socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
});

// let nRound, nPose;
let roomsData = [];

$(document).ready(async function() {
    await initialize();

    async function initialize() {
        // Initial check when the page loads
        console.log("in initialize")
        console.log(serverRoomsData);
        await updateRoomsList();
    }
    players_input.on("change", function() {
        if (players_input.val() === "2") {
            rounds_input.classList.add('enabled');
            rounds_input.classList.remove("disabled");
            console.log("2 players");
        } else {
            rounds_input.classList.add('disabled');
            rounds_input.classList.remove("enabled");
            console.log("1 player");
        }
    });
    addRoomBtn.on("click", function() {
        // let room_id;
        const row = $(this).closest("tr");
        const playersMode = row.find("#nPlayers_setted").val();
        const poses = row.find("#nPose_setted").val();
        const rounds = row.find("#nRound_setted").val();
        const level = row.find("#nRound_setted").val();
        createRoom(poses, rounds, level, playersMode);
    });

    function displayPopup(message) {
            const popup = $("#popup");
            popup.text(message);
            popup.fadeIn();

            // Automatically hide the popup after 3 seconds
            setTimeout(() => {
                popup.fadeOut();
            }, 3000);
        }

    async function checkRoomValidity() {
        const row = $(this).closest("tr");
        const room_id = row.find("#roomid_textInput").val();
        const room_id_int = parseInt(room_id);
        await fetchRoomsData();
        let errorMessage = "";
        console.log("in checkRoomValidity", room_id_int, !isNaN(room_id_int))
        if (!isNaN(room_id_int)) {
            const matchingRoom = serverRoomsData.find(room =>
                room.room_id === room_id_int
            );
            console.log("find matching room", matchingRoom)
            if (matchingRoom) {
                if (matchingRoom.players_mode === "2" && matchingRoom.creator !== uniqueId) {
                    joinRoomBtn.removeClass("disabled");
                    joinRoomBtn.addClass("enabled");
                    errorMessage = "Click the join button to start the game."
                } else if (matchingRoom.players_mode !== "2") {
                    joinRoomBtn.removeClass("enabled");
                    joinRoomBtn.addClass("disabled");
                    errorMessage = "Invalid room ID. You cannot join a 'solo' room.";
                } else if (matchingRoom.creator === uniqueId) {
                    joinRoomBtn.removeClass("enabled");
                    joinRoomBtn.addClass("disabled");
                    errorMessage = "Invalid room ID. You cannot join your own room.";
                }
            } else {
                joinRoomBtn.removeClass("enabled");
                joinRoomBtn.addClass("disabled");
                errorMessage = "Invalid room ID. Please enter a valid room ID.";
            }
        } else {
            joinRoomBtn.removeClass("enabled");
            joinRoomBtn.addClass("disabled");
            errorMessage = "Invalid room ID. Please enter a valid room ID2.";
        }

        displayPopup(errorMessage);

    }

    // Event listener for the input change
    join_room_input.on("change", async function() {
        console.log("in change")
        await checkRoomValidity.call(this);
    });

    // Event listener for the join button click
    joinRoomBtn.on("click", function() {
        const row = $(this).closest("tr");
        const room_id = row.find("#roomid_textInput").val();
        const room_id_int = parseInt(room_id);

        if (!isNaN(room_id_int) && serverRoomsData.some(room => room.room_id === room_id_int)) {
            joinRoom(room_id);
        }
        else { console.log("Invalid room ID: " + room_id); }
    });


    async function fetchRoomsData() {
        await fetch(`${Config.SERVER_URL}rooms_data`)
              .then(handleResponse)
              .then(json => {
                  console.log(json);
                  serverRoomsData = json.rooms;
              })
              .catch(error => {
                  console.error("Fetch error:", error);
              });
    }

    async function createRoom(poses, rounds, level, playersMode) {
        try {
            const formData = new FormData();
            formData.append("userId", uniqueId);
            formData.append("n_round", rounds);
            formData.append("n_pose", poses);
            formData.append("level", level);
            formData.append("playersMode", playersMode);
            // const clientsArray = [uniqueId];

            const response = await fetch(`${Config.SERVER_URL}create_room`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                console.error("Response not OK:", response);
                return;
            }

            const json = await response.json();

            addRoomToData(json);
            await updateRoomsList()
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
            free_space: newRoom.free,
            creator: newRoom.creator,
            clients: newRoom.clients,
            players_mode: newRoom.players_mode
        });
    }

    async function updateRoomsList() {
        const table = document.querySelector("table tbody");

        // Clear all rows
        while (table.rows.length > 0) {
            table.deleteRow(0);
        }
        roomsData.forEach((room, index) => {
            create_room_row(table, room, index + 1);
        });
    }

    function create_room_row(table, room_obj, row_id) {
        const newRow = table.insertRow();
        const isGrayedOut = !room_obj.free_space && !room_obj.clients.includes(uniqueId);
        let iconButton;
        let clientsIcons = "";
        if (room_obj.players_mode === "2") {
            if (room_obj.creator === uniqueId) {
                if (room_obj.num_clients === 1) {
                    iconButton = createIconButton(`delete/room/${room_obj.room_id}`, "fa-solid fa-trash", "#FF5733", deleteRoom, isGrayedOut);
                    clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-regular fa-user"></i>`;
                } else if (room_obj.num_clients === 2) {
                    iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play", "#FF5733", play_versus, isGrayedOut);
                    clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
                }
            } else if (room_obj.clients.includes(uniqueId)) {
                if (room_obj.num_clients === 2) {
                    iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play", "#FF5733", play_versus, isGrayedOut);
                    clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
                }
            } else {
                if (room_obj.num_clients === 1) {
                    iconButton = createIconButton(`join/room/${room_obj.room_id}`, "fa-solid fa-right-to-bracket", "#FF5733", joinRoom, isGrayedOut);
                    clientsIcons = `<i id="you" class="fa-regular fa-user"></i><i class="fa-solid fa-user"></i>`;
                } else if (room_obj.num_clients === 2) {
                    iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-gamepad", "#FF5733", play_versus, isGrayedOut);
                    clientsIcons = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
                }
            }
        } else if (room_obj.players_mode === "1") {
            clientsIcons = `<i id="you" class="fa-solid fa-user"></i>`;
            if (room_obj.creator === uniqueId) {
                iconButton = createIconButton(`play/room/${room_obj.room_id}`, "fa-solid fa-play", "#FF5733", play_solo, isGrayedOut);
            } else {
                iconButton = createIconButton("#", "fa-solid fa-gamepad", "#FF5733", play_solo, isGrayedOut);
            }
        }

        for (let i = 0; i < 7; i++) {
            newRow.insertCell(i);
        }
        // console.log(iconButton)
        newRow.cells[0].innerHTML = `<b>${row_id}</b>`;
        newRow.cells[1].textContent = room_obj.room_id;
        newRow.cells[2].innerHTML = clientsIcons;
        newRow.cells[3].textContent = room_obj.n_pose;
        newRow.cells[4].textContent = (room_obj.players_mode === "2") ? room_obj.n_round: "-";;
        newRow.cells[5].textContent = room_obj.level;
        newRow.cells[6].appendChild(iconButton);

        if (isGrayedOut) {
            newRow.classList.add("grayed-out");
            newRow.cells[6].classList.add("unclickable");
        }
    }

    function createIconButton(href, iconClass, iconColor, clickHandler, isGrayedOut) {
        const button = document.createElement("a");
        button.innerHTML = `<i class="${iconClass}" style="color: ${iconColor};"></i>`;

        button.href = href;
        // Check if the button should be neutralized (unclickable)
        if (isGrayedOut) {
            button.onclick = function(event) {
                event.preventDefault(); // Prevent the default click behavior
            };
        } else {
            button.onclick = function(event) {
                event.preventDefault();
                clickHandler(this);
            };
        }
        return button;
    }

    function isValidRowIndex(rowIndex) {
        return rowIndex >= 1 && rowIndex <= roomsData.length;
    }

    function handleResponse(response) {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error("Error in response");
        }
    }

    function handleError(error) {
        console.error("Error:", error);
    }

    function updateRowNumbers(startIndex) {
        const table = document.querySelector("table tbody");
        for (let i = startIndex; i < table.rows.length; i++) {
            table.rows[i].cells[0].innerHTML = `<b>${i}</b>`;
        }
    }

    //DELETE ROOM
    function deleteRoom(button) {
        const row = button.closest("tr");
        const rowIndex = row.rowIndex;
        console.log("in delete_room: ", rowIndex);
        if (isValidRowIndex(rowIndex)) {
            const route_delete_room = button.href;
            // Make the DELETE request to delete the room
            fetch(route_delete_room, { method: "GET" })
                  .then(handleResponse)
                  .then(deletedRoom => {
                      // Remove the room data from the list based on the rowIndex
                      roomsData.splice(rowIndex - 1, 1);

                      // Remove the row from the table
                      row.remove();

                      // Update the table row numbers
                      updateRowNumbers(rowIndex);

                      // Update the room list UI
                      updateRoomsList();

                      // Emit an event to notify about room deletion
                      // socket.emit("update_rooms");
                  })
                  .catch(handleError);
        } else {
            console.error("Invalid rowIndex:", rowIndex);
        }

    }

    //JOIN ROOM
    async function joinRoom(room_id) {
        // const room_id = button.getAttribute("href").split("/").pop();

        console.log("Joining room:", room_id);
        // Make a GET request to the join route with the room_id and user_id
        fetch(`/join/${room_id}?user_id=${uniqueId}`)
              .then(handleResponse)
              .then(async data => {
                  // Update the UI based on the room data, e.g., show "play" icon if joined successfully
                  if (data && data.id) {
                      console.log("data in fetch:", data);
                  } else {
                      // Room join was unsuccessful, handle this case as needed
                      console.error("Failed to join room:", data);
                  }
              })
              .catch(handleError);
    }

    socket.on("join", async (data) => {
        // const currentUserSocketId = socket.id;
        console.log("in socket join:", data);
        const roomObj = data["room_data"];
        const joinerId = data["joiner"];
        if (joinerId === uniqueId) {
            console.log("in joinerId === uniqueId");
            await socket.emit("ready_to_start_game", { "room_id": roomObj.id, "user_id": uniqueId });
            console.log("emitted");
        } else if (roomObj.creator === uniqueId) {
            console.log("in roomObj.creator === uniqueId");
            await socket.emit("ready_to_start_game", { "room_id": roomObj.id, "user_id": uniqueId });
            console.log("emitted");
        } else {
            console.log("in else");
        }
    });


    function play_solo(button) {
        const row = button.closest("tr");
        const level = row.cells[5].textContent;
        const n = row.cells[3].textContent;
        console.log("in play_solo", level, n);

        window.location = `/game?id=${level}&nPose=${n}&mode=solo&playerId=${uniqueId}`;
    }

    async function play_versus(button) {
        const row = button.closest("tr");
        const room_id = row.cells[1].textContent;
        console.log("in play_versus", room_id);
        isStartingGame = true;
        await socket.emit("ready_to_start_game", { "room_id": room_id, "user_id": uniqueId });
        console.log("emitted");
    }

    socket.on("start_game", async (room) => {
        console.log(room["id"]);
        gameData = await game_data(room["id"]);
        const pictures_number = parseInt(gameData["nPose"], 10);
        console.log(gameData, gameData["players"]);
        if (uniqueId === gameData["players"][0]) {
            console.log("player1");
            gameData["playerId"] = uniqueId;
            window.location = `/game?mode=versus&gameData=${JSON.stringify(gameData)}&player=1`;
        } else if (uniqueId === gameData["players"][1]) {
            gameData["playerId"] = uniqueId;
            console.log("player2");
            showWaitingScreen();
        }
        console.log("play_versus function executed");
    });
    socket.on("start_player2", (data) => {
        if (gameData["players"][1] === uniqueId) {
            gameData["playerId"] = uniqueId;
            hideWaitingScreen()
            isStartingGame = true;
            console.log("Received 'start_player2' signal from server.");
            window.location = `/game?mode=versus&gameData=${JSON.stringify(gameData)}&player=2`;
        }
    });
    async function game_data(room_id) {
        await fetchRoomsData();
        // const room_id = data["room"];
        const room = serverRoomsData.find(room => room.room_id === parseInt(room_id));
        console.log(room);
        const players = room.clients;
        // const [player1, player2] = players;
        console.log("start_game event received", room_id, players);
        const nPose = room.n_pose;
        const nRound = room.n_round;
        const playersMode = room.players_mode;
        const creator = room.creator;
        const level = room.level;
        console.log("in play_versus", room_id, nPose, nRound);
        const gameData = {
            "nPose": nPose.toString(),
            "nRound": nRound.toString(),
            "players": players,
            "level": level,
            "roomId": room_id,
            "creator": creator
        };
        return gameData
    }
    //LOGOUT
    async function leaveRoom() {
        if (socket !== undefined) {
            console.log("in leaveRoom");

            const leavePromises = roomsData
                  .filter(room => room.clients && room.clients.includes(uniqueId))
                  .map(async room => {
                      console.log("in leaveRoom", room.room_id);
                      // Emit a "leave" event for each room and await it
                      await socket.emit("leave_room", {
                          "room_id": room.room_id,
                          "user_id": uniqueId
                      });
                      console.log("emitted");
                  });

            // Wait for all "leave" events to complete
            await Promise.all(leavePromises);

            console.log("leaveRoom function executed");
        }
    }


    window.logout = async function() {
        window.location = `/logout?user_id=${uniqueId}`;

    };

    window.onbeforeunload = async function(event) {
        if (isStartingGame) {
            // Display a message to indicate that the user cannot leave while starting a game
            event.preventDefault();
            event.returnValue = "You cannot leave while starting a game.";
        } else {
            console.log("in onbeforeunload");
            window.location = `/logout?user_id=${uniqueId}`;
        }
    };
});

function showWaitingScreen() {
    waitingScreen.style.display = "flex";

}

function hideWaitingScreen() {
    waitingScreen.style.display = "none";
}

