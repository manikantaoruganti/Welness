/*
  Aurora People - Vanilla SPA
  - Users list + Add user drawer
  - Profile view with tabs and editable sections
  - LocalStorage persistence
*/

const STORAGE_KEY = "aurora_people_users_v1";

function readUsersFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeUsersToStorage(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function createDemoUsers() {
  return [
    {
      id: "u1",
      name: "Dave Richards",
      email: "dave@mail.com",
      phone: "+91 8332883854",
      profile: { basic: {}, education: {}, experience: {} },
    },
    {
      id: "u2",
      name: "Abhishek Hari",
      email: "hari@mail.com",
      phone: "",
      profile: { basic: {}, education: {}, experience: {} },
    },
    {
      id: "u3",
      name: "Nishta Gupta",
      email: "nishta@mail.com",
      phone: "",
      profile: { basic: {}, education: {}, experience: {} },
    },
  ];
}

function getUsers() {
  const fromStorage = readUsersFromStorage();
  if (fromStorage) return fromStorage;
  const demo = createDemoUsers();
  writeUsersToStorage(demo);
  return demo;
}

function setUsers(users) {
  writeUsersToStorage(users);
}

function getUserById(userId) {
  return getUsers().find((u) => u.id === userId) || null;
}

function upsertUser(updatedUser) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index >= 0) {
    users[index] = updatedUser;
  } else {
    users.unshift(updatedUser);
  }
  setUsers(users);
}

function deleteUser(userId) {
  const users = getUsers().filter((u) => u.id !== userId);
  setUsers(users);
}

// -------- Router --------
const routes = {
  users: "#/users",
  userProfile: (id) => `#/users/${id}`,
};

function parseHash() {
  const hash = window.location.hash || routes.users;
  const parts = hash.replace(/^#\//, "").split("/");
  if (parts[0] === "users" && parts.length === 1) return { name: "users" };
  if (parts[0] === "users" && parts[1]) return { name: "profile", id: parts[1] };
  return { name: "users" };
}

function navigate(to) {
  if (window.location.hash === to) {
    render();
  } else {
    window.location.hash = to;
  }
}

window.addEventListener("hashchange", () => render());

// -------- UI Helpers --------
const root = document.getElementById("app-root");
const overlayRoot = document.getElementById("overlay-root");
const toastRoot = document.getElementById("toast-root");

function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") element.className = value;
    else if (key === "html") element.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (typeof child === "string") element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  }
  return element;
}

function showToast(message, variant = "default") {
  const node = el("div", { class: "toast" }, message);
  toastRoot.appendChild(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 180);
  }, 2200);
}

// Drawer
let currentDrawer = null;
function openDrawer({ title, content, onCancel, onSubmit, submitLabel = "Add" }) {
  closeDrawer();

  const overlay = el("div", { class: "overlay open", role: "dialog", "aria-modal": "true" });
  const drawer = el("div", { class: "drawer open" });
  const header = el("div", { class: "drawer-header" }, el("div", { class: "panel-title" }, title));
  const body = el("div", { class: "drawer-body" }, content);
  const cancelBtn = el("button", { class: "btn btn-ghost" }, "Cancel");
  const submitBtn = el("button", { class: "btn btn-primary" }, submitLabel);
  const footer = el("div", { class: "drawer-footer" }, [cancelBtn, submitBtn]);

  cancelBtn.addEventListener("click", () => {
    onCancel?.();
    closeDrawer();
  });
  submitBtn.addEventListener("click", () => onSubmit?.());

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDrawer();
  });

  overlay.appendChild(drawer);
  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(footer);
  overlayRoot.appendChild(overlay);
  currentDrawer = { overlay, drawer };
}

function closeDrawer() {
  if (!currentDrawer) return;
  currentDrawer.drawer.classList.remove("open");
  currentDrawer.overlay.classList.remove("open");
  setTimeout(() => {
    currentDrawer?.overlay.remove();
    currentDrawer = null;
  }, 220);
}

// -------- Views --------
function UsersListView() {
  const users = getUsers();

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-title" }, "Users"),
    el(
      "div",
      {},
      el(
        "button",
        { class: "btn btn-primary", onClick: () => openAddUserDrawer() },
        "+ Add user"
      )
    ),
  ]);

  const tableHead = el("thead", {}, [
    el("tr", {}, [
      el("th", {}, "Sr. No"),
      el("th", {}, "User name"),
      el("th", {}, "E-mail"),
      el("th", {}, "Action"),
    ]),
  ]);

  const rows = users.map((u, i) =>
    el("tr", {}, [
      el("td", {}, String(i + 1)),
      el("td", {}, u.name),
      el("td", {}, u.email || "—"),
      el("td", {}, el("div", { class: "actions" }, [
        el("button", { class: "action-icon", title: "View", onClick: () => navigate(routes.userProfile(u.id)) }, "👁️"),
        el("button", { class: "action-icon", title: "Delete", onClick: () => { if (confirm(`Delete ${u.name}?`)) { deleteUser(u.id); render(); showToast("User deleted", "danger"); } } }, "🗑️"),
      ])),
    ])
  );

  const table = el("table", { class: "table" }, [tableHead, el("tbody", {}, rows)]);

  return el("section", { class: "panel" }, [header, el("div", { style: "overflow:auto;" }, table)]);
}

function openAddUserDrawer() {
  const nameInput = el("input", { class: "input", placeholder: "Name of the user" });
  const emailInput = el("input", { class: "input", type: "email", placeholder: "E-mail" });
  const contactInput = el("input", { class: "input", placeholder: "Contact" });

  const form = el("div", { class: "form-grid" }, [
    el("div", { class: "field col-12" }, [el("label", {}, "Name of the user"), nameInput]),
    el("div", { class: "field col-6" }, [el("label", {}, "E-mail"), emailInput]),
    el("div", { class: "field col-6" }, [el("label", {}, "Contact"), contactInput]),
  ]);

  openDrawer({
    title: "Add User",
    content: form,
    submitLabel: "Add",
    onSubmit: () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const contact = contactInput.value.trim();

      const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (name.length < 2) return showToast("Please enter a valid name");
      if (!emailOk) return showToast("Please enter a valid email");

      const newUser = {
        id: `u_${Date.now()}`,
        name,
        email,
        phone: contact,
        profile: { basic: {}, education: {}, experience: {} },
      };
      upsertUser(newUser);
      closeDrawer();
      render();
      showToast("User added", "ok");
    },
  });
}

function ProfileView(userId) {
  const user = getUserById(userId);
  if (!user) {
    return el("div", {}, [
      el("p", {}, "User not found."),
      el("button", { class: "btn mt-12", onClick: () => navigate(routes.users) }, "Back to Users"),
    ]);
  }

  let activeTab = "basic";

  const nameNode = el("div", { class: "profile-name" }, user.name);
  const metaNode = el("div", { class: "profile-meta" }, [
    el("span", { class: "copyable", title: "Copy email", onClick: () => copyToClipboard(user.email || "") }, `✉️ ${user.email || "—"}`),
    el("span", { class: "copyable", title: "Copy phone", onClick: () => copyToClipboard(user.phone || "") }, `📞 ${user.phone || "—"}`),
  ]);

  const header = el("div", { class: "profile-header" }, [
    el("div", { class: "avatar-xl" }, "\u{1F464}"),
    el("div", {}, [nameNode, el("div", { class: "mt-12" }, metaNode)]),
  ]);

  const tabs = el("div", { class: "tabs" }, [
    tabButton("Basic info", "basic"),
    tabButton("Education & skills", "education"),
    tabButton("Experience", "experience"),
    el("div", { style: "margin-left:auto" }, el("button", { class: "btn", onClick: () => navigate(routes.users) }, "← Back")),
  ]);

  const sectionsRoot = el("div", {});

  function tabButton(label, id) {
    const btn = el("button", { class: `tab ${id === activeTab ? "active" : ""}` }, label);
    btn.addEventListener("click", () => { activeTab = id; syncTabs(); });
    return btn;
  }

  function syncTabs() {
    // Update tab active state
    for (const child of tabs.children) {
      if (!child.classList?.contains?.("tab")) continue;
      const isActive = child.textContent?.toLowerCase().includes(activeTab.split(" ")[0]);
      child.classList.toggle("active", Boolean(isActive));
    }
    // Update section content
    sectionsRoot.innerHTML = "";
    if (activeTab === "basic") sectionsRoot.appendChild(BasicSection(user));
    else if (activeTab === "education") sectionsRoot.appendChild(EducationSection(user));
    else sectionsRoot.appendChild(ExperienceSection(user));
  }

  syncTabs();

  return el("section", { class: "panel" }, [header, tabs, sectionsRoot]);
}

function BasicSection(user) {
  const basic = user.profile.basic || {};

  const firstName = el("input", { class: "input", value: basic.firstName || "" });
  const lastName = el("input", { class: "input", value: basic.lastName || "" });
  const email = el("input", { class: "input", value: user.email || "" });
  const year = el("input", { class: "input", placeholder: "YYYY", value: basic.yearOfBirth || "" });
  const gender = el("select", {}, [
    el("option", { value: "" }, "Select an option"),
    el("option", { value: "male", selected: basic.gender === "male" }, "Male"),
    el("option", { value: "female", selected: basic.gender === "female" }, "Female"),
    el("option", { value: "other", selected: basic.gender === "other" }, "Other"),
  ]);
  const phone = el("input", { class: "input", value: user.phone || "" });
  const altPhone = el("input", { class: "input", value: basic.altPhone || "" });
  const address = el("textarea", { rows: 3 }, basic.address || "");
  const pincode = el("input", { class: "input", value: basic.pincode || "" });
  const domicileCountry = el("input", { class: "input", value: basic.domicileCountry || "" });
  const domicileState = el("input", { class: "input", value: basic.domicileState || "" });

  const form = el("div", { class: "form-grid" }, [
    field("First name", firstName, "col-6"),
    field("Last name", lastName, "col-6"),
    field("Email ID", email, "col-6"),
    field("Year of birth", year, "col-3"),
    field("Gender", gender, "col-3"),
    field("Phone number", phone, "col-6"),
    field("Alternate Phone no", altPhone, "col-6"),
    field("Address", address, "col-12"),
    field("Pincode", pincode, "col-4"),
    field("Domicile state", domicileState, "col-4"),
    field("Domicile country", domicileCountry, "col-4"),
  ]);

  const saveBtn = el("button", { class: "btn btn-primary" }, "Save basic info");
  saveBtn.addEventListener("click", () => {
    user.name = `${firstName.value?.trim() || ""} ${lastName.value?.trim() || ""}`.trim() || user.name;
    user.email = email.value.trim();
    user.phone = phone.value.trim();
    user.profile.basic = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      yearOfBirth: year.value.trim(),
      gender: gender.value,
      altPhone: altPhone.value.trim(),
      address: address.value.trim(),
      pincode: pincode.value.trim(),
      domicileCountry: domicileCountry.value.trim(),
      domicileState: domicileState.value.trim(),
    };
    upsertUser(user);
    showToast("Basic info saved", "ok");
  });

  return el("div", { class: "section" }, [
    el("div", { class: "section-title" }, "Basic Details"),
    form,
    el("div", { class: "mt-18" }, saveBtn),
  ]);
}

function EducationSection(user) {
  const edu = user.profile.education || {};

  const school = el("input", { class: "input", value: edu.school || "" });
  const degree = el("input", { class: "input", value: edu.degree || "" });
  const course = el("input", { class: "input", value: edu.course || "" });
  const completionYear = el("input", { class: "input", placeholder: "YYYY", value: edu.completionYear || "" });
  const grade = el("input", { class: "input", value: edu.grade || "" });
  const skills = el("textarea", { rows: 3 }, edu.skills || "");
  const projects = el("textarea", { rows: 3 }, edu.projects || "");

  const form = el("div", { class: "form-grid" }, [
    field("School / College", school, "col-6"),
    field("Highest degree or equivalent", degree, "col-6"),
    field("Course", course, "col-8"),
    field("Year of completion", completionYear, "col-2"),
    field("Grade", grade, "col-2"),
    field("Skills", skills, "col-6"),
    field("Projects", projects, "col-6"),
  ]);

  const saveBtn = el("button", { class: "btn btn-primary" }, "Save education");
  saveBtn.addEventListener("click", () => {
    user.profile.education = {
      school: school.value.trim(),
      degree: degree.value.trim(),
      course: course.value.trim(),
      completionYear: completionYear.value.trim(),
      grade: grade.value.trim(),
      skills: skills.value.trim(),
      projects: projects.value.trim(),
    };
    upsertUser(user);
    showToast("Education saved", "ok");
  });

  return el("div", { class: "section" }, [
    el("div", { class: "section-title" }, "Education Details"),
    form,
    el("div", { class: "mt-18" }, saveBtn),
  ]);
}

function ExperienceSection(user) {
  const exp = user.profile.experience || {};

  const domain1 = el("input", { class: "input", value: exp.domain1 || "" });
  const sub1 = el("input", { class: "input", value: exp.sub1 || "" });
  const years1 = el("select", {}, yearsOptions(exp.years1));
  const domain2 = el("input", { class: "input", value: exp.domain2 || "" });
  const sub2 = el("input", { class: "input", value: exp.sub2 || "" });
  const years2 = el("select", {}, yearsOptions(exp.years2));

  const linkedin = el("input", { class: "input", placeholder: "linkedin.com/in/username", value: exp.linkedin || "" });
  const resume = el("input", { class: "input", placeholder: "myresume.pdf", value: exp.resume || "" });

  const workForm = el("div", { class: "form-grid" }, [
    field("Domain", domain1, "col-7"),
    field("Experience", years1, "col-5"),
    field("Sub-domain", sub1, "col-12"),
    field("Domain", domain2, "col-7"),
    field("Experience", years2, "col-5"),
    field("Sub-domain", sub2, "col-12"),
  ]);

  const miscForm = el("div", { class: "form-grid mt-24" }, [
    field("LinkedIn", linkedin, "col-6"),
    field("Resume", resume, "col-6"),
  ]);

  const saveBtn = el("button", { class: "btn btn-primary" }, "Save experience");
  saveBtn.addEventListener("click", () => {
    user.profile.experience = {
      domain1: domain1.value.trim(),
      sub1: sub1.value.trim(),
      years1: years1.value,
      domain2: domain2.value.trim(),
      sub2: sub2.value.trim(),
      years2: years2.value,
      linkedin: linkedin.value.trim(),
      resume: resume.value.trim(),
    };
    upsertUser(user);
    showToast("Experience saved", "ok");
  });

  return el("div", { class: "section" }, [
    el("div", { class: "section-title" }, "Work Experience"),
    workForm,
    miscForm,
    el("div", { class: "mt-18" }, saveBtn),
  ]);
}

function yearsOptions(selected) {
  const opts = ["< 1 year", "1-2 years", "2-4 years", "4-7 years", "7+ years"];
  return opts.map((o) => el("option", { value: o, selected: selected === o }, o));
}

function field(labelText, control, colClass = "col-12") {
  return el("div", { class: `field ${colClass}` }, [el("label", {}, labelText), control]);
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard", "ok"));
}

// -------- Render --------
function render() {
  const route = parseHash();
  root.innerHTML = "";
  if (route.name === "users") root.appendChild(UsersListView());
  else if (route.name === "profile") root.appendChild(ProfileView(route.id));
  else root.appendChild(UsersListView());
}

// Startup
if (!window.location.hash) {
  navigate(routes.users);
} else {
  render();
}
