
$(() => {
  const checkbox = $("#toggle");

  const containerHost = $("#container-host");
  const containerJoin = $("#container-join");

  const hostButton = $("#host");
  const joinButton = $("#join");

  const formHost = $("#form-host");
  const formJoin = $("#form-join");
  let toggle;

  if(Cookies.get("checkbox") == "true")
    checkbox.prop("checked", true);
  else
    checkbox.prop("checked", false)

  if(Cookies.get("containerHost") == "true")
    containerHost.show();
  else
    containerHost.hide();

  if(Cookies.get("containerJoin") == "true")
    containerJoin.show();
  else
    containerJoin.hide();

  if(Cookies.get("formHost") == "true") 
    formHost.show();
  else
    formHost.hide();

  if(Cookies.get("formJoin") == "true") {
    formJoin.show();
    playButtons(true);
  }
  else
    formJoin.hide();
  
  
  checkbox.on("click", () => {
    if(containerHost.is(":visible") && containerJoin.is(":visible")) {
      containerHost.hide();
      containerJoin.hide();
      formHost.hide();
      formJoin.hide();
      toggle = false;
      playButtons(false);
    } else {
      containerHost.show();
      containerJoin.show();
      formHost.hide();
      formJoin.hide();
      toggle = true;
    }
    Cookies.set("containerHost", containerHost.is(":visible"));
    Cookies.set("containerJoin", containerJoin.is(":visible"));
    Cookies.set("formHost", formHost.is(":visible"));
    Cookies.set("formJoin", formJoin.is(":visible"));
    Cookies.set("checkbox", toggle);
   });
  
   hostButton.on("click", ()=> {
    formHost.show();
    formJoin.hide();
    Cookies.set("formHost", formHost.is(":visible"));
    Cookies.set("formJoin", formJoin.is(":visible"));
   });
  
    joinButton.on("click", ()=> {
    formJoin.show();
    formHost.hide();
    Cookies.set("formJoin", formJoin.is(":visible"));
    Cookies.set("formHost", formHost.is(":visible"));
   });
});