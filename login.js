const USERS = {
  "rajesh.kumar@agrilink.in": {
    password: "farmer123",
    role: "farmer",
    name: "Rajesh Kumar",
    id: "farmer-1",
    position: "Lead Farmer & Agricultural Delegate",
  },
  "priya.devi@agrilink.in": {
    password: "farmer123",
    role: "farmer",
    name: "Priya Devi",
    id: "farmer-2",
    position: "Smallholder Paddy Farmer",
  },
  "s.verma@agriculture.gov.in": {
    password: "officer123",
    role: "officer",
    name: "Sandeep Verma",
    id: "officer-1",
    position: "Senior Agricultural Field Inspection Officer",
  },
  "a.sharma@agriculture.gov.in": {
    password: "officer123",
    role: "officer",
    name: "Anjali Sharma",
    id: "officer-2",
    position: "District Crop Loss Assessment Officer",
  },
};

const CROP_EXAMPLES = {
  paddy: {
    season: "Kharif season",
    evidence: "Flood marks + field photos",
    risk: "Flood / drought",
  },
  wheat: {
    season: "Rabi season",
    evidence: "Hail pattern + harvest stage",
    risk: "Hail / unseasonal rain",
  },
  cotton: {
    season: "Kharif season",
    evidence: "Leaf damage + plot photos",
    risk: "Pest / dry spell",
  },
};

const body = document.body;
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formAlert = document.getElementById("formAlert");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginButtonText = document.getElementById("loginButtonText");
const rememberEmail = document.getElementById("rememberEmail");
const passwordToggle = document.getElementById("passwordToggle");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");
const toastIcon = document.getElementById("toastIcon");

let selectedRole = "farmer";
let toastTimer;

function setRole(role) {
  selectedRole = role === "officer" ? "officer" : "farmer";
  body.dataset.role = selectedRole;

  document.querySelectorAll("[data-role-choice]").forEach((button) => {
    const active = button.dataset.roleChoice === selectedRole;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-demo-role]").forEach((button) => {
    button.hidden = button.dataset.demoRole !== selectedRole;
  });

  loginButtonText.textContent = selectedRole === "farmer"
    ? "Enter farmer portal"
    : "Enter officer portal";

  clearErrors();
}

function clearErrors() {
  emailError.textContent = "";
  passwordError.textContent = "";
  emailInput.closest(".input-shell").classList.remove("has-error");
  passwordInput.closest(".input-shell").classList.remove("has-error");
  emailInput.removeAttribute("aria-invalid");
  passwordInput.removeAttribute("aria-invalid");
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function showFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", "true");
  input.closest(".input-shell").classList.add("has-error");
}

function showToast(message, icon = "✓") {
  window.clearTimeout(toastTimer);
  toastMessage.textContent = message;
  toastIcon.textContent = icon;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

function setLoading(loading) {
  loginButton.disabled = loading;
  loginButton.classList.toggle("is-loading", loading);
  loginButton.setAttribute("aria-busy", String(loading));
}

function validateForm() {
  clearErrors();
  let valid = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    showFieldError(emailInput, emailError, "Enter your email address.");
    valid = false;
  } else if (!emailInput.validity.valid) {
    showFieldError(emailInput, emailError, "Enter a valid email address.");
    valid = false;
  }

  if (!password) {
    showFieldError(passwordInput, passwordError, "Enter your password.");
    valid = false;
  }

  return valid;
}

function rememberUserEmail() {
  try {
    if (rememberEmail.checked) {
      localStorage.setItem("nyay_remembered_email", emailInput.value.trim().toLowerCase());
    } else {
      localStorage.removeItem("nyay_remembered_email");
    }
  } catch {
    // Remembering an email is optional.
  }
}

function loadRememberedEmail() {
  try {
    const remembered = localStorage.getItem("nyay_remembered_email");
    if (remembered) {
      emailInput.value = remembered;
      rememberEmail.checked = true;
    }
  } catch {
    // Local storage may be unavailable.
  }
}

document.querySelectorAll("[data-role-choice]").forEach((button) => {
  button.addEventListener("click", () => setRole(button.dataset.roleChoice));
});

document.querySelectorAll("[data-demo-email]").forEach((button) => {
  button.addEventListener("click", () => {
    setRole(button.dataset.demoRole);
    emailInput.value = button.dataset.demoEmail;
    passwordInput.value = button.dataset.demoPassword;
    clearErrors();
    showToast(`${button.querySelector("strong").textContent} demo account is ready.`);
    loginButton.focus();
  });
});

document.querySelectorAll("[data-crop]").forEach((button) => {
  button.addEventListener("click", () => {
    const crop = CROP_EXAMPLES[button.dataset.crop];
    if (!crop) return;

    document.querySelectorAll("[data-crop]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });

    document.getElementById("seasonLabel").textContent = crop.season;
    document.getElementById("cropEvidence").textContent = crop.evidence;
    document.getElementById("cropRisk").textContent = crop.risk;

    const summary = document.getElementById("cropSummary");
    summary.classList.remove("is-changing");
    void summary.offsetWidth;
    summary.classList.add("is-changing");
  });
});

passwordToggle.addEventListener("click", () => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(reveal));
  passwordToggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  passwordToggle.querySelector("span").textContent = reveal ? "Hide" : "Show";
  passwordInput.focus();
});

document.getElementById("passwordHelp").addEventListener("click", () => {
  showToast("For this prototype, choose a demo account below to fill valid credentials.", "i");
});

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    input.closest(".input-shell").classList.remove("has-error");
    if (input === emailInput) emailError.textContent = "";
    if (input === passwordInput) passwordError.textContent = "";
    formAlert.hidden = true;
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  setLoading(true);
  await new Promise((resolve) => window.setTimeout(resolve, 650));

  const email = emailInput.value.trim().toLowerCase();
  const user = USERS[email];

  if (!user || user.password !== passwordInput.value) {
    formAlert.textContent = "Credentials not recognized. Use one of the demo accounts below or check the email and password.";
    formAlert.hidden = false;
    setLoading(false);
    passwordInput.focus();
    return;
  }

  if (user.role !== selectedRole) {
    formAlert.textContent = `This is a ${user.role} account. Select the ${user.role} portal to continue.`;
    formAlert.hidden = false;
    setLoading(false);
    document.querySelector(`[data-role-choice="${user.role}"]`).focus();
    return;
  }

  rememberUserEmail();
  sessionStorage.setItem("nyay_user", JSON.stringify({
    id: user.id,
    name: user.name,
    email,
    role: user.role,
    position: user.position,
  }));

  showToast(`Welcome, ${user.name}. Opening the ${user.role} portal…`);
  window.setTimeout(() => {
    window.location.href = `index.html?portal=${user.role}`;
  }, 850);
});

const requestedRole = new URLSearchParams(window.location.search).get("role");
setRole(requestedRole);
loadRememberedEmail();
