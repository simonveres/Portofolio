import { getFirebaseServices } from "./firebase-client.js";
import { portfolioCollections } from "./portfolio-schema.js";

const dashboard = document.querySelector("#user-dashboard");
const fallbackNotice = document.querySelector("#user-dashboard-fallback");
const overview = document.querySelector("#user-overview");
const collectionView = document.querySelector("#user-collection-view");
const previewView = document.querySelector("#user-wizard-preview");
const designView = document.querySelector("#user-design-customizer");
const entryForm = document.querySelector("#user-entry-form");
const collectionNotice = document.querySelector("#user-collection-notice");
const overviewNotice = document.querySelector("#user-overview-notice");
const designForm = document.querySelector("#design-settings-form");
const designNotice = document.querySelector("#design-notice");
const defaultDesignSettings = {
	template: "default",
	primaryColor: "#0b5e8e",
	secondaryColor: "#073752",
	backgroundColor: "#f3f9fc",
	textColor: "#172033",
	accentColor: "#286a53",
	fontFamily: "Arial",
	buttonStyle: "rounded",
	imageStyle: "rounded",
	navbarStyle: "default",
	animations: true,
	spacing: "normal"
};
const wizardSteps = [
	{ collection: "profiles", label: "Profile / Data Diri", optional: false },
	{ collection: "experiences", label: "Experience", optional: true },
	{ collection: "education", label: "Education", optional: true },
	{ collection: "organizations", label: "Organization", optional: true },
	{ collection: "projects", label: "Projects", optional: true },
	{ collection: "skills", label: "Skills", optional: true },
	{ collection: "certificates", label: "Certificates", optional: true },
	{ collection: "achievements", label: "Achievements", optional: true },
	{ collection: "gallery", label: "Gallery", optional: true },
	{ collection: "publications", label: "Publications", optional: true },
	{ collection: "socials", label: "Social Media", optional: true },
	{ collection: "contacts", label: "Contact", optional: false }
];
const previewStepIndex = wizardSteps.length;
const paymentStepIndex = previewStepIndex + 1;
let activeCollection = "profiles";
let wizardStepIndex = 0;
let currentUser = null;
let userRecord = null;
let services = null;
let recordsByCollection = {};
let userStatusUnsubscribe = null;
let savedDesignSettings = { ...defaultDesignSettings };
let draftDesignSettings = { ...defaultDesignSettings };
let designPreviewReady = false;

function setNotice(target, message, isError = false) {
	if (!target) return;
	target.textContent = message;
	target.classList.toggle("is-error", isError);
}

function showError(error, fallback) {
	console.error(fallback, error);
	return error.code === "permission-denied"
		? "Akses ditolak. Periksa akun atau hubungi admin."
		: fallback;
}

function normalizeDesignSettings(value = {}) {
	const colorPattern = /^#[0-9a-f]{6}$/i;
	const fonts = ["Arial", "Poppins", "Inter", "Montserrat", "Roboto", "Open Sans"];
	const buttonStyles = ["square", "rounded", "pill"];
	const imageStyles = ["square", "rounded", "circle"];
	const navbarStyles = ["default", "sticky", "transparent"];
	const spacings = ["compact", "normal", "spacious"];
	const settings = { ...defaultDesignSettings };
	for (const name of ["primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor"]) {
		if (typeof value[name] === "string" && colorPattern.test(value[name])) settings[name] = value[name];
	}
	if (value.template === "default") settings.template = value.template;
	if (fonts.includes(value.fontFamily)) settings.fontFamily = value.fontFamily;
	if (buttonStyles.includes(value.buttonStyle)) settings.buttonStyle = value.buttonStyle;
	if (imageStyles.includes(value.imageStyle)) settings.imageStyle = value.imageStyle;
	if (navbarStyles.includes(value.navbarStyle)) settings.navbarStyle = value.navbarStyle;
	if (spacings.includes(value.spacing)) settings.spacing = value.spacing;
	if (typeof value.animations === "boolean") settings.animations = value.animations;
	return settings;
}

function updateDesignForm(settings) {
	for (const [name, value] of Object.entries(settings)) {
		const input = designForm.elements.namedItem(name);
		if (input) input.type === "checkbox" ? input.checked = value : input.value = value;
	}
}

function readDesignForm() {
	const settings = {};
	for (const [name, defaultValue] of Object.entries(defaultDesignSettings)) {
		const input = designForm.elements.namedItem(name);
		settings[name] = typeof defaultValue === "boolean" ? input.checked : input.value;
	}
	return normalizeDesignSettings(settings);
}

function applyDesignDraft() {
	draftDesignSettings = readDesignForm();
	const dirty = JSON.stringify(draftDesignSettings) !== JSON.stringify(savedDesignSettings);
	document.querySelector("#design-save-state").textContent = dirty ? "Perubahan belum disimpan" : "Design tersimpan";
	if (!designPreviewReady) return;
	const isDefault = JSON.stringify(draftDesignSettings) === JSON.stringify(defaultDesignSettings);
	document.querySelector("#design-preview-frame").contentWindow.postMessage({
		type: "portfolio-design-preview",
		settings: isDefault ? null : draftDesignSettings
	}, window.location.origin);
}

async function loadDesignSettings() {
	try {
		const firestore = services.firestoreSdk;
		const snapshot = await firestore.getDoc(firestore.doc(services.db, "portfolioSettings", currentUser.uid));
		const data = snapshot.exists() && snapshot.data().userId === currentUser.uid ? snapshot.data() : {};
		savedDesignSettings = normalizeDesignSettings(data);
		draftDesignSettings = { ...savedDesignSettings };
		updateDesignForm(draftDesignSettings);
		document.querySelector("#design-save-state").textContent = snapshot.exists() ? "Design tersimpan" : "Default design";
	} catch (error) {
		savedDesignSettings = { ...defaultDesignSettings };
		draftDesignSettings = { ...defaultDesignSettings };
		updateDesignForm(draftDesignSettings);
		setNotice(designNotice, showError(error, "Pengaturan desain belum dapat dimuat."), true);
	}
}

async function saveDesign(event) {
	event.preventDefault();
	const firestore = services.firestoreSdk;
	const settings = readDesignForm();
	const saveButton = document.querySelector("#save-design-button");
	saveButton.disabled = true;
	setNotice(designNotice, "Menyimpan desain...");
	try {
		await firestore.setDoc(firestore.doc(services.db, "portfolioSettings", currentUser.uid), {
			userId: currentUser.uid,
			...settings,
			updatedAt: firestore.serverTimestamp()
		});
		savedDesignSettings = { ...settings };
		draftDesignSettings = { ...settings };
		applyDesignDraft();
		document.querySelector("#design-save-state").textContent = "Design tersimpan";
		setNotice(designNotice, "Design berhasil disimpan.");
	} catch (error) {
		setNotice(designNotice, showError(error, "Gagal menyimpan design. Perubahan sebelumnya tetap aman."), true);
	} finally {
		saveButton.disabled = false;
	}
}

async function resetDesign() {
	if (!window.confirm("Reset design portfolio ini ke tampilan default? Data portfolio tidak akan dihapus.")) return;
	const resetButton = document.querySelector("#reset-design-button");
	resetButton.disabled = true;
	setNotice(designNotice, "Mereset design...");
	try {
		const firestore = services.firestoreSdk;
		const reference = firestore.doc(services.db, "portfolioSettings", currentUser.uid);
		const snapshot = await firestore.getDoc(reference);
		if (snapshot.exists()) await firestore.deleteDoc(reference);
		savedDesignSettings = { ...defaultDesignSettings };
		draftDesignSettings = { ...defaultDesignSettings };
		updateDesignForm(draftDesignSettings);
		applyDesignDraft();
		document.querySelector("#design-save-state").textContent = "Default design";
		setNotice(designNotice, "Design dikembalikan ke default.");
	} catch (error) {
		setNotice(designNotice, showError(error, "Gagal mereset design."), true);
	} finally {
		resetButton.disabled = false;
	}
}

function statusLabel(status) {
	return ({
		pending: "Pending",
		active: "Active",
		suspended: "Nonaktif",
		unpaid: "Belum dibayar",
		paid: "Paid",
		rejected: "Ditolak",
		draft: "Draft",
		published: "Published"
	})[status] || status || "Belum tersedia";
}

function makeField([name, label, type]) {
	const group = document.createElement("div");
	group.className = "field-group";
	const fieldLabel = document.createElement("label");
	fieldLabel.htmlFor = `user-field-${name}`;
	fieldLabel.textContent = label;
	const input = document.createElement(type === "textarea" ? "textarea" : "input");
	input.id = `user-field-${name}`;
	input.name = name;
	if (["number", "checkbox", "email", "tel", "url", "date"].includes(type)) input.type = type;
	if (type === "required") input.required = true;
	if (type === "textarea") input.rows = 4;
	group.append(fieldLabel, input);
	return group;
}

function dateInputValue(value) {
	if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
	return typeof value === "string" ? value.slice(0, 10) : "";
}

function renderFields(collection, entry = {}) {
	const definition = portfolioCollections[collection];
	const fields = collection === "profiles"
		? [...definition.fields, ["username", "Portfolio username", "required"]]
		: definition.fields;
	const root = document.querySelector("#user-editor-fields");
	root.replaceChildren(...fields.map(makeField));
	if (collection === "profiles") {
		const usernameInput = entryForm.elements.namedItem("username");
		const helper = document.createElement("small");
		helper.className = "field-help";
		helper.setAttribute("role", "status");
		usernameInput.closest(".field-group").append(helper);
		usernameInput.addEventListener("blur", async () => {
			const username = usernameInput.value.trim().toLowerCase();
			usernameInput.value = username;
			if (!slugIsValid(username)) {
				helper.textContent = "Gunakan huruf kecil, angka, atau tanda hubung.";
				return;
			}
			helper.textContent = "Memeriksa username...";
			try {
				const snapshot = await services.firestoreSdk.getDoc(
					services.firestoreSdk.doc(services.db, "usernames", username)
				);
				if (usernameInput.value !== username) return;
				helper.textContent = !snapshot.exists() || snapshot.data().ownerUid === currentUser.uid
					? "Username tersedia."
					: "Username sudah digunakan.";
			} catch {
				helper.textContent = "Username tidak tersedia atau belum dapat diverifikasi.";
			}
		});
	}
	for (const [name, , type] of fields) {
		const input = entryForm.elements.namedItem(name);
		if (!input) continue;
		if (type === "checkbox") input.checked = entry[name] ?? true;
		else if (type === "number") input.value = entry[name] ?? 0;
		else if (type === "date") input.value = dateInputValue(entry[name]);
		else input.value = entry[name] ?? "";
	}
}

function titleOf(entry, collection) {
	return entry.title || entry.name || entry.position || entry.organizationName
		|| entry.institution || entry.platform || entry.company
		|| portfolioCollections[collection].label;
}

function updatedLabel(entry) {
	const date = entry.updatedAt?.toDate?.();
	return date ? `Diperbarui ${date.toLocaleString("id-ID")}` : "Belum diperbarui";
}

function wizardProgressKey() {
	return `portfolioWizardStep:${currentUser.uid}`;
}

function collectionIsComplete(collection) {
	const records = recordsByCollection[collection] || [];
	if (collection === "profiles") return Boolean(records[0]?.name && userRecord?.username);
	if (collection === "contacts") {
		const contact = records[0] || {};
		return Boolean(contact.email || contact.phone || contact.whatsapp || contact.linkedin
			|| contact.instagram || contact.github || contact.website || contact.address);
	}
	return records.length > 0;
}

function persistWizardStep(index) {
	wizardStepIndex = Math.max(0, Math.min(index, paymentStepIndex));
	try {
		localStorage.setItem(wizardProgressKey(), String(wizardStepIndex));
	} catch {
		// Firestore records remain the fallback source for progress.
	}
}

function initialWizardStep() {
	try {
		const storedValue = localStorage.getItem(wizardProgressKey());
		if (storedValue !== null) {
			const stored = Number(storedValue);
			if (Number.isInteger(stored) && stored >= 0 && stored <= paymentStepIndex) return stored;
		}
	} catch {
		// Continue from saved collection data when local storage is unavailable.
	}
	const firstIncomplete = wizardSteps.findIndex((step) => !collectionIsComplete(step.collection));
	return firstIncomplete === -1 ? previewStepIndex : firstIncomplete;
}

function renderWizardIndicator() {
	const root = document.querySelector("#wizard-step-indicator");
	root.replaceChildren(...wizardSteps.map((step, index) => {
		const item = document.createElement("li");
		item.className = "wizard-step-item";
		if (index === wizardStepIndex) item.setAttribute("aria-current", "step");
		const number = document.createElement("span");
		number.className = "wizard-step-number";
		number.textContent = String(index + 1);
		const copy = document.createElement("span");
		copy.className = "wizard-step-copy";
		const label = document.createElement("span");
		label.className = "wizard-step-name";
		label.textContent = step.label;
		const state = document.createElement("small");
		state.className = "wizard-step-state";
		if (collectionIsComplete(step.collection)) state.textContent = "✓ Selesai";
		else if (index < wizardStepIndex && step.optional) state.textContent = "Dilewati";
		else if (index === wizardStepIndex) state.textContent = "Sedang diisi";
		else state.textContent = "Belum diisi";
		copy.append(label, state);
		item.append(number, copy);
		return item;
	}));
}

async function showWizardStep(index, persist = true) {
	if (persist) persistWizardStep(index);
	else wizardStepIndex = index;
	const isCollectionStep = wizardStepIndex < wizardSteps.length;
	collectionView.hidden = !isCollectionStep;
	previewView.hidden = wizardStepIndex !== previewStepIndex;
	designView.hidden = true;
	overview.hidden = wizardStepIndex !== paymentStepIndex;
	document.querySelector("#user-cancel-edit").hidden = wizardStepIndex === 0
		|| wizardStepIndex === wizardSteps.length - 1;
	const progressLabel = document.querySelector("#wizard-progress-label");
	const progressBar = document.querySelector("#wizard-progress-bar");
	progressBar.hidden = !isCollectionStep;
	progressBar.value = Math.min(wizardStepIndex + 1, wizardSteps.length);
	progressLabel.textContent = isCollectionStep
		? `Langkah ${wizardStepIndex + 1} dari ${wizardSteps.length}`
		: wizardStepIndex === previewStepIndex ? "Preview" : "Payment / Publikasi";
	document.querySelectorAll(".wizard-back-button").forEach((button) => {
		button.hidden = wizardStepIndex === 0;
	});

	if (isCollectionStep) {
		const step = wizardSteps[wizardStepIndex];
		activeCollection = step.collection;
		document.querySelector("#wizard-step-label").textContent = step.label.toUpperCase();
		document.querySelector("#wizard-step-description").textContent = step.optional
			? "Lengkapi bagian ini atau lewati untuk melanjutkan."
			: "Bagian penting untuk menyiapkan portfolio kamu.";
		document.querySelector("#wizard-skip-button").hidden = !step.optional;
		const continueLabel = wizardStepIndex === wizardSteps.length - 1
			? "Simpan & Lihat Preview →"
			: "Simpan & Lanjut →";
		document.querySelector("#wizard-continue-button").textContent = continueLabel;
		document.querySelector("#user-save-continue").textContent = continueLabel;
		await loadCollection(step.collection);
		const records = recordsByCollection[step.collection] || [];
		if (!step.optional && !collectionIsComplete(step.collection)) {
			openEditor(records[0] || {}, step.collection);
		}
	} else if (wizardStepIndex === previewStepIndex) {
		const previewUrl = privatePreviewUrl();
		const openLink = document.querySelector("#wizard-preview-open");
		const frame = document.querySelector("#wizard-preview-frame");
		openLink.href = previewUrl.href;
		frame.src = previewUrl.href;
		setNotice(document.querySelector("#wizard-preview-notice"), "Preview privat hanya dapat dibuka oleh akun pemilik.");
	} else {
		await loadOverview();
	}
	renderWizardIndicator();
	window.scrollTo({ top: 0, behavior: "smooth" });
}

async function continueWizard() {
	if (wizardStepIndex >= wizardSteps.length) return;
	const step = wizardSteps[wizardStepIndex];
	if (!entryForm.hidden) {
		entryForm.requestSubmit();
		return;
	}
	if (!step.optional && !collectionIsComplete(step.collection)) {
		const records = recordsByCollection[step.collection] || [];
		openEditor(records[0] || {}, step.collection);
		setNotice(collectionNotice, step.collection === "contacts"
			? "Isi minimal satu informasi kontak sebelum melanjutkan."
			: "Lengkapi dan simpan bagian ini sebelum melanjutkan.", true);
		return;
	}
	await showWizardStep(wizardStepIndex + 1);
}

async function skipWizardStep() {
	const step = wizardSteps[wizardStepIndex];
	if (!step?.optional) return;
	if (!entryForm.hidden && entryForm.dataset.dirty === "true"
		&& !window.confirm("Lewati langkah ini tanpa menyimpan perubahan?")) return;
	entryForm.hidden = true;
	await showWizardStep(wizardStepIndex + 1);
}

async function returnToPreviousWizardStep() {
	if (wizardStepIndex <= 0) return;
	if (!entryForm.hidden && entryForm.dataset.dirty === "true"
		&& !window.confirm("Kembali tanpa menyimpan perubahan pada form ini?")) return;
	entryForm.hidden = true;
	await showWizardStep(wizardStepIndex - 1);
}

async function openDesignCustomizer() {
	collectionView.hidden = true;
	previewView.hidden = true;
	overview.hidden = true;
	designView.hidden = false;
	designPreviewReady = false;
	const frame = document.querySelector("#design-preview-frame");
	const url = privatePreviewUrl({ designPreview: true });
	frame.src = url.href;
	setNotice(designNotice, "Perubahan tampilan berlaku untuk portfolio akun ini saja.");
	applyDesignDraft();
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeDesignCustomizer() {
	const dirty = JSON.stringify(readDesignForm()) !== JSON.stringify(savedDesignSettings);
	if (dirty && !window.confirm("Buang perubahan design yang belum disimpan?")) return;
	if (dirty) {
		draftDesignSettings = { ...savedDesignSettings };
		updateDesignForm(draftDesignSettings);
		applyDesignDraft();
	}
	showWizardStep(wizardStepIndex, false);
}

function handleDesignPreviewMessage(event) {
	const frame = document.querySelector("#design-preview-frame");
	if (event.origin !== window.location.origin || event.source !== frame.contentWindow
		|| event.data?.type !== "portfolio-design-preview-ready") return;
	designPreviewReady = true;
	applyDesignDraft();
}

function renderEntries(entries, collection) {
	const root = document.querySelector("#user-entry-list");
	root.replaceChildren();
	const definition = portfolioCollections[collection];
	document.querySelector("#user-add-entry").hidden = Boolean(definition.single && entries.length);
	if (!entries.length) {
		const empty = document.createElement("p");
		empty.className = "empty-state";
		empty.textContent = "Belum ada data di bagian ini.";
		root.append(empty);
		return;
	}

	for (const entry of entries) {
		const row = document.createElement("article");
		row.className = "entry-row";
		const summary = document.createElement("div");
		const title = document.createElement("h2");
		title.textContent = titleOf(entry, collection);
		const detail = document.createElement("p");
		detail.textContent = entry.company || entry.degree || entry.category || entry.username || entry.description || "";
		const status = document.createElement("span");
		status.className = `entry-status${entry.published === false ? "" : " is-live"}`;
		status.textContent = entry.published === false ? "Draft" : "Published";
		const updated = document.createElement("small");
		updated.className = "entry-updated";
		updated.textContent = updatedLabel(entry);
		summary.append(title, detail, status, updated);
		const actions = document.createElement("div");
		actions.className = "entry-actions";
		const edit = document.createElement("button");
		edit.type = "button";
		edit.className = "button button-quiet";
		edit.textContent = "Edit";
		edit.addEventListener("click", () => openEditor(entry, collection));
		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "button button-danger";
		remove.textContent = "Delete";
		remove.addEventListener("click", () => deleteEntry(entry, collection));
		actions.append(edit, remove);
		row.append(summary, actions);
		root.append(row);
	}
}

async function fetchCollection(collection) {
	const firestore = services.firestoreSdk;
	if (portfolioCollections[collection].single) {
		const snapshot = await firestore.getDoc(firestore.doc(services.db, collection, currentUser.uid));
		return snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : [];
	}
	const snapshot = await firestore.getDocs(firestore.query(
		firestore.collection(services.db, collection),
		firestore.where("userId", "==", currentUser.uid)
	));
	return snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
		.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

async function loadCollection(collection = activeCollection) {
	activeCollection = collection;
	const definition = portfolioCollections[collection];
	document.querySelector("#user-collection-title").textContent = definition.label;
	entryForm.hidden = true;
	document.querySelector("#wizard-continue-button").hidden = false;
	setNotice(collectionNotice, "Memuat data...");
	try {
		const entries = await fetchCollection(collection);
		recordsByCollection[collection] = entries;
		renderEntries(entries, collection);
		setNotice(collectionNotice, "");
	} catch (error) {
		setNotice(collectionNotice, showError(error, "Gagal memuat data."), true);
	}
}

function openEditor(entry = {}, collection = activeCollection) {
	activeCollection = collection;
	entryForm.dataset.collection = collection;
	entryForm.dataset.documentId = entry.id || "";
	entryForm.dataset.dirty = "false";
	document.querySelector("#user-save-add-another").hidden = portfolioCollections[collection].single;
	renderFields(collection, entry);
	entryForm.hidden = false;
	document.querySelector("#wizard-continue-button").hidden = true;
	setNotice(collectionNotice, "");
	entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function slugIsValid(slug) {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

async function saveProfileAndSlug(payload, profileReference) {
	const firestore = services.firestoreSdk;
	const oldUsername = userRecord.username || "";
	const newUsername = String(payload.username || "").trim().toLowerCase();
	if (!slugIsValid(newUsername)) throw new Error("Username harus huruf kecil, angka, atau tanda hubung.");
	payload.username = newUsername;

	const batch = firestore.writeBatch(services.db);
	const userReference = firestore.doc(services.db, "users", currentUser.uid);
	const userUpdate = {
		name: payload.name,
		username: newUsername,
		updatedAt: firestore.serverTimestamp()
	};
	if (newUsername !== oldUsername) {
		batch.set(firestore.doc(services.db, "usernames", newUsername), {
			ownerUid: currentUser.uid,
			createdAt: firestore.serverTimestamp()
		});
		if (oldUsername) batch.delete(firestore.doc(services.db, "usernames", oldUsername));
	}
	batch.update(userReference, userUpdate);
	payload.updatedAt = firestore.serverTimestamp();
	payload.userId = currentUser.uid;
	batch.set(profileReference, payload, { merge: true });
	await batch.commit();
	userRecord = { ...userRecord, ...userUpdate, username: newUsername };
}

async function saveEntry(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const addAnother = event.submitter?.id === "user-save-add-another";
	const collection = form.dataset.collection || activeCollection;
	const definition = portfolioCollections[collection];
	const fields = collection === "profiles"
		? [...definition.fields, ["username", "Portfolio username", "required"]]
		: definition.fields;
	const payload = {};
	for (const [name, , type] of fields) {
		const field = form.elements.namedItem(name);
		if (!field) continue;
		if (type === "checkbox") payload[name] = field.checked;
		else if (type === "number") payload[name] = Number(field.value || 0);
		else payload[name] = field.value.trim();
	}
	payload.published ??= true;
	if (fields.some(([name]) => name === "order")) payload.order ??= 0;
	if (collection === "contacts" && !["email", "phone", "whatsapp", "address", "linkedin", "instagram", "github", "website"]
		.some((name) => String(payload[name] || "").trim())) {
		setNotice(collectionNotice, "Isi minimal satu informasi kontak sebelum melanjutkan.", true);
		return;
	}
	setNotice(collectionNotice, "Menyimpan...");
	const firestore = services.firestoreSdk;
	const reference = definition.single
		? firestore.doc(services.db, collection, currentUser.uid)
		: (form.dataset.documentId
			? firestore.doc(services.db, collection, form.dataset.documentId)
			: firestore.doc(firestore.collection(services.db, collection)));
	try {
		if (collection === "profiles") await saveProfileAndSlug(payload, reference);
		else {
			payload.userId = currentUser.uid;
			payload.updatedAt = firestore.serverTimestamp();
			await firestore.setDoc(reference, payload, { merge: true });
		}
		form.hidden = true;
		form.dataset.dirty = "false";
		if (addAnother && !definition.single) {
			await loadCollection(collection);
			openEditor({}, collection);
			setNotice(collectionNotice, "Data tersimpan. Kamu bisa menambahkan item lain.");
			return;
		}
		setNotice(collectionNotice, "Data tersimpan.");
		await loadOverview();
		if (wizardSteps[wizardStepIndex]?.collection === collection) {
			await showWizardStep(wizardStepIndex + 1);
		} else {
			await loadCollection(collection);
		}
	} catch (error) {
		const message = error.code === "permission-denied"
			? "Username sudah digunakan atau akses tidak diizinkan."
			: showError(error, "Gagal menyimpan data.");
		setNotice(collectionNotice, message, true);
	}
}

async function deleteEntry(entry, collection) {
	if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
	try {
		await services.firestoreSdk.deleteDoc(services.firestoreSdk.doc(services.db, collection, entry.id));
		setNotice(collectionNotice, "Data berhasil dihapus.");
		await loadCollection(collection);
		await loadOverview();
	} catch (error) {
		setNotice(collectionNotice, showError(error, "Gagal menghapus data."), true);
	}
}

async function loadOverview() {
	try {
		const collections = Object.keys(portfolioCollections);
		const [results, platformSettingsResult] = await Promise.all([
			Promise.all(collections.map((name) => fetchCollection(name))),
			loadPlatformSettings().then((settings) => ({ settings }), (error) => ({ error }))
		]);
		recordsByCollection = Object.fromEntries(collections.map((name, index) => [name, results[index]]));
		const profile = recordsByCollection.profiles[0] || {};
		const name = profile.name || userRecord.name || currentUser.email || "Portfolio saya";
		document.querySelector("#user-view-title").textContent = `Selamat datang, ${name}`;
		document.querySelector("#user-account-name").textContent = currentUser.email || "";
		for (const status of ["accountStatus", "paymentStatus", "portfolioStatus"]) {
			const item = document.querySelector(`[data-user-status="${status}"]`);
			item.textContent = statusLabel(userRecord[status]);
			item.dataset.state = userRecord[status] || "";
		}
		const priceNode = document.querySelector("#portfolio-price");
		if (platformSettingsResult.error) {
			priceNode.textContent = "Harga tidak tersedia";
			setNotice(overviewNotice, `Harga publikasi belum tersedia: ${platformSettingsResult.error.message}`, true);
		} else {
			try {
				priceNode.textContent = formatPortfolioPrice(platformSettingsResult.settings);
				setNotice(overviewNotice, "");
			} catch (error) {
				priceNode.textContent = "Harga tidak tersedia";
				setNotice(overviewNotice, `Harga publikasi belum tersedia: ${error.message}`, true);
			}
		}
		renderCompletion(profile);
		renderPortfolioActions(profile);
		const paymentText = ({
			unpaid: "Pembayaran belum dilakukan.",
			pending: "Pembayaran sedang menunggu verifikasi admin.",
			paid: "Pembayaran telah diverifikasi.",
			rejected: "Pembayaran ditolak. Silakan hubungi admin kembali."
		})[userRecord.paymentStatus] || "Lengkapi portfolio kamu, lalu hubungi admin untuk aktivasi.";
		setNotice(document.querySelector("#payment-message"), paymentText);
	} catch (error) {
		setNotice(overviewNotice, showError(error, "Gagal memuat portfolio."), true);
	}
}

function renderCompletion(profile) {
	const sections = [
		["Profile", Boolean(profile.name && profile.headline && profile.bio)],
		["Education", recordsByCollection.education.length > 0],
		["Experience", recordsByCollection.experiences.length > 0],
		["Skills", recordsByCollection.skills.length > 0],
		["Projects", recordsByCollection.projects.length > 0],
		["Certificates", recordsByCollection.certificates.length > 0],
		["Achievements", recordsByCollection.achievements.length > 0],
		["Gallery", recordsByCollection.gallery.length > 0]
	];
	const completed = sections.filter(([, done]) => done).length;
	const percentage = Math.round((completed / sections.length) * 100);
	document.querySelector("#completion-label").textContent = `${percentage}%`;
	document.querySelector("#completion-progress").value = percentage;
	const root = document.querySelector("#completion-sections");
	root.replaceChildren(...sections.map(([label, done]) => {
		const row = document.createElement("div");
		row.className = "completion-item";
		const name = document.createElement("span");
		name.textContent = label;
		const mark = document.createElement("strong");
		mark.textContent = done ? "Selesai" : "Belum diisi";
		row.append(name, mark);
		return row;
	}));
}

function publicPortfolioUrl(username) {
	const url = new URL("../portfolio.html", window.location.href);
	url.searchParams.set("username", username);
	return url.href;
}

function privatePreviewUrl({ designPreview = false } = {}) {
	const profile = recordsByCollection.profiles?.[0] || {};
	const username = userRecord.username || profile.username || "";
	const url = new URL("../portfolio.html", window.location.href);
	if (username) url.searchParams.set("username", username);
	else url.searchParams.set("uid", currentUser.uid);
	url.searchParams.set("preview", "1");
	if (designPreview) url.searchParams.set("designPreview", "1");
	return url;
}

async function loadPlatformSettings() {
	const firestore = services.firestoreSdk;
	const snapshot = await firestore.getDoc(firestore.doc(services.db, "settings", "platform"));
	if (!snapshot.exists()) throw new Error("Dokumen settings/platform belum dibuat oleh admin.");
	return snapshot.data();
}

function formatPortfolioPrice(settings, { compact = false } = {}) {
	if (!Number.isFinite(settings?.portfolioPrice)) {
		throw new Error("Field portfolioPrice belum diatur sebagai angka di settings/platform.");
	}
	if (typeof settings.currency !== "string" || !settings.currency.trim()) {
		throw new Error("Field currency belum diatur di settings/platform.");
	}
	const currency = settings.currency.trim();
	if (!/^[A-Z]{3}$/.test(currency)) {
		const amount = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(settings.portfolioPrice);
		return `${currency}${compact ? "" : " "}${amount}`;
	}
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency,
		maximumFractionDigits: 0
	}).format(settings.portfolioPrice);
}

function renderPortfolioActions(profile) {
	const username = userRecord.username || profile.username || "";
	const preview = document.querySelector("#preview-portfolio-link");
	preview.href = privatePreviewUrl().href;
	preview.setAttribute("aria-disabled", "false");
	document.querySelector("#user-preview-shortcut").href = preview.href;

	const published = userRecord.portfolioStatus === "published" && Boolean(username);
	const active = userRecord.accountStatus === "active"
		&& userRecord.paymentStatus === "paid"
		&& published;
	const publishButton = document.querySelector("#publish-portfolio-button");
	publishButton.textContent = active ? "Portfolio Aktif" : "Publikasi oleh Admin";
	publishButton.disabled = true;
	const whatsappButton = document.querySelector("#pay-whatsapp-button");
	whatsappButton.hidden = !["unpaid", "rejected"].includes(userRecord.paymentStatus);
	const copy = document.querySelector("#copy-portfolio-link");
	const share = document.querySelector("#share-portfolio-link");
	const linkDisplay = document.querySelector("#portfolio-link-display");
	copy.hidden = !published;
	share.hidden = !published;
	linkDisplay.hidden = !published;
	if (!published) return;
	const link = publicPortfolioUrl(username);
	linkDisplay.replaceChildren();
	const publicLink = document.createElement("a");
	publicLink.href = link;
	publicLink.textContent = link;
	publicLink.target = "_blank";
	publicLink.rel = "noopener noreferrer";
	linkDisplay.append(publicLink);
	copy.onclick = async () => {
		await navigator.clipboard.writeText(link);
		setNotice(overviewNotice, "Link portfolio berhasil disalin.");
	};
	share.onclick = async () => {
		if (navigator.share) await navigator.share({ title: `${profile.name} | Portfolio`, url: link });
		else {
			await navigator.clipboard.writeText(link);
			setNotice(overviewNotice, "Link portfolio berhasil disalin.");
		}
	};
}

async function requestPayment() {
	let whatsappWindow;
	try {
		if (!["unpaid", "rejected"].includes(userRecord.paymentStatus)) {
			setNotice(overviewNotice, userRecord.paymentStatus === "pending"
				? "Pembayaran sedang menunggu verifikasi admin."
				: "Pembayaran telah diverifikasi.");
			return;
		}
		whatsappWindow = window.open("about:blank", "_blank");
		if (whatsappWindow) whatsappWindow.opener = null;
		const config = await loadPlatformSettings();
		let number = String(config.whatsappNumber || "").replace(/\D/g, "");
		if (!number) {
			whatsappWindow?.close();
			setNotice(overviewNotice, "WhatsApp admin belum diatur.", true);
			return;
		}
		if (number.startsWith("0")) number = `62${number.slice(1)}`;
		if (!/^\d{8,15}$/.test(number)) {
			whatsappWindow?.close();
			setNotice(overviewNotice, "Nomor WhatsApp admin di settings/platform tidak valid.", true);
			return;
		}
		const profile = recordsByCollection.profiles?.[0] || {};
		const priceText = formatPortfolioPrice(config, { compact: true });
		const message = [
			"Halo Admin, saya ingin melakukan pembayaran untuk publikasi portfolio saya.",
			`Nama: ${profile.name || userRecord.name || ""}`,
			`Username: ${userRecord.username || profile.username || ""}`,
			`Email: ${currentUser.email || ""}`,
			`Harga Publikasi: ${priceText}`,
			"",
			"Saya ingin melakukan pembayaran untuk mengaktifkan dan mempublikasikan portfolio saya.",
			"",
			"Mohon informasi pembayaran selanjutnya.",
			"",
			"Terima kasih."
		].join("\n");
		setNotice(document.querySelector("#payment-message"), "WhatsApp terbuka. Status pembayaran tetap belum dibayar sampai diverifikasi admin.");
		if (whatsappWindow) whatsappWindow.location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
		else window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
	} catch (error) {
		whatsappWindow?.close();
		setNotice(overviewNotice, showError(error, "Tidak dapat menghubungi admin saat ini."), true);
	}
}

async function ensureUserRecord(user) {
	const firestore = services.firestoreSdk;
	const reference = firestore.doc(services.db, "users", user.uid);
	let snapshot = await firestore.getDoc(reference);
	if (!snapshot.exists()) {
		const timestamp = firestore.serverTimestamp();
		await firestore.setDoc(reference, {
			uid: user.uid,
			email: user.email || "",
			name: "",
			username: "",
			role: "user",
			accountStatus: "pending",
			paymentStatus: "unpaid",
			portfolioStatus: "draft",
			createdAt: timestamp,
			updatedAt: timestamp
		});
		snapshot = await firestore.getDoc(reference);
	}
	return snapshot.data();
}

async function initializeForUser(user) {
	currentUser = user;
	if (await (async () => {
		const admin = await services.firestoreSdk.getDoc(services.firestoreSdk.doc(services.db, "admins", user.uid));
		return admin.exists() && admin.data().active === true;
	})()) {
		window.location.replace("../admin/dashboard.html");
		return;
	}
	userRecord = await ensureUserRecord(user);
	if (userRecord.role !== "user") {
		await services.authSdk.signOut(services.auth);
		window.location.replace("../login.html");
		return;
	}
	document.querySelector("#user-preview-shortcut").href = privatePreviewUrl().href;
	await loadDesignSettings();
	dashboard.hidden = false;
	fallbackNotice.hidden = true;
	await loadOverview();
	await showWizardStep(initialWizardStep());
	userStatusUnsubscribe?.();
	userStatusUnsubscribe = services.firestoreSdk.onSnapshot(
		services.firestoreSdk.doc(services.db, "users", user.uid),
		(snapshot) => {
			if (!snapshot.exists()) return;
			userRecord = snapshot.data();
			loadOverview();
		},
		(error) => setNotice(overviewNotice, showError(error, "Status akun tidak dapat diperbarui."), true)
	);
}

async function start() {
	try {
		services = await getFirebaseServices();
	} catch (error) {
		setNotice(fallbackNotice, "Tidak dapat memuat Firebase. Coba lagi nanti.", true);
		return;
	}

	document.querySelector("#user-add-entry").addEventListener("click", () => openEditor({}, activeCollection));
	document.querySelector("#user-cancel-edit").addEventListener("click", () => {
		if (entryForm.dataset.dirty === "true" && !window.confirm("Batalkan perubahan yang belum disimpan?")) return;
		entryForm.hidden = true;
		entryForm.dataset.dirty = "false";
		document.querySelector("#wizard-continue-button").hidden = false;
	});
	entryForm.addEventListener("input", () => { entryForm.dataset.dirty = "true"; });
	entryForm.addEventListener("change", () => { entryForm.dataset.dirty = "true"; });
	entryForm.addEventListener("submit", saveEntry);
	document.querySelector("#wizard-continue-button").addEventListener("click", continueWizard);
	document.querySelector("#wizard-skip-button").addEventListener("click", skipWizardStep);
	document.querySelector("#wizard-back-button").addEventListener("click", returnToPreviousWizardStep);
	document.querySelector("#wizard-preview-back").addEventListener("click", returnToPreviousWizardStep);
	document.querySelector("#wizard-preview-continue").addEventListener("click", () => showWizardStep(paymentStepIndex));
	document.querySelector("#payment-back-button").addEventListener("click", returnToPreviousWizardStep);
	document.querySelector("#open-design-customizer").addEventListener("click", openDesignCustomizer);
	document.querySelector("#close-design-customizer").addEventListener("click", closeDesignCustomizer);
	designForm.addEventListener("input", applyDesignDraft);
	designForm.addEventListener("change", applyDesignDraft);
	designForm.addEventListener("submit", saveDesign);
	document.querySelector("#reset-design-button").addEventListener("click", resetDesign);
	window.addEventListener("message", handleDesignPreviewMessage);
	document.querySelector("#pay-whatsapp-button").addEventListener("click", requestPayment);
	for (const button of document.querySelectorAll("#user-logout, #user-sidebar-logout")) {
		button.addEventListener("click", async () => {
			userStatusUnsubscribe?.();
			await services.authSdk.signOut(services.auth);
			window.location.replace("../login.html");
		});
	}
	services.authSdk.onAuthStateChanged(services.auth, (user) => {
		if (!user) {
			window.location.replace("../login.html");
			return;
		}
		initializeForUser(user).catch((error) => {
			setNotice(fallbackNotice, showError(error, "Akun tidak dapat dimuat."), true);
		});
	});
}

start();
