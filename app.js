import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = (selector) => document.querySelector(selector);
const grid = $("#materialGrid");
const modal = $("#adminModal");
const loginForm = $("#loginForm");
const workspace = $("#adminWorkspace");
const loginMessage = $("#loginMessage");
const formMessage = $("#formMessage");

const labels = {
  articles:"СТАТЬЯ", bestiary:"БЕСТИАРИЙ", characters:"ПЕРСОНАЖИ", locations:"ЛОКАЦИИ",
  anomalies:"АНОМАЛИИ", items:"ПРЕДМЕТЫ", factions:"ФРАКЦИИ", rules:"ПРАВИЛА",
  news:"НОВОСТИ", updates:"ОБНОВЛЕНИЯ"
};
let materials = [];
let filter = "all";
let isAdmin = false;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function formatDate(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toLocaleDateString("ru-RU",{day:"2-digit",month:"long",year:"numeric"}) : "ДАТА НЕ УКАЗАНА";
}
function render() {
  const visible = materials.filter(item => (isAdmin || item.published === true) && (filter === "all" || item.category === filter));
  if (!visible.length) {
    grid.innerHTML = `<div class="empty-state"><b>АРХИВ ПОКА ПУСТ</b><p>Материалы появятся здесь после публикации администрацией.</p></div>`;
    return;
  }
  grid.innerHTML = visible.map(item => `
    <article class="material-card">
      <div class="card-image" ${item.imageUrl ? `style="background-image:url('${escapeHTML(item.imageUrl)}')"` : ""}>
        <span class="card-tag">${escapeHTML(labels[item.category] || "АРХИВ")}</span>
        ${item.published !== true ? '<span class="draft-tag">ЧЕРНОВИК</span>' : ""}
      </div>
      <div class="card-copy">
        <div class="card-date">${escapeHTML(formatDate(item.createdAt))}</div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.summary || (item.body || "").slice(0,150))}</p>
        <button class="read-more" data-open="${escapeHTML(item.id)}">ЧИТАТЬ ДОСЬЕ ↗</button>
        ${isAdmin ? `<button class="delete-material" data-delete="${escapeHTML(item.id)}">УДАЛИТЬ</button>` : ""}
      </div>
    </article>`).join("");
  grid.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => {
    const item = materials.find(entry => entry.id === button.dataset.open);
    if (item) showDetail(item);
  }));
  grid.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("Удалить материал из архива?")) return;
    try { await deleteDoc(doc(db,"materials",button.dataset.delete)); await loadMaterials(); }
    catch (error) { alert("Не удалось удалить материал: " + error.message); }
  }));
}
function showDetail(item) {
  $("#detailContent").innerHTML = `
    ${item.imageUrl ? `<img class="detail-image" src="${escapeHTML(item.imageUrl)}" alt="">` : ""}
    <div class="eyebrow">${escapeHTML(labels[item.category] || "АРХИВ")} / ${escapeHTML(formatDate(item.createdAt))}</div>
    <h2>${escapeHTML(item.title)}</h2><p class="detail-summary">${escapeHTML(item.summary || "")}</p>
    <div class="detail-body">${escapeHTML(item.body || "").replace(/
/g,"<br>")}</div>`;
  $("#detailModal").classList.remove("hidden");
}
async function loadMaterials() {
  $("#status").textContent = "SYNCING";
  try {
    const materialsQuery = isAdmin
      ? query(collection(db,"materials"),orderBy("createdAt","desc"))
      : query(collection(db,"materials"),where("published","==",true),orderBy("createdAt","desc"));
    const snapshot = await getDocs(materialsQuery);
    materials = snapshot.docs.map(item => ({id:item.id,...item.data()}));
    $("#status").textContent = "ONLINE";
    render();
  } catch (error) {
    console.error(error);
    $("#status").textContent = "ERROR";
    grid.innerHTML = `<div class="empty-state"><b>АРХИВ НЕДОСТУПЕН</b><p>Проверь Firestore и правила безопасности. Подробности — в README.md.</p></div>`;
  }
}
async function isAllowedAdmin(user) {
  if (!user) return false;
  try {
    const adminDoc = await getDoc(doc(db,"admins",user.uid));
    return adminDoc.exists() && adminDoc.data().enabled === true;
  } catch (error) { console.error("Admin check:",error); return false; }
}
function updateAdminUI(user, allowed) {
  isAdmin = allowed;
  loginForm.classList.toggle("hidden",!!user);
  workspace.classList.toggle("hidden",!(user && allowed));
  if (user && allowed) $("#adminEmail").textContent = user.email || user.uid;
  if (user && !allowed) {
    loginMessage.textContent = "Вход выполнен, но аккаунту не выданы права администратора. Следуй шагу 4 в README.md.";
    loginMessage.className = "form-message error";
  } else {
    loginMessage.textContent = "";
    loginMessage.className = "form-message";
  }
  render();
}
onAuthStateChanged(auth, async user => {
  const allowed = await isAllowedAdmin(user);
  updateAdminUI(user,allowed);
  await loadMaterials();
});

$("#adminOpen").addEventListener("click",() => { modal.classList.add("visible"); modal.setAttribute("aria-hidden","false"); });
$("#modalClose").addEventListener("click",closeAdmin);
modal.addEventListener("click",event => { if(event.target === modal) closeAdmin(); });
function closeAdmin(){ modal.classList.remove("visible"); modal.setAttribute("aria-hidden","true"); }
$("#detailClose").addEventListener("click",() => $("#detailModal").classList.add("hidden"));
$("#detailModal").addEventListener("click",event => { if(event.target.id === "detailModal") $("#detailModal").classList.add("hidden"); });

loginForm.addEventListener("submit",async event => {
  event.preventDefault();
  loginMessage.textContent = "Проверка учётной записи...";
  loginMessage.className = "form-message";
  try {
    await signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);
    $("#password").value = "";
  } catch (error) {
    loginMessage.textContent = friendlyAuthError(error.code);
    loginMessage.className = "form-message error";
  }
});
function friendlyAuthError(code){
  const messages = {
    "auth/invalid-credential":"Неверный email или пароль.",
    "auth/user-not-found":"Аккаунт не найден.",
    "auth/too-many-requests":"Слишком много попыток. Попробуй позже.",
    "auth/invalid-email":"Проверь правильность email.",
    "auth/network-request-failed":"Проблема с подключением к сети."
  };
  return messages[code] || "Не удалось войти. Проверь настройки Firebase Authentication.";
}
$("#logoutBtn").addEventListener("click",() => signOut(auth));

$("#materialForm").addEventListener("submit",async event => {
  event.preventDefault();
  if (!auth.currentUser || !isAdmin) { formMessage.textContent = "Нет прав администратора."; return; }
  const submit = event.submitter;
  submit.disabled = true;
  formMessage.textContent = "Сохранение материала...";
  formMessage.className = "form-message";
  try {
    const file = $("#imageFile").files[0];
    let imageUrl = "";
    if (file) {
      if (file.size > 5 * 1024 * 1024) throw new Error("Изображение должно быть меньше 5 МБ.");
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Поддерживаются JPG, PNG и WEBP.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const imageRef = ref(storage,`materials/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
      await uploadBytes(imageRef,file,{contentType:file.type});
      imageUrl = await getDownloadURL(imageRef);
    }
    await addDoc(collection(db,"materials"),{
      category:$("#category").value,
      title:$("#title").value.trim(),
      summary:$("#summary").value.trim(),
      body:$("#body").value.trim(),
      imageUrl,
      published:$("#published").checked,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp(),
      authorUid:auth.currentUser.uid
    });
    $("#materialForm").reset();
    $("#published").checked = true;
    formMessage.textContent = "Материал сохранён.";
    formMessage.className = "form-message success";
    await loadMaterials();
  } catch (error) {
    console.error(error);
    formMessage.textContent = "Ошибка: " + error.message;
    formMessage.className = "form-message error";
  } finally { submit.disabled = false; }
});

function setFilter(nextFilter) {
  filter = nextFilter;
  $("#filters").querySelectorAll(".filter").forEach(item =>
    item.classList.toggle("active", item.dataset.filter === filter)
  );
  render();
}

$("#filters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  setFilter(button.dataset.filter);
});

const navFilters = {
  "#encyclopedia": "all",
  "#bestiary": "bestiary",
  "#characters": "characters",
  "#locations": "locations",
  "#anomalies": "anomalies",
  "#news": "news",
  "#updates": "updates"
};

$("#mobileMenu").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
$("#mainNav").querySelectorAll("a").forEach(link => link.addEventListener("click", event => {
  $("#mainNav").classList.remove("open");
  const targetFilter = navFilters[link.getAttribute("href")];
  if (targetFilter) {
    event.preventDefault();
    history.replaceState(null, "", link.getAttribute("href"));
    setFilter(targetFilter);
    $("#content").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}));
loadMaterials();
