let adminButtonClicked = false;
const flashMessages = document.querySelector(".flash-messages");
const admin_button = document.getElementById("adminButton");

window.addEventListener("beforeunload", function(e) {
    console.log("beforeunload");
    if (adminButtonClicked) {
        confirmLogout();

    } else {
        console.log("Not admin button clicked. Storing select_signup_tab.");
        console.log("Current select_signup_tab value:", sessionStorage.getItem("select_signup_tab"));
        sessionStorage.setItem("select_signup_tab", "true");
    }
});

function confirmDelete(pictureId) {
    console.log(pictureId);
    if (confirm("Are you sure you want to remove this picture?")) {
        document.getElementById("deleteForm" + pictureId).submit();
    }
}

function confirmLogout() {
    if (confirm("Are you sure you want to log out?")) {
        const logoutUrl = document.getElementById("adminButton").dataset.logoutUrl;
        window.location.href = logoutUrl;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");
    if (signupTab) {
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
    if (loginTab) {
        if (loginTab.classList.contains("active")) {
            document.getElementById("loginForm").style.display = "block";
            document.getElementById("signupForm").style.display = "none";
        } else {
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
        setTimeout(function() {
            flashMessages.classList.add("fade-out");

            // Remove the p tags after the fade-out animation
            setTimeout(function() {
                flashMessages.innerHTML = ""; // Remove all child elements
                document.getElementById("formFooter").classList.remove("show-messages");

            }, 500); // Adjust the timeout value based on your fade-out animation duration
        }, 3000); // Adjust the timeout value to match the desired delay in milliseconds
    }
    var tooltipTriggerList = [].slice.call(document.querySelectorAll("[data-bs-toggle=\"tooltip\"]"));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });


    document.getElementById("category").addEventListener("change", function() {
        const selectedValue = this.value;
        const newCategoryInput = document.getElementById("newCategoryInput");
        const existingCategoriesDropdown = document.getElementById("existingCategoriesDropdown");
        if (selectedValue === "existing") {
            // Show the existing categories modal
            existingCategoriesDropdown.style.display = "block";
            console.log("existing");
            // don't show the new category input field
            newCategoryInput.style.display = "none";
        } else if (selectedValue === "new") {
            console.log("new");
            // Show the new category input field
            newCategoryInput.style.display = "block";
            // don't show the existing categories modal
            existingCategoriesDropdown.style.display = "none";
        }
    });

    // Quill Initialization Script
    const quill = new Quill("#description-editor", {
        theme: "snow",
        modules: {
            toolbar: [
                ["bold", "italic", "underline"],
                ["link"],
                ["clean"]
            ]

        },
        placeholder: "Input the artwork's description here..."
    });

    quill.on("text-change", function() {
        // Update the hidden textarea with the HTML content
        document.getElementById("description").value = quill.root.innerHTML;
    });
    function initializeQuillInModal(initialContent, onSaveCallback) {
        // Create a unique ID for the modal
        var modalId = 'quillModal' + new Date().getTime();
        $('#' + modalId).remove();
        // Create a modal HTML structure
        var modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog" aria-labelledby="quillModalLabel" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="quillModalLabel">Edit Description</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div id="quillEditor"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" id="saveQuillChanges">Save changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append the modal HTML to the body
        $('body').append(modalHtml);
        var modalElement = $('#' + modalId);
        // Open the modal
        modalElement.modal('show');

        // Initialize Quill inside the modal
        var quill = new Quill('#quillEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link'],
                    ['clean']
                ]
            }
        });

        // Set the initial content
        quill.clipboard.dangerouslyPasteHTML(0, initialContent);
        $("[data-dismiss='modal']").click(function () {
            modalElement.modal('hide');

            modalElement.on('hidden.bs.modal', function () {
                $(this).remove();
            });
        })
        // Handle the save button click
        $('#saveQuillChanges').click(function () {
            // Get the updated content from Quill
            var newContent = quill.root.innerHTML;

            // Call the provided onSaveCallback with the new content
            onSaveCallback(newContent);

            // Close the modal
            modalElement.modal('hide');

            // Remove the modal from the DOM after it's hidden
            modalElement.on('hidden.bs.modal', function () {
                $(this).remove();
            });
        });
    }
    $(".editable").click(function () {
        var $editableCell = $(this);
        // Get the data attributes (field and id)
        var field = $(this).data("field");
        var id = $(this).data("id");
        console.log("Field:", field, "ID:", id);
        // Check if the field is the description
        // if (field === "description") {
        //     // Get the current content of the cell
        //     var currentContent = $(this).find(".quill-container").html();
        //
        //     // Initialize Quill in a modal with the current content
        //     initializeQuillInModal(currentContent, function (newContent) {
        //         // Update the cell content with the new Quill content
        //         console.log("New content:", newContent);
        //         const tempDiv = document.createElement('div');
        //         tempDiv.innerHTML = newContent;
        //         const textContentWithoutTags = tempDiv.textContent || tempDiv.innerText;
        //
        //         // Update the cell content with the extracted text
        //         $editableCell.find(".quill-container").html(textContentWithoutTags);
        //
        //         // Remove the temporary div from the document
        //         if (tempDiv.parentNode) {
        //             tempDiv.parentNode.removeChild(tempDiv);
        //         }
        //
        //         // Send the updated value to the server (you need to implement the server-side logic)
        //         var formData = new FormData();
        //         formData.append('field', field);
        //         formData.append('id', id);
        //         formData.append('value', textContentWithoutTags);
        //
        //         fetch("/update_picture", {
        //             method: "POST",
        //             body: formData
        //         })
        //         .then(response => {
        //             if (!response.ok) {
        //                 throw new Error("Network response was not ok");
        //             }
        //             return response.json(); // or response.text() if expecting a different response type
        //         })
        //         .then(data => {
        //             // Handle the server response if needed
        //         })
        //         .catch(error => {
        //             console.error("Error during fetch:", error);
        //         });
        //     });
        // }
        if (field === "description") {
            var currentContent = $(this).find(".quill-container").html();

            initializeQuillInModal(currentContent, function (newContent) {
                // Update the cell content with the new Quill content
                console.log("New content:", newContent);
                $editableCell.find(".quill-container").html(newContent);
                // Send the updated value to the server without extracting text
                var formData = new FormData();
                formData.append('field', field);
                formData.append('id', id);
                formData.append('value', newContent); // Send HTML content as is

                fetch("/update_picture", {
                    method: "POST",
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    // Handle the server response if needed
                })
                .catch(error => {
                    console.error("Error during fetch:", error);
                });
            });
        }
        else {
            // For other fields (non-rich text), proceed as before
            var currentValue = $(this).text();
            var inputField = $("<input type=\"text\" class=\"form-control\" value=\"" + currentValue + "\">");
            $(this).html(inputField);

            inputField.focus();

            inputField.blur(function () {
                var newValue = $(this).val();
                var field = $(this).parent().data("field");
                var id = $(this).parent().data("id");

                $(this).parent().html(newValue);

                var formData = new FormData();
                formData.append('field', field);
                formData.append('id', id);
                formData.append('value', newValue);

                fetch("/update_picture", {
                    method: "POST",
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json(); // or response.text() if expecting a different response type
                })
                .then(data => {
                    // Handle the server response if needed
                })
                .catch(error => {
                    console.error("Error during fetch:", error);
                });
            });
        }
    });
});