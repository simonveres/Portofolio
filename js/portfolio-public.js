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

function hasRenderableData(record, collection = "") {
	const ignored = ["id", "userId", "published", "order", "createdAt", "updatedAt"];
	if (collection === "profiles") ignored.push("username");
	return Object.entries(record).some(([key, value]) => !ignored.includes(key)
		&& ((typeof value === "string" && value.trim() !== "")
			|| (typeof value === "number" && Number.isFinite(value))));
}

function appendAction(parent, label, value, className = "publication-link") {
	const href = safeLink(value);
	if (!href) return;
	const link = node("a", className, label);
	link.href = href;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	parent.append(link);
}

function addHeroInfo(profile) {
	const root = document.querySelector("#portfolio-info");
	const items = [
		["GPA", profile.gpa],
		["UNIVERSITY", profile.university],
		["LOCATION", profile.location],
		["FOCUS", profile.focus || profile.interests]
	].filter(([, value]) => String(value || "").trim());
	root.replaceChildren(...items.map(([label, value]) => {
		const item = document.createElement("div");
		item.append(node("strong", "", label), node("span", "", value));
		return item;
	}));
	root.hidden = items.length === 0;
}

function contactAction(contact) {
	if (!contact) return "";
	const whatsapp = String(contact.whatsapp || "").replace(/\D/g, "");
	if (whatsapp) return `https://wa.me/${whatsapp}`;
	if (contact.email) return `mailto:${contact.email}`;
	if (contact.phone) return `tel:${contact.phone}`;
	return "";
}

function renderProfile(profile = {}, contact = {}) {
	const hero = document.querySelector("#profile-section");
	const name = profile.name || "";
	document.querySelector("#portfolio-name").textContent = name;
	document.querySelector("#portfolio-title").textContent = profile.headline || profile.title || "";
	document.querySelector("#portfolio-bio").textContent = profile.bio || profile.description || "";
	document.querySelector("#portfolio-location").textContent = profile.location || "";
	document.querySelector("#portfolio-brand").textContent = name || "PORTFOLIO";
	document.querySelector("#portfolio-mark").textContent = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PB";
	document.querySelector("#portfolio-headline").textContent = profile.headline || profile.title || "PROFESSIONAL PROFILE";
	document.querySelector("#portfolio-footer-name").textContent = name || "Portfolio";
	document.querySelector("#portfolio-focus").textContent = profile.focus || "PROFESSIONAL PROFILE";
	addHeroInfo(profile);
	const imageUrl = safeLink(profile.profileImage || "");
	const image = document.querySelector("#portfolio-image");
	if (imageUrl) {
		image.src = imageUrl;
		image.alt = name ? `${name} profile photo` : "Profile photo";
		image.hidden = false;
		document.querySelector("#profile-visual").hidden = false;
	} else {
		hero.classList.add("hero-no-image");
	}
	const contactLink = document.querySelector("#portfolio-contact-action");
	const actionUrl = contactAction(contact);
	if (actionUrl) {
		contactLink.href = actionUrl;
		contactLink.textContent = "Hubungi Saya";
		contactLink.hidden = false;
		if (actionUrl.startsWith("https:")) {
			contactLink.target = "_blank";
			contactLink.rel = "noopener noreferrer";
		}
	}
	const cvLink = document.querySelector("#portfolio-cv-action");
	if (profile.cvUrl && safeLink(profile.cvUrl)) {
		cvLink.href = safeLink(profile.cvUrl);
		cvLink.hidden = false;
	}
	setMetadata(profile);
	return true;
}

function periodLabel(record) {
	return [record.startDate, record.endDate].filter(Boolean).join(" - ") || record.date || "";
}

function sectionHeading(section, label, title, detail = "") {
	const heading = node("div", "organization-heading");
	heading.append(node("p", "page-label", label.toUpperCase()), node("h2", "", title));
	if (detail) heading.append(node("p", "", detail));
	section.append(heading);
}

function createSection(id, className, label, title, detail) {
	const section = node("section", className);
	section.id = id;
	sectionHeading(section, label, title, detail);
	return section;
}

function renderTimeline(collection, records, label, title) {
	if (!records.length) return null;
	const section = node("section", "timeline-section");
	section.id = `${collection}-section`;
	const heading = node("div", "section-heading");
	heading.append(node("span", "", label.toUpperCase()), node("h2", "", title));
	section.append(heading);
	const timeline = node("div", "timeline");
	records.forEach((record, index) => {
		const item = node("article", "timeline-item");
		item.append(node("span", "timeline-dot"));
		const card = node("div", "timeline-card");
		const date = periodLabel(record);
		if (date) card.append(node("span", "timeline-year", date));
		card.append(node("h3", "", record.institution || record.position || record.title || ""));
		const subtitle = [record.degree || record.company, record.field || record.location].filter(Boolean).join(" · ");
		if (subtitle) card.append(node("h4", "", subtitle));
		if (record.description) card.append(node("p", "", record.description));
		if (record.gpa) card.append(node("p", "", `GPA: ${record.gpa}`));
		item.append(card);
		timeline.append(item);
	});
	section.append(timeline);
	return section;
}

function renderAboutCards(records, { id, label, title, detail, className = "about-menu" }) {
	if (!records.length) return null;
	const section = createSection(id, className, label, title, detail);
	const grid = node("div", "about-grid");
	records.forEach((record, index) => {
		const card = node("article", "about-card organization-card");
		card.append(node("span", "card-number", String(index + 1).padStart(2, "0")));
		const date = periodLabel(record);
		if (date) card.append(node("span", "timeline-year", date));
		const heading = record.organizationName || record.title || record.name || record.position || "";
		if (heading) card.append(node("h3", "", heading));
		const subtitle = [record.position, record.issuer || record.company || record.institution].filter(Boolean).join(" · ");
		if (subtitle) card.append(node("h4", "", subtitle));
		if (record.description) card.append(node("p", "", record.description));
		if (record.image || record.imageUrl) {
			const imageUrl = safeLink(record.imageUrl || record.image);
			if (imageUrl) {
				const image = node("img", "portfolio-record-image");
				image.src = imageUrl;
				image.alt = heading || label;
				image.loading = "lazy";
				card.append(image);
			}
		}
		if (record.url) appendAction(card, "View details", record.url, "certificate-link");
		if (record.certificateUrl) appendAction(card, "View certificate", record.certificateUrl, "certificate-link");
		grid.append(card);
	});
	section.append(grid);
	return section;
}

function renderProjects(records) {
	if (!records.length) return null;
	const section = createSection("projects-section", "about-menu project-section", "Projects", "Selected Projects");
	records.forEach((record) => {
		const feature = node("article", "project-feature");
		const title = record.title || record.name || "Project";
		const imageUrl = safeLink(record.imageUrl || record.image || "");
		if (imageUrl) {
			const imageLink = node("a", "project-image");
			imageLink.href = imageUrl;
			imageLink.target = "_blank";
			imageLink.rel = "noopener noreferrer";
			const image = node("img");
			image.src = imageUrl;
			image.alt = title;
			image.loading = "lazy";
			imageLink.append(image);
			feature.append(imageLink);
		} else {
			feature.classList.add("project-feature-text");
		}
		const content = node("div", "project-content");
		content.append(node("span", "project-kicker", record.category || "FEATURED PROJECT"));
		content.append(node("h3", "", title));
		const subtitle = record.company || record.organizationName || record.role || "";
		if (subtitle) content.append(node("h4", "", subtitle));
		if (record.description) content.append(node("p", "", record.description));
		if (record.technologies) {
			content.append(node("strong", "project-label", "Tools & Focus"));
			content.append(node("p", "project-skills", record.technologies));
		}
		if (record.contribution) {
			content.append(node("strong", "project-label", "Key Contributions"));
			content.append(node("p", "", record.contribution));
		}
		if (record.projectUrl) appendAction(content, "View project", record.projectUrl);
		if (record.githubUrl) appendAction(content, "GitHub", record.githubUrl, "publication-link");
		feature.append(content);
		section.append(feature);
	});
	return section;
}

function renderGallery(records) {
	if (!records.length) return null;
	const section = createSection("gallery-section", "about-menu gallery-section", "Gallery", "Selected Moments");
	const grid = node("div", "gallery-grid");
	records.forEach((record) => {
		const card = node("article", "gallery-card");
		const imageUrl = safeLink(record.imageUrl || record.image || "");
		if (imageUrl) {
			const link = node("a");
			link.href = imageUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			const image = node("img");
			image.src = imageUrl;
			image.alt = record.title || "Portfolio gallery image";
			image.loading = "lazy";
			link.append(image);
			card.append(link);
		}
		const copy = node("div", "gallery-copy");
		if (record.title) copy.append(node("h3", "", record.title));
		if (record.description) copy.append(node("p", "", record.description));
		card.append(copy);
		grid.append(card);
	});
	section.append(grid);
	return section;
}

function renderSkills(records) {
	if (!records.length) return null;
	const section = node("section", "skills-section");
	section.id = "skills-section";
	const groups = new Map();
	for (const record of records) {
		const category = record.category || "Professional Skills";
		if (!groups.has(category)) groups.set(category, []);
		groups.get(category).push(record);
	}
	[...groups.entries()].forEach(([category, skills], index) => {
		const panel = node("article", "skills-panel");
		const heading = node("div", "skills-panel-heading");
		const copy = document.createElement("div");
		copy.append(node("span", "small-title", category.toUpperCase()), node("h2", "", category));
		heading.append(node("span", "skills-number", String(index + 1).padStart(2, "0")), copy);
		const list = node("ul", "skills-list");
		for (const skill of skills) {
			const item = document.createElement("li");
			const detail = [skill.level, skill.description].filter(Boolean).join(" · ");
			item.textContent = skill.name || skill.title || "";
			if (detail) item.append(node("small", "skill-detail", detail));
			list.append(item);
		}
		panel.append(heading, list);
		section.append(panel);
	});
	return section;
}

function renderPublications(records) {
	if (!records.length) return null;
	const section = node("section", "publications-section");
	section.id = "publications-section";
	for (const record of records) {
		const card = node("article", "publication-card");
		const meta = node("div", "publication-meta");
		meta.append(node("span", "small-title", "PUBLICATION"));
		const status = record.publisher || periodLabel(record);
		if (status) meta.append(node("span", "publication-status", status));
		card.append(meta);
		if (record.title) card.append(node("h2", "", record.title));
		if (record.description) card.append(node("p", "publication-description", record.description));
		if (record.contribution) {
			const contribution = node("div", "publication-contribution");
			contribution.append(node("span", "small-title", "CONTRIBUTION"), node("p", "", record.contribution));
			card.append(contribution);
		}
		if (record.url) appendAction(card, "View publication", record.url);
		section.append(card);
	}
	return section;
}

function renderSocials(records) {
	if (!records.length) return null;
	const section = createSection("socials-section", "about-menu social-section", "Social Media", "Connect with Me");
	const grid = node("div", "social-grid");
	for (const record of records) {
		const platform = record.platform || record.username || "Social profile";
		const href = safeLink(record.url || "");
		const platformKey = platform.toLowerCase().replace(/[^a-z0-9]+/g, "");
		const brand = ["linkedin", "instagram", "tiktok"].find((name) => platformKey.includes(name)) || "generic";
		const socialClass = `social-${brand}`;
		const card = node(href ? "a" : "article", `social-card ${socialClass}`);
		if (href) {
			card.href = href;
			card.target = "_blank";
			card.rel = "noopener noreferrer";
		}
		const icon = node("span", "social-icon");
		const iconUrl = safeLink(record.icon || "");
		if (iconUrl) {
			const image = node("img");
			image.src = iconUrl;
			image.alt = "";
			image.loading = "lazy";
			icon.append(image);
		} else {
			icon.textContent = platform.slice(0, 2).toUpperCase();
		}
		const copy = node("span", "social-copy");
		copy.append(node("strong", "", platform));
		if (record.username) copy.append(node("span", "", record.username));
		if (record.url) copy.append(node("small", "", record.url.replace(/^https?:\/\//, "")));
		card.append(icon, copy);
		if (href) card.append(node("span", "social-arrow", "↗"));
		grid.append(card);
	}
	section.append(grid);
	return section;
}

function renderContacts(record) {
	if (!record || !hasRenderableData(record, "contacts")) return null;
	const section = node("section", "contact-section");
	section.id = "contacts-section";
	const card = node("div", "contact-card");
	card.append(node("span", "small-title", "GET IN TOUCH"), node("h2", "", "Start a conversation"));
	if (record.address) card.append(node("p", "", record.address));
	const details = node("div", "contact-details");
	for (const [label, value, scheme] of [
		["EMAIL", record.email, "mailto:"],
		["PHONE", record.phone, "tel:"],
		["WHATSAPP", record.whatsapp, "https://wa.me/"],
		["LINKEDIN", record.linkedin, ""],
		["INSTAGRAM", record.instagram, ""],
		["GITHUB", record.github, ""],
		["WEBSITE", record.website, ""]
	]) {
		if (!value) continue;
		const detail = node("div", "contact-detail");
		detail.append(node("span", "contact-label", label));
		const href = scheme.startsWith("https:")
			? `${scheme}${String(value).replace(/\D/g, "")}`
			: scheme ? `${scheme}${value}` : safeLink(value);
		if (href) {
			const link = node("a", "", value);
			link.href = href;
			if (href.startsWith("https:")) {
				link.target = "_blank";
				link.rel = "noopener noreferrer";
			}
			detail.append(link);
		} else {
			detail.append(node("span", "", value));
		}
		details.append(detail);
	}
	card.append(details);
	const href = contactAction(record);
	if (href) {
		const action = node("a", "contact-button", "Contact me →");
		action.href = href;
		if (href.startsWith("https:")) {
			action.target = "_blank";
			action.rel = "noopener noreferrer";
		}
		card.append(action);
	}
	section.append(card);
	return section;
}

function addPortfolioNavigation(sections, hasProfile) {
	const navigation = document.querySelector("#portfolio-navigation");
	navigation.replaceChildren();
	const links = [];
	if (hasProfile) links.push(["About", "#profile-section"]);
	if (sections.education) links.push(["Education", `#${sections.education.id}`]);
	for (const [collection, label] of [
		["experiences", "Experience"], ["organizations", "Organization"], ["projects", "Projects"],
		["gallery", "Gallery"], ["publications", "Publications"], ["achievements", "Achievements"],
		["certificates", "Certificates"], ["skills", "Skills"], ["socials", "Social Media"], ["contacts", "Contact"]
	]) {
		if (sections[collection]) links.push([label, `#${sections[collection].id}`]);
	}
	for (const [label, href] of links) {
		const link = node("a", "", label);
		link.href = href;
		navigation.append(link);
	}
}

function renderPortfolio(portfolio) {
	const profile = portfolio.profiles[0];
	const contact = { email: profile?.email || "", phone: profile?.phone || "", ...portfolio.contacts[0] };
	const hasProfile = Boolean(profile && hasRenderableData(profile, "profiles"));
	if (!preview && !hasProfile) {
		showState("Portfolio belum dipublikasikan.", "Portfolio ini belum memiliki profile yang dapat ditampilkan.");
		return false;
	}
	if (hasProfile) renderProfile(profile, contact);
	else document.querySelector("#profile-section").hidden = true;

	const content = Object.fromEntries(collections.map((collection) => [
		collection,
		(portfolio[collection] || [])
			.filter((record) => hasRenderableData(record, collection))
			.sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
	]));
	const sections = {
		education: renderTimeline("education", content.education, "Education", "Academic Background"),
		experiences: renderAboutCards(content.experiences, {
			id: "experiences-section", className: "about-menu organization-section experience-section",
			label: "Professional Experience", title: "Experience", detail: "Professional and practical experience"
		}),
		organizations: renderAboutCards(content.organizations, {
			id: "organizations-section", className: "about-menu organization-section",
			label: "Organization", title: "Organizational Involvement"
		}),
		projects: renderProjects(content.projects),
		gallery: renderGallery(content.gallery),
		publications: renderPublications(content.publications),
		achievements: renderAboutCards(content.achievements, {
			id: "achievements-section", label: "Achievements", title: "Achievements and Recognition"
		}),
		certificates: renderAboutCards(content.certificates, {
			id: "certificates-section", label: "Certificates", title: "Certificates and Credentials"
		}),
		skills: renderSkills(content.skills),
		socials: renderSocials(content.socials),
		contacts: renderContacts(contact)
	};
	const sectionOrder = ["education", "experiences", "organizations", "projects", "gallery", "publications", "achievements", "certificates", "skills", "socials", "contacts"];
	const visibleSections = sectionOrder.map((collection) => sections[collection]).filter(Boolean);
	document.querySelector("#portfolio-sections").replaceChildren(...visibleSections);
	addPortfolioNavigation(sections, hasProfile);
	document.querySelector("#portfolio-explore").hidden = visibleSections.length === 0;
	return true;
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
	let loadStage = "Firebase initialization";
	let ownerUid = previewUid;
	let authUid = "";
	try {
		const services = await getFirebaseServices();
		loadStage = "Firebase Auth state";
		const authUser = preview ? await currentAuthUser(services) : null;
		authUid = authUser?.uid || "";
		if (preview && !authUser) {
			showState("Preview pribadi.", "Masuk ke akun pemilik untuk melihat preview.", "Masuk", "login.html");
			return;
		}
		const firestore = services.firestoreSdk;
		if (username) {
			loadStage = `usernames/${username} lookup`;
			const slugSnapshot = await firestore.getDoc(firestore.doc(services.db, "usernames", username));
			if (!slugSnapshot.exists()) {
				showState("Portfolio tidak ditemukan.", "Username ini belum terhubung ke portfolio.");
				return;
			}
			ownerUid = slugSnapshot.data().ownerUid;
		}
		let admin = false;
		if (adminPreview && authUser) {
			loadStage = `admins/${authUser.uid} lookup`;
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
		loadStage = `portfolioSettings/${ownerUid} lookup`;
		const designSnapshot = await firestore.getDoc(firestore.doc(services.db, "portfolioSettings", ownerUid));
		const savedDesign = designSnapshot.exists() && designSnapshot.data().userId === ownerUid
			? designSnapshot.data()
			: null;
		applyPortfolioDesign(savedDesign);
		loadStage = "portfolio collection reads";
		const records = await Promise.all(collections.map(async (collection) => {
			try {
				if (["profiles", "contacts"].includes(collection)) {
					const snapshot = await firestore.getDoc(firestore.doc(services.db, collection, ownerUid));
					if (!snapshot.exists()) return [collection, []];
					const record = { id: snapshot.id, ...snapshot.data() };
					return [collection, !preview && record.published !== true ? [] : [record]];
				}
				const constraints = [firestore.where("userId", "==", ownerUid)];
				if (!preview) constraints.push(firestore.where("published", "==", true));
				const snapshot = await firestore.getDocs(firestore.query(
					firestore.collection(services.db, collection),
					...constraints
				));
				return [collection, snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))];
			} catch (error) {
				console.error(`Portfolio ${preview ? "preview" : "public"} read failed for ${collection}:`, {
					ownerUid,
					authUid,
					code: error.code || "unknown"
				}, error);
				throw error;
			}
		}));
		const portfolio = Object.fromEntries(records);
		loadStage = "portfolio rendering";
		if (!renderPortfolio(portfolio)) return;
		if (preview) {
			const badge = node("p", "preview-banner", "Preview pribadi - hanya terlihat oleh Anda");
			badge.append(createDashboardReturnLink());
			content.prepend(badge);
		}
		document.querySelector("#portfolio-year").textContent = String(new Date().getFullYear());
		state.hidden = true;
		content.hidden = false;
	} catch (error) {
		console.error(preview ? "Preview load error:" : "Public portfolio load error:", {
			stage: loadStage,
			username: username || null,
			ownerUid: ownerUid || null,
			authUid: authUid || null,
			code: error.code || "unknown",
			message: error.message || String(error)
		}, error);
		const detail = preview
			? `Gagal pada tahap ${loadStage}${error.code ? ` (${error.code})` : ""}: ${error.message || "Unknown error"}`
			: "Data belum dapat dimuat. Coba lagi nanti.";
		showState(preview ? "Preview tidak tersedia." : "Portfolio ini belum tersedia.", detail, "Kembali ke website", "index.html");
	}
}

load();
