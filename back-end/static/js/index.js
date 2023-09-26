// $(() => {
//     // Check if the user has a random ID already
//
//     const appContainer = $("#app-container");
//     const welcomeMessage = $("<h2>").text("Welcome to the App!");
//     appContainer.append(welcomeMessage);
//     // If the user doesn't have an ID, generate one and store it in local storage
//
//     const randomId = generateRandomId();
//     localStorage.setItem("userId", randomId);
//     window.location.href = "start"; // Redirect to start.html ?unique_id=${randomId}
//
// });
//
// function generateRandomId() {
//     const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     let id = "";
//     for (let i = 0; i < 10; i++) {
//         id += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return id;
// }
$(() => {
    // No need to generate a user ID here
    window.location.href = "start";
});