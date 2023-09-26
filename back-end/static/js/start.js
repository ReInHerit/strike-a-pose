import { setRoomAttr, getRoom } from "./scripts/fetchUtils.js";
import { Config } from "./scripts/config.js";

const serverUrl = Config.SERVER_URL;
const socket = io.connect(serverUrl);
const waitingScreen = $("#waiting-screen")[0];
// Define constants for element selectors
// const checkbox = $("#toggle");
// const containerHost = $("#container-rooms");
// const containerJoin = $("#container-join");
// const roomInput = $("#room-id");
const uniqueId = $("#user-random-id").text();
console.log("uniqueId:", waitingScreen, $("#waiting-screen"));
let isStartingGame = false;
socket.on("connect", () => {
    console.log("Connected to server");
    socket.emit("user_connected", uniqueId);
});
socket.on("update_users", (userIds) => {
    // Update the UI to display the count and user IDs
    const connectedPlayersCount = userIds.length;
    const connectedPlayersList = userIds.join(", ");

    console.log("Connected players:", connectedPlayersCount);
    console.log("User IDs:", connectedPlayersList);

    // You can update the UI elements with the player count and list as needed.
});
socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
});
let nRound, nPose;
let roomsData = [];


$(document).ready(async function() {
    await initialize();

    async function initialize() {

        await fetchRoomsData();
        await updateRoomsList();
    }

    $("#add-room-btn").on("click", function() {
        // let room_id;
        const row = $(this).closest("tr");
        const playersMode = row.find("#nPlayers_setted").val();
        const poses = row.find("#nPose_setted").val();
        const rounds = row.find("#nRound_setted").val();
        const level = row.find("#nRound_setted").val();
        createRoom(poses, rounds, level, playersMode);

    });

    document.querySelector("table").addEventListener("click", function(event) {
        if (event.target.classList.contains("fa-solid") && event.target.classList.contains("fa-plus-circle")) {
            // The user clicked the "join" button icon
            joinRoom(event.target);
        }
    });

    async function fetchRoomsData() {
        await fetch(`${Config.SERVER_URL}rooms_data`)
              .then(handleResponse)
              .then(json => {
                  console.log(json);
                  roomsData = json.rooms;
                  console.log("json_rooms: ", roomsData);
              })
              .catch(error => {
                  console.error("Fetch error:", error);
              });
    }

    socket.on("room_created", (data) => {
        if (!roomsData.some(room => room.room_id === data.room_id)) {
            addRoomToData(data);
            updateRoomsList();
        }
    });

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
                // Handle the error here, if needed
                return;
            }

            const json = await response.json();

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
        socket.emit("update_rooms");
    }

    socket.on("update_rooms", async () => {
        await fetchRoomsData();
        await updateRoomsList();
    });

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
        newRow.cells[4].textContent = room_obj.n_round;
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
                      socket.emit("update_rooms");
                  })
                  .catch(handleError);
        } else {
            console.error("Invalid rowIndex:", rowIndex);
        }

    }

    socket.on("room_deleted", (data) => {
        const { room_id } = data;

        const index = roomsData.findIndex(room => room.room_id === room_id);
        if (index !== -1) {
            roomsData.splice(index, 1);
            updateRoomsList();
        }
        console.log("Room deleted:", room_id);
    });

    //JOIN ROOM
    async function joinRoom(button) {
        const room_id = button.getAttribute("href").split("/").pop();

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
        const roomObj = data.roomData;

        console.log(roomsData);
        const roomIndex = roomsData.findIndex(room => room.room_id === roomObj.id);
        roomsData[roomIndex].room_id = roomObj.id;
        roomsData[roomIndex].num_clients = roomObj.num_clients;
        roomsData[roomIndex].clients = roomObj.clients;
        roomsData[roomIndex].free_space = roomObj.free;
        const roomJoined = roomsData[roomIndex];
        console.log("roomIndex:", roomIndex);
        if (!roomJoined || roomIndex === -1) {

            console.error("Room not found:", roomIndex);
            return;
        }
        if (roomJoined.clients.includes(uniqueId)) {
            const row = document.querySelector(`table tbody tr:nth-child(${roomIndex + 1})`);
            const cells = row.cells;
            cells[2].innerHTML = `<i id="you" class="fa-solid fa-user"></i><i class="fa-solid fa-user"></i>`;
            const iconButton = createIconButton(`play/room/${roomJoined.room_id}`, "fa-solid fa-play", "#FF5733", play_versus);
            cells[6].innerHTML = "";
            cells[6].appendChild(iconButton);
            console.error("User already joined the room", roomIndex);
            return;
        } else if (roomJoined.num_clients >= 2 || !roomJoined.free_space) {
            console.log("grayout the row");
            const row = document.querySelector(`table tbody tr:nth-child(${roomIndex + 1})`);

            console.log(row);
            if (row) {
                const cells = row.cells;
                row.classList.add("grayed-out"); // Add a CSS class for grayed-out style
                const iconButton = createIconButton(``, "fa-solid fa-gamepad", "gray", play_versus);
                cells[6].innerHTML = "";
                cells[6].appendChild(iconButton);
            }
        }
    });

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
                    // You can also handle the "room_leave_message" event here if needed
                });

            // Wait for all "leave" events to complete
            await Promise.all(leavePromises);

            console.log("leaveRoom function executed");
        }
    }


    window.logout = async function() {
        if (!isStartingGame) {
            // await leaveRoom();
            await leaveRoom();
            console.log("logouting")
            window.location = `/logout?user_id=${uniqueId}`;
        } else {
            // Display a message or prevent the logout action
            alert("You cannot log out while starting a game.");
        }
    };

    // socket.on("user_leave_room", async (data) => {
    //     console.log("in leave:", data);
    //     if (!isStartingGame) {
    //         console.log("in leave:", data);
    //         // await fetchRoomsData()
    //         await updateRoomsList();
    //     }
    // });

    window.onbeforeunload = async function(event) {
        if (isStartingGame) {
            // Display a message to indicate that the user cannot leave while starting a game
            event.preventDefault();
            event.returnValue = "You cannot leave while starting a game.";
        } else {
            console.log("in onbeforeunload")
            // try {
            //     await leaveRoom(); // Ensure the user leaves the room before logging out
            // } catch (error) {
            //     // Handle any errors that may occur during the leaveRoom process
            //     console.error("Error leaving room:", error);
            // }

            // Continue with the logout process
            window.location = `/logout?user_id=${uniqueId}`;
        }
    };

    function play_solo(button) {
        const row = button.closest("tr");
        const level = row.cells[5].textContent;
        const n = row.cells[4].textContent;
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
        // Listen for a confirmation from the server to start the game

    }

    socket.on("start_game", (data) => {
        console.log(data);
        let player1, player2;
        const room_id = data["room"];
        const room = roomsData.find(room => room.room_id === parseInt(room_id));
        console.log(room);
        const players = room.clients;
        [player1, player2] = players;
        console.log("start_game event received", room_id, players);
        // for (const room of roomsData) {
        //     console.log(room)
        //     if (room.room_id === parseInt(room_id)) {
        //         console.log("in room", room.room_id)
        const nPose = room.n_pose;
        const nRound = room.n_round;
        const playersMode = room.players_mode;
        const creator = room.creator;
        const level = room.level;
        console.log("in play_versus", room_id, nPose, nRound);
        if (uniqueId === player1) {
            const gameData = {
                "nPose": nPose.toString(),
                "nRound": nRound.toString(),
                "level": level,
                "playerId": uniqueId,
                "roomId": room_id,
                "creator": creator
            };
            window.location = `/game?mode=versus&gameData=${JSON.stringify(gameData)}`;
        } else if (uniqueId === player2) {
            showWaitingScreen();
        }


        console.log("play_versus function executed");
    });
});

function showWaitingScreen() {
    waitingScreen.style.display = "flex";

}

function hideWaitingScreen() {
    waitingScreen.style.display = "none";
}

// window.play = function(attrs) {
//     const level = attrs[1];
//     const n = attrs[2];
//     const currentRoomId = roomInput.val(); // Get the current value of the input field
//
//     if (!checkbox.prop("checked")) {
//         console.log("checkbox not checked");
//         roomId = null;
//         roomInput.val("Room ID: "); // Reset the input value to "Room ID: "
//     }
//
//     if (currentRoomId !== "Room ID: ") {
//         console.log("currentRoomId !== \"Room ID: \"", attrs);
//         host(attrs);
//     } else {
//         roomInput.val("Room ID: ");
//         window.location = `/game?id=${level}&mode=solo`;
//     }
// };
//
// async function host(attrs) {
//     roomId = $("#room-id").val().replace(/\D/g, "");
//     // roomId = attrs[0];
//     const level = attrs[1];
//     const n = attrs[2];
//     console.log(roomId, level, n, uniqueId);
//
//     const dataToSend = { id: roomId, level: level, n: n };  // , userId: userId
//     const response = await setRoomAttr(dataToSend);
//     console.log(response);
//
//     if (nPose > n) {
//         alert("The number of poses selected must be lower than the number of artworks in the mode you have chosen");
//         return;
//     }
//
//     $("#fade").addClass("fade-me");
//     $("#fade").show();
//
//     socket.on("status", (status) => {
//         console.log("status: " + status.data, "roomId:", roomId, "level:", level, "uniqueId:", uniqueId);
//     });
//
//     socket.emit("join", roomId, level, uniqueId); // , userId
//
//     socket.on("room_message", (msg) => {
//         console.log("message from room: " + msg);
//     });
//
//     socket.on("message", (msg) => {
//         console.log("message from server: " + msg);
//     });
//
//     socket.on("disconnect", () => {
//         console.log("disconnect");
//     });
//     socket.emit("play", roomId, level);
//     console.log("Emitted 'play' event");
//     socket.on("play", (pictures) => {
//         console.log("PLAY!");
//         $("#fade").hide();
//         localStorage.setItem("picturesArray", JSON.stringify(pictures));
//         play_versus(nPose, nRound);
//     });
//
// }
//
// window.playButtons = function(attr) {
//     $("button.play").attr("disabled", attr);
// };
//
// window.join = async function() {
//     roomId = $("#room-join-id").val();
//
//     const errorJoin = $("#error");
//     console.log("ROOMID: ", roomId);
//     try {
//         const resp = await getRoom(roomId, uniqueId);
//         console.log("resp", resp);
//
//         // const serverUrl = Config.SERVER_URL;
//         // socket = io.connect(serverUrl);
//
//         socket.on("status", (status) => {
//             console.log("status: " + status.data);
//         });
//
//         socket.emit("join", roomId, resp.level, uniqueId); //
//
//         socket.on("room_message", (msg) => {
//             console.log("message from room: " + msg);
//         });
//
//         socket.on("error", (msg) => {
//             errorJoin.text(msg);
//         });
//
//         socket.on("errorRoom", (msg) => {
//             errorJoin.text(msg);
//         });
//
//         socket.on("message", (msg) => {
//             console.log("message from server: " + msg);
//         });
//
//         socket.on("play", (pictures) => {
//             localStorage.setItem("picturesArray", JSON.stringify(pictures));
//             play_versus(resp.n_pose, resp.n_round);
//         });
//
//     } catch (error) {
//         errorJoin.text(error);
//     }
// };


// function delay(ms) {
//     var start = +new Date;
//     while ((+new Date - start) < ms) ;
// }
