let adminButtonClicked = false;
const flashMessages = document.querySelector('.flash-messages');
const admin_button = document.getElementById('adminButton')

window.addEventListener('beforeunload', function (e) {
    console.log("beforeunload");
    if (adminButtonClicked) {
      confirmLogout();

    } else {
        console.log("Not admin button clicked. Storing select_signup_tab.");
        console.log("Current select_signup_tab value:", sessionStorage.getItem('select_signup_tab'));
        sessionStorage.setItem('select_signup_tab', 'true');
    }
    });

function confirmDelete(pictureId) {
    console.log(pictureId);
    if (confirm('Are you sure you want to remove this picture?')) {
        document.getElementById('deleteForm' + pictureId).submit();
    }
}
function confirmLogout() {
    if (confirm("Are you sure you want to log out?")) {
        const logoutUrl = document.getElementById('adminButton').dataset.logoutUrl;
        window.location.href = logoutUrl;
    }
}
document.addEventListener('DOMContentLoaded', function () {
    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");
    if (signupTab){
        signupTab.addEventListener("click", function() {
            loginTab.classList.remove("active");
            loginTab.classList.add("inactive");
            signupTab.classList.remove("inactive");
            signupTab.classList.add("active");
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("signupForm").style.display = "block";
            // resetFadeInAnimation("form_container");
        });
    }
    if (loginTab){
        if (loginTab.classList.contains("active")) {
            document.getElementById("loginForm").style.display = "block";
            document.getElementById("signupForm").style.display = "none";
        }
        else {
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("signupForm").style.display = "block";
        }
        loginTab.addEventListener("click", function() {
            loginTab.classList.add("active");
            loginTab.classList.remove("inactive");
            signupTab.classList.remove("active");
            signupTab.classList.add("inactive");
            document.getElementById("loginForm").style.display = "block";
            document.getElementById("signupForm").style.display = "none";
            // resetFadeInAnimation("form_container");
        });
    }

    if (admin_button) {
        admin_button.addEventListener("click", function() {
            adminButtonClicked = !adminButtonClicked;
            if (adminButtonClicked) {
                alert("You are now in admin mode. Click the button again to log out.");
            } else {
                confirmLogout();
            }
        });
    }
    if (flashMessages) {
        setTimeout(function () {
            flashMessages.classList.add('fade-out');

            // Remove the p tags after the fade-out animation
            setTimeout(function () {
                flashMessages.innerHTML = ''; // Remove all child elements
                document.getElementById('formFooter').classList.remove('show-messages');

            }, 500); // Adjust the timeout value based on your fade-out animation duration
        }, 3000); // Adjust the timeout value to match the desired delay in milliseconds
    }
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});