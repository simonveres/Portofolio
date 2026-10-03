import { getFirebaseServices } from "./firebase-client.js";

const collections = [
	"profiles", "experiences", "education", "organizations", "projects", "skills",
	"certificates", "achievements", "gallery", "publications", "socials", "contacts"
];
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
const params = new URLSearchParams(window.location.search);
const username = (params.get("username") || "").toLowerCase();
const preview = params.get("preview") === "1";
const previewUid = preview ? params.get("uid") || "" : "";
const adminPreview = preview && params.get("adminPreview") === "1";
const designPreview = preview && params.get("designPreview") === "1";
const content = document.querySelector("#portfolio-content");
const state = document.querySelector("#portfolio-state");

function showState(title, message, linkLabel = "", linkHref = "") {
	content.hidden = true;
	state.replaceChildren();
	const panel = document.createElement("div");
	const eyebrow = document.createElement("p");
	eyebrow.className = "page-label";
	eyebrow.textContent = "PORTFOLIO BUILDER";
	const heading = document.createElement("h1");
	heading.textContent = title;
	const description = document.createElement("p");
	description.textContent = message;
	panel.append(eyebrow, heading, description);
	if (linkLabel && linkHref) {
		const link = document.createElement("a");
		link.className = "button button-primary";
		link.href = linkHref;
		link.textContent = linkLabel;
		panel.append(link);
	}
	if (preview) panel.append(createDashboardReturnLink());
	state.replaceChildren(panel);
	state.hidden = false;
}

function createDashboardReturnLink() {
	const link = node("a", "preview-return-link", "← Kembali ke Dashboard");
	link.href = "dashboard/user.html";
	link.target = "_top";
	return link;
}

function safeLink(value) {
	if (!value) return "";
	try {
		const url = new URL(value, window.location.href);
		return ["http:", "https:"].includes(url.protocol) ? url.href : "";
	} catch {
		return "";
	}
}

function node(tag, className, text = "") {
	const item = document.createElement(tag);
	if (className) item.className = className;
	item.textContent = text || "";
	return item;
}

function appendLink(parent, label, value) {
	const href = safeLink(value);
	if (!href) return;
	const link = node("a", "builder-link", label);
	link.href = href;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	parent.append(link);
}

function normalizeDesignSettings(value = {}) {
	const settings = { ...defaultDesignSettings };
	for (const key of ["primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor"]) {
		if (typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key])) settings[key] = value[key];
	}
	if (value.template === "default") settings.template = value.template;
	if (["Arial", "Poppins", "Inter", "Montserrat", "Roboto", "Open Sans"].includes(value.fontFamily)) settings.fontFamily = value.fontFamily;
	if (["square", "rounded", "pill"].includes(value.buttonStyle)) settings.buttonStyle = value.buttonStyle;
	if (["square", "rounded", "circle"].includes(value.imageStyle)) settings.imageStyle = value.imageStyle;
	if (["default", "sticky", "transparent"].includes(value.navbarStyle)) settings.navbarStyle = value.navbarStyle;
	if (["compact", "normal", "spacious"].includes(value.spacing)) settings.spacing = value.spacing;
	if (typeof value.animations === "boolean") settings.animations = value.animations;
	return settings;
}

function clearPortfolioDesign() {
	const body = document.body;
	body.classList.remove("design-customized");
	for (const property of ["--portfolio-primary", "--portfolio-secondary", "--portfolio-background", "--portfolio-text", "--portfolio-accent", "--portfolio-font"]) {
		body.style.removeProperty(property);
	}
	for (const attribute of ["data-button-style", "data-image-style", "data-navbar-style", "data-spacing", "data-animations"]) {
		body.removeAttribute(attribute);
	}
}

function applyPortfolioDesign(value) {
	if (!value) {
		clearPortfolioDesign();
		return;
	}
	const settings = normalizeDesignSettings(value);
	if (JSON.stringify(settings) === JSON.stringify(defaultDesignSettings)) {
		clearPortfolioDesign();
		return;
	}
	const body = document.body;
	body.classList.add("design-customized");
	body.style.setProperty("--portfolio-primary", settings.primaryColor);
	body.style.setProperty("--portfolio-secondary", settings.secondaryColor);
	body.style.setProperty("--portfolio-background", settings.backgroundColor);
	body.style.setProperty("--portfolio-text", settings.textColor);
	body.style.setProperty("--portfolio-accent", settings.accentColor);
	body.style.setProperty("--portfolio-font", `"${settings.fontFamily}", Arial, sans-serif`);
	body.dataset.buttonStyle = settings.buttonStyle;
	body.dataset.imageStyle = settings.imageStyle;
	body.dataset.navbarStyle = settings.navbarStyle;
	body.dataset.spacing = settings.spacing;
	body.dataset.animations = String(settings.animations);
}

function applyPreviewDesign(settings) {
	applyPortfolioDesign(settings);
}

function enableOwnerDesignPreview(ownerUid, authUser) {
	if (!designPreview || authUser?.uid !== ownerUid) return;
	window.addEventListener("message", (event) => {
		if (event.origin !== window.location.origin || event.source !== window.parent
			|| event.data?.type !== "portfolio-design-preview") return;
		applyPreviewDesign(event.data.settings);
	});
	window.parent.postMessage({ type: "portfolio-design-preview-ready" }, window.location.origin);
}

function setMetadata(profile) {
	const name = profile.name || "Portfolio";
	const description = (profile.bio || profile.headline || "Portfolio profesional.").slice(0, 200);
	const image = safeLink(profile.profileImage || "");
	document.title = `${name} | Portfolio`;
	document.querySelector('meta[name="description"]').content = description;
	document.querySelector('meta[property="og:title"]').content = document.title;
	document.querySelector('meta[property="og:description"]').content = description;
	document.querySelector('meta[property="og:image"]').content = image;
	document.querySelector('meta[property="og:url"]').content = window.location.href;
}

function renderProfile(profile) {
	if (!profile) return false;
	document.querySelector("#portfolio-name").textContent = profile.name || "";
	document.querySelector("#portfolio-title").textContent = profile.headline || profile.title || "";
	document.querySelector("#portfolio-bio").textContent = profile.bio || profile.description || "";
	document.querySelector("#portfolio-location").textContent = profile.location || "";
	document.querySelector("#portfolio-brand").textContent = profile.name || "PORTFOLIO";
	document.querySelector("#portfolio-headline").textContent = profile.headline || profile.title || "PROFESSIONAL PROFILE";
	document.querySelector("#portfolio-footer-name").textContent = profile.name || "Portfolio Builder";
	const image = safeLink(profile.profileImage || "");
	const imageNode = document.querySelector("#portfolio-image");
	if (image) {
		imageNode.src = image;
		imageNode.alt = profile.name ? `${profile.name} profile` : "Profile photo";
		imageNode.hidden = false;
	}
	setMetadata(profile);
	return true;
}

function renderCard(collection, record) {
	const card = node("article", `builder-card${collection === "gallery" ? " builder-gallery-card" : ""}`);
	const title = record.title || record.position || record.organizationName || record.institution
		|| record.name || record.platform || record.company || "";
	const imageUrl = safeLink(record.imageUrl || record.image || "");
	if (imageUrl && ["projects", "organizations", "certificates", "achievements", "gallery"].includes(collection)) {
		const image = node("img", "builder-card-image");
		image.src = imageUrl;
		image.alt = title || "Portfolio image";
		image.loading = "lazy";
		card.append(image);
	}
	const content = node("div", "builder-card-copy");
	content.append(node("h3", "", title));
	const subtitle = record.company || record.degree || record.field || record.issuer || record.publisher
		|| record.category || record.level || record.username || "";
	if (subtitle) content.append(node("p", "builder-card-subtitle", subtitle));
	const period = [record.startDate, record.endDate].filter(Boolean).join(" - ") || record.date || "";
	if (period) content.append(node("small", "builder-card-period", period));
	if (record.description) content.append(node("p", "builder-card-description", record.description));
	if (record.technologies) content.append(node("p", "builder-card-subtitle", record.technologies));
	if (record.contribution) content.append(node("p", "builder-card-description", record.contribution));
	if (collection === "socials" || collection === "contacts") {
		for (const key of ["url", "linkedin", "instagram", "github", "website"]) appendLink(content, record.platform || key, record[key]);
	}
	if (collection === "projects") {
		appendLink(content, "View project", record.projectUrl);
		appendLink(content, "GitHub", record.githubUrl);
	}
	if (collection === "publications" || collection === "achievements") appendLink(content, "View details", record.url);
	if (collection === "certificates") appendLink(content, "View certificate", record.certificateUrl);
	if (collection === "contacts") {
		if (record.email) {
			const email = node("a", "builder-link", record.email);
			email.href = `mailto:${record.email}`;
			content.append(email);
		}
		if (record.phone) {
			const phone = node("a", "builder-link", record.phone);
			phone.href = `tel:${record.phone}`;
			content.append(phone);
		}
		const whatsapp = String(record.whatsapp || "").replace(/\D/g, "");
		if (whatsapp) appendLink(content, "WhatsApp", `https://wa.me/${whatsapp}`);
	}
	card.append(content);
	return card;
}

function renderCollection(collection, records) {
	const section = document.querySelector(`[data-section="${collection}"]`);
	const root = document.querySelector(`[data-records="${collection}"]`);
	if (!records.length) {
		section.hidden = true;
		return;
	}
	records.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
	root.replaceChildren(...records.map((record) => renderCard(collection, record)));
	section.hidden = false;
	const nav = document.createElement("a");
	nav.href = `#${section.id}`;
	nav.textContent = section.querySelector("h2").textContent;
	document.querySelector("#portfolio-navigation").append(nav);
}

function addProfileNavigation() {
	const link = document.createElement("a");
	link.href = "#profile-section";
	link.textContent = "Profile";
	document.querySelector("#portfolio-navigation").prepend(link);
}

async function currentAuthUser(services) {
	return new Promise((resolve) => {
		let unsubscribe = () => {};
		unsubscribe = services.authSdk.onAuthStateChanged(services.auth, (user) => {
			unsubscribe();
			resolve(user);
		});
	});
}

async function load() {
	if ((username && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username))
		|| (!username && !(preview && previewUid))) {
		showState("Portfolio tidak ditemukan.", "Periksa kembali link portfolio.", "Kembali ke website", "index.html");
		return;
	}
	try {
		const services = await getFirebaseServices();
		const authUser = preview ? await currentAuthUser(services) : null;
		if (preview && !authUser) {
			showState("Preview pribadi.", "Masuk ke akun pemilik untuk melihat preview.", "Masuk", "login.html");
			return;
		}
		const firestore = services.firestoreSdk;
		let ownerUid = previewUid;
		if (username) {
			const slugSnapshot = await firestore.getDoc(firestore.doc(services.db, "usernames", username));
			if (!slugSnapshot.exists()) {
				showState("Portfolio tidak ditemukan.", "Username ini belum terhubung ke portfolio.");
				return;
			}
			ownerUid = slugSnapshot.data().ownerUid;
		}
		let admin = false;
		if (adminPreview && authUser) {
			const adminSnapshot = await services.firestoreSdk.getDoc(
				services.firestoreSdk.doc(services.db, "admins", authUser.uid)
			);
			admin = adminSnapshot.exists() && adminSnapshot.data().active === true;
		}
		if (preview && authUser.uid !== ownerUid && !admin) {
			showState("Preview pribadi.", "Preview hanya dapat dibuka oleh pemilik akun.");
			return;
		}
		if (preview && !admin) enableOwnerDesignPreview(ownerUid, authUser);
		const designSnapshot = await firestore.getDoc(firestore.doc(services.db, "portfolioSettings", ownerUid));
		const savedDesign = designSnapshot.exists() && designSnapshot.data().userId === ownerUid
			? designSnapshot.data()
			: null;
		applyPortfolioDesign(savedDesign);
		const records = await Promise.all(collections.map(async (collection) => {
			const constraints = [firestore.where("userId", "==", ownerUid)];
			if (!preview) constraints.push(firestore.where("published", "==", true));
			const snapshot = await firestore.getDocs(firestore.query(
				firestore.collection(services.db, collection),
				...constraints
			));
			return [collection, snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))];
		}));
		const portfolio = Object.fromEntries(records);
		const profile = portfolio.profiles[0];
		if ((!preview && !profile) || !renderProfile(profile || {})) {
			showState(preview ? "Profile belum diisi." : "Portfolio belum dipublikasikan.", "Portfolio ini belum memiliki profile yang dapat ditampilkan.");
			return;
		}
		for (const collection of collections) {
			if (collection !== "profiles") renderCollection(collection, portfolio[collection]);
		}
		if (preview) {
			const badge = node("p", "preview-banner", "Preview pribadi - hanya terlihat oleh Anda");
			badge.append(createDashboardReturnLink());
			content.prepend(badge);
		}
		addProfileNavigation();
		document.querySelector("#portfolio-year").textContent = String(new Date().getFullYear());
		state.hidden = true;
		content.hidden = false;
	} catch (error) {
		console.error("Portfolio load failed:", error);
		showState(preview ? "Preview tidak tersedia." : "Portfolio ini belum tersedia.", "Data belum dapat dimuat. Coba lagi nanti.", "Kembali ke website", "index.html");
	}
}

load();
