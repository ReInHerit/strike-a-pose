import {checkValidity} from "./scripts/form.js";

$(() => {

    const form = $("#login-form");
    const email = $("input[name='email']");
    const password = $("input[name='password']")
    const submit = $(":submit");
    const responseMessage = $("#response-message");


    form.on("input", function () {
        if (checkValidity(email.val(), password.val()))
            submit.prop("disabled", false)
        else
            submit.prop("disabled", true);
        responseMessage.empty();

    });
});
