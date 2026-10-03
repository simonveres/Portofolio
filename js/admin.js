const config = window.PORTFOLIO_SUPABASE;
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginNotice = document.querySelector("#login-notice");
const dashboardNotice = document.querySelector("#dashboard-notice");
const collectionSelect = document.querySelector("#collection-select");
const collectionTitle = document.querySelector("#collection-title");
const entryList = document.querySelector("#entry-list");
const entryForm = document.querySelector("#entry-form");
const editorFields = document.querySelector("#editor-fields");
const imageUpload = document.querySelector("#image-upload");

const collections = {
	profiles: {
		label: "Profile",
		single: true,
		fields: [
			["full_name", "Full name"], ["headline", "Headline"], ["location", "Location"],
			["gpa", "GPA"], ["university", "University"], ["focus", "Focus"],
			["bio", "Bio", "textarea"], ["photo_url", "Profile photo URL"], ["cv_url", "CV URL"]
		]
	},
	experiences: { label: "Experience", fields: commonFields() },
	organizations: { label: "Organization", fields: commonFields() },
	projects: { label: "Projects", fields: commonFields() },
	gallery_items: { label: "Gallery", fields: commonFields() },
	certificates: { label: "Certificates", fields: commonFields() },
	achievements: { label: "Achievements", fields: commonFields() },
	education: { label: "Education", fields: commonFields() },
	publications: { label: "Publications", fields: commonFields() },
	skills: { label: "Skills", fields: commonFields() },
	social_links: { label: "Social media", fields: commonFields() }
};

function commonFields() {
	return [
		["title", "Title", "required"], ["subtitle", "Subtitle"],
		["organization", "Organization / issuer"], ["period", "Date or period"],
		["description", "Description", "textarea"], ["details", "Details (JSON array)", "json"],
		["image_url", "Image URL"], ["link_url", "Link URL"],
		["sort_order", "Display order", "number"], ["is_published", "Published", "checkbox"]
	];
}

let supabaseClient;
let currentEntryId = null;

function setNotice(target, message, isError = false) {
	target.textContent = message;
	target.classList.toggle("is-error", isError);
}

function setAuthenticated(user) {
	loginPanel.hidden = Boolean(user);
	dashboard.hidden = !user;
	if (user) {
		document.querySelector("#account-email").textContent = user.email;
		if (window.location.hash !== "#dashboard") window.location.hash = "dashboard";
		loadEntries();
	} else if (window.location.hash === "#dashboard") {
		window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
	}
}

function createField([name, label, type]) {
	const wrapper = document.createElement("div");
	wrapper.className = "field-group";
	const fieldLabel = document.createElement("label");
	fieldLabel.htmlFor = `field-${name}`;
	fieldLabel.textContent = label;
	const input = type === "textarea" || type === "json"
		? document.createElement("textarea")
		: document.createElement("input");
	input.id = `field-${name}`;
	input.name = name;
	if (type === "checkbox") input.type = "checkbox";
	if (type === "number") input.type = "number";
	if (type === "required") input.required = true;
	if (type === "json") {
		input.rows = 5;
		input.placeholder = '["Responsibility one", "Responsibility two"]';
	}
	if (type === "textarea") input.rows = 4;
	wrapper.append(fieldLabel, input);
	return wrapper;
}

function renderFields(collection, entry = {}) {
	const definition = collections[collection];
	editorFields.replaceChildren(...definition.fields.map(createField));
	for (const [name] of definition.fields) {
		const input = entryForm.elements.namedItem(name);
		if (!input) continue;
		if (name === "details") {
			input.value = JSON.stringify(entry[name] ?? [], null, 2);
		} else if (name === "is_published") {
			input.checked = entry[name] ?? true;
		} else {
			input.value = entry[name] ?? (name === "sort_order" ? "0" : "");
		}
	}
}

function renderEntryList(entries, collection) {
	entryList.replaceChildren();
	if (!entries.length) {
		const empty = document.createElement("p");
		empty.className = "empty-state";
		empty.textContent = "Belum ada konten di kategori ini.";
		entryList.append(empty);
		return;
	}
	for (const entry of entries) {
		const row = document.createElement("article");
		row.className = "entry-row";
		const summary = document.createElement("div");
		const title = document.createElement("h2");
		title.textContent = entry.title || entry.full_name || "Profile";
		const detail = document.createElement("p");
		detail.textContent = entry.subtitle || entry.organization || entry.headline || entry.location || "";
		const status = document.createElement("span");
		status.className = entry.is_published ? "entry-status is-live" : "entry-status";
		status.textContent = entry.is_published ? "Published" : "Draft";
		const actions = document.createElement("div");
		actions.className = "entry-actions";
		const editButton = document.createElement("button");
		editButton.type = "button";
		editButton.className = "button button-quiet";
		editButton.textContent = "Edit";
		editButton.addEventListener("click", () => openEditor(entry, collection));
		actions.append(editButton);
		if (!collections[collection].single) {
			const deleteButton = document.createElement("button");
			deleteButton.type = "button";
			deleteButton.className = "button button-danger";
			deleteButton.textContent = "Delete";
			deleteButton.addEventListener("click", () => deleteEntry(entry.id, collection));
			actions.append(deleteButton);
		}
		summary.append(title, detail, status);
		row.append(summary, actions);
		entryList.append(row);
	}
}

async function loadEntries() {
	const collection = collectionSelect.value;
	collectionTitle.textContent = collections[collection].label;
	entryForm.hidden = true;
	setNotice(dashboardNotice, "Loading...");
	let query = supabaseClient.from(collection).select("*");
	if (collection !== "profiles") query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
	else query = query.order("id", { ascending: true });
	const { data, error } = await query;
	if (error) {
		setNotice(dashboardNotice, error.message, true);
		return;
	}
	setNotice(dashboardNotice, "");
	renderEntryList(data || [], collection);
}

function openEditor(entry = {}, collection = collectionSelect.value) {
	currentEntryId = entry.id || null;
	renderFields(collection, entry);
	imageUpload.value = "";
	entryForm.hidden = false;
	setNotice(dashboardNotice, "");
	entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function uploadImage(file) {
	if (!file) return "";
	if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
		throw new Error("Pilih gambar valid dengan ukuran maksimum 10 MB.");
	}
	const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
	const path = `${crypto.randomUUID()}-${safeName}`;
	const { error } = await supabaseClient.storage.from("portfolio-media").upload(path, file, {
		cacheControl: "3600",
		upsert: false
	});
	if (error) throw error;
	return supabaseClient.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
}

async function saveEntry(event) {
	event.preventDefault();
	const collection = collectionSelect.value;
	const payload = {};
	for (const [name, , type] of collections[collection].fields) {
		const input = entryForm.elements.namedItem(name);
		if (!input) continue;
		if (type === "checkbox") payload[name] = input.checked;
		else if (type === "number") payload[name] = Number(input.value || 0);
		else if (type === "json") {
			try {
				payload[name] = JSON.parse(input.value || "[]");
			} catch {
				setNotice(dashboardNotice, "Details harus berupa JSON yang valid.", true);
				return;
			}
		} else payload[name] = input.value.trim();
	}
	setNotice(dashboardNotice, "Saving...");
	try {
		const uploadedUrl = await uploadImage(imageUpload.files[0]);
		if (uploadedUrl) {
			if (collection === "profiles") payload.photo_url = uploadedUrl;
			else payload.image_url = uploadedUrl;
		}
		if (collection === "profiles") payload.id = "main";
		let query = supabaseClient.from(collection);
		if (currentEntryId || collections[collection].single) {
			const id = collection === "profiles" ? "main" : currentEntryId;
			const { error } = await query.upsert({ ...payload, ...(id ? { id } : {}) });
			if (error) throw error;
		} else {
			const { error } = await query.insert(payload);
			if (error) throw error;
		}
		entryForm.hidden = true;
		setNotice(dashboardNotice, "Changes saved.");
		await loadEntries();
	} catch (error) {
		setNotice(dashboardNotice, error.message || "Could not save this entry.", true);
	}
}

async function deleteEntry(id, collection) {
	if (!window.confirm("Delete this entry? This cannot be undone.")) return;
	const { error } = await supabaseClient.from(collection).delete().eq("id", id);
	if (error) setNotice(dashboardNotice, error.message, true);
	else await loadEntries();
}

const legacyPages = {
	experiences: ["experience.html", ".experience-section .about-grid > article"],
	organizations: ["organization.html", ".organization-section .about-grid > article"],
	projects: ["projects.html", ".project-feature"],
	gallery_items: ["gallery.html", ".gallery-grid > article"],
	certificates: ["certificates.html", ".certificate-section .about-grid > article"],
	achievements: ["achievements.html", ".organization-section .about-grid > article"],
	education: ["education.html", ".timeline-card"],
	publications: ["publications.html", ".publication-card"],
	skills: ["skills.html", ".skills-panel"],
	social_links: ["social-media.html", ".social-grid > a"]
};

function pageUrl(page) {
	return new URL(`../pages/${page}`, window.location.href);
}

async function fetchLegacyPage(page) {
	const response = await fetch(pageUrl(page));
	if (!response.ok) throw new Error(`Could not read ${page}.`);
	return new DOMParser().parseFromString(await response.text(), "text/html");
}

function legacyAssetUrl(page, value) {
	if (!value) return "";
	try {
		return new URL(value, pageUrl(page)).href;
	} catch {
		return "";
	}
}

function legacyEntry(node, index, page, collection) {
	const title = node.querySelector("h3, h2, .social-copy strong")?.textContent.trim() || "";
	const description = node.querySelector(".gallery-copy p, .publication-description, .timeline-card p, .project-content > p, p")?.textContent.trim() || "";
	const image = node.querySelector("img");
	const documentLink = node.querySelector(".certificate-link, .certificate-file, .certificate-preview");
	const firstUrl = documentLink?.getAttribute("href") || image?.getAttribute("src") || "";
	const details = [...node.querySelectorAll("ul li")].map((item) => item.textContent.trim()).filter(Boolean);
	return {
		title,
		subtitle: node.querySelector("h4")?.textContent.trim() || node.querySelector(".social-copy > span")?.textContent.trim() || "",
		organization: node.querySelector(".project-content h4")?.textContent.trim() || "",
		period: node.querySelector(".timeline-year")?.textContent.trim() || node.querySelector(".project-kicker")?.textContent.trim() || "",
		description,
		details,
		image_url: legacyAssetUrl(page, image?.getAttribute("src") || (collection === "gallery_items" ? firstUrl : "")),
		link_url: legacyAssetUrl(page, firstUrl),
		sort_order: index + 1,
		is_published: true
	};
}

async function importLegacyCollection(collection) {
	const { data: existing, error: readError } = await supabaseClient.from(collection).select("id").limit(1);
	if (readError) throw readError;
	if (existing.length) return `${collections[collection].label}: skipped (already has data)`;
	const [page, selector] = legacyPages[collection];
	const document = await fetchLegacyPage(page);
	let entries;
	if (collection === "skills") {
		entries = [...document.querySelectorAll(selector)].flatMap((panel) => {
			const group = panel.querySelector("h2")?.textContent.trim() || "Skills";
			return [...panel.querySelectorAll(".skills-list li")].map((item, index) => ({
				title: item.textContent.trim(), subtitle: group, organization: "", period: "",
				description: "", details: [], image_url: "", link_url: "",
				sort_order: index + 1, is_published: true
			}));
		});
	} else if (collection === "social_links") {
		entries = [...document.querySelectorAll(selector)].map((node, index) => ({
			title: node.querySelector("strong")?.textContent.trim() || "Social link",
			subtitle: node.querySelector(".social-copy > span")?.textContent.trim() || "",
			organization: node.querySelector("small")?.textContent.trim() || "",
			period: "", description: "", details: [],
			image_url: legacyAssetUrl(page, node.querySelector(".social-icon img")?.getAttribute("src")),
			link_url: legacyAssetUrl(page, node.getAttribute("href")),
			sort_order: index + 1, is_published: true
		}));
	} else {
		entries = [...document.querySelectorAll(selector)].map((node, index) => legacyEntry(node, index, page, collection));
	}
	entries = entries.filter((entry) => entry.title);
	if (!entries.length) return `${collections[collection].label}: no content found`;
	const { error } = await supabaseClient.from(collection).insert(entries);
	if (error) throw error;
	return `${collections[collection].label}: imported ${entries.length}`;
}

async function importLegacyPortfolio() {
	if (!window.confirm("Import the existing static portfolio into empty database collections? Existing database entries will not be overwritten.")) return;
	const importButton = document.querySelector("#import-content-button");
	importButton.disabled = true;
	const results = [];
	try {
		const [home, about] = await Promise.all([fetchLegacyPage("../index.html"), fetchLegacyPage("about.html")]);
		const heroValues = [...home.querySelectorAll(".hero-info > div span")].map((node) => node.textContent.trim());
		const name = home.querySelector("[data-profile-name]")?.textContent.replace(/\s+/g, " ").trim();
		const profile = {
			id: "main",
			full_name: name || "Simon Veres Sianturi",
			headline: home.querySelector(".hero-description")?.textContent.trim() || "",
			location: home.querySelector(".profile-tag strong")?.textContent.trim() || "",
			gpa: heroValues[0] || "",
			university: heroValues[1] || "",
			focus: heroValues[2] || "",
			bio: [...about.querySelectorAll(".about-content > p")].map((paragraph) => paragraph.textContent.trim()).filter(Boolean).join(" "),
			photo_url: legacyAssetUrl("../index.html", home.querySelector(".profile-photo img")?.getAttribute("src")),
			cv_url: legacyAssetUrl("../index.html", home.querySelector(".btn-cv")?.getAttribute("href")),
			is_published: true
		};
		const { data: currentProfile, error: profileReadError } = await supabaseClient.from("profiles").select("*").eq("id", "main").maybeSingle();
		if (profileReadError) throw profileReadError;
		const profileIsDefault = currentProfile && currentProfile.full_name === "Simon Veres Sianturi" &&
			currentProfile.location === "Indonesia" && !currentProfile.headline && !currentProfile.gpa &&
			!currentProfile.university && !currentProfile.focus && !currentProfile.bio &&
			!currentProfile.photo_url && !currentProfile.cv_url;
		if (!currentProfile || profileIsDefault) {
			const { error: profileError } = await supabaseClient.from("profiles").upsert(profile);
			if (profileError) throw profileError;
			results.push("Profile: imported");
		} else {
			results.push("Profile: skipped (already edited)");
		}
		for (const collection of Object.keys(legacyPages)) {
			try {
				results.push(await importLegacyCollection(collection));
			} catch (error) {
				results.push(`${collections[collection].label}: ${error.message}`);
			}
		}
		const importedCount = results.filter((result) => result.includes("imported")).length;
		setNotice(dashboardNotice, `Import finished: ${importedCount} collection(s) imported. Existing data was left unchanged.`);
		await loadEntries();
	} catch (error) {
		setNotice(dashboardNotice, error.message || "Portfolio import failed.", true);
	} finally {
		importButton.disabled = false;
	}
}

if (!config?.url || !config?.anonKey) {
	setNotice(loginNotice, "Konfigurasi URL project atau publishable key belum tersedia di js/supabase-config.js.", true);
	} else if (!window.supabase?.createClient) {
	setNotice(loginNotice, "Supabase JS SDK gagal dimuat dari CDN. Periksa koneksi internet atau pemblokir script.", true);
} else {
	supabaseClient = window.supabase.createClient(config.url, config.anonKey);
	supabaseClient.auth.getSession()
		.then(({ data }) => setAuthenticated(data.session?.user))
		.catch((error) => setNotice(loginNotice, `Session Supabase gagal diperiksa: ${error.message}`, true));
	supabaseClient.auth.onAuthStateChange((_event, session) => setAuthenticated(session?.user));
}

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!supabaseClient) return;
	setNotice(loginNotice, "Signing in...");
	const formData = new FormData(loginForm);
	try {
		const { error } = await supabaseClient.auth.signInWithPassword({
			email: formData.get("email"),
			password: formData.get("password")
		});
		setNotice(loginNotice, error?.message || "", Boolean(error));
	} catch (error) {
		const message = error?.message || "Unknown network error";
		const isNetworkError = /failed to fetch|networkerror|load failed/i.test(message);
		setNotice(loginNotice, isNetworkError
			? `Tidak dapat menjangkau Supabase (${message}). Periksa DNS dan hostname project.`
			: `Login gagal: ${message}`, true);
	}
});

collectionSelect.addEventListener("change", loadEntries);
document.querySelector("#new-entry-button").addEventListener("click", () => openEditor());
document.querySelector("#import-content-button").addEventListener("click", importLegacyPortfolio);
document.querySelector("#cancel-edit-button").addEventListener("click", () => { entryForm.hidden = true; });
document.querySelector("#logout-button").addEventListener("click", async () => { await supabaseClient.auth.signOut(); });
entryForm.addEventListener("submit", saveEntry);