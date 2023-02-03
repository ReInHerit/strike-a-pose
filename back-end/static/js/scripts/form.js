function isValid(email) {
  const pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const regex = new RegExp(pattern);
  return regex.test(email)
}

function checkEmptyInputs(email, password) {
  return !email || !password;
}

export function checkValidity(email, password) {
  return !checkEmptyInputs(email, password) && isValid(email);
}