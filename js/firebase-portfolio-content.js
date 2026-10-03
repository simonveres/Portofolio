import { getFirebaseServices, isFirebaseConfigured } from "./firebase-client.js";

const aliases = { gallery_items: "gallery", social_links: "socials" };

function element(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	node.textContent = text || "";
	return node;
}

function safeLink(value) {
	if (!value) return "";
	try {
		const link = new URL(value, window.location.href);
		return ["http:", "https:"].includes(link.protocol) ? link.href : "";
	} catch {
		return "";
	}
}

async function storageUrl(services, path) {
	if (!path) return "";
	try {
		const storageSdk = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js");
		const storage = storageSdk.getStorage(services.app);
		return await storageSdk.getDownloadURL(storageSdk.ref(storage, path));
	} catch (error) {
		console.warn(`Could not read portfolio file ${path}:`, error.message);
		return "";
	}
}

async function entryImageUrl(services, entry) {
	return safeLink(entry.imageUrl || entry.image || entry.profileImage)
		|| await storageUrl(services, entry.imagePath);
}

function normalizeEntry(entry, collection) {
	const period = [entry.startDate, entry.endDate].filter(Boolean).join(" - ")
		|| entry.date || entry.period || "";
	const title = entry.title || entry.name || entry.position
		|| entry.organizationName || entry.institution || entry.platform || "";
	const subtitle = entry.subtitle || entry.company || entry.degree || entry.field
		|| entry.publisher || entry.issuer || entry.category || entry.username || "";
	return {
		...entry,
		title,
		subtitle,
		period,
		organization: collection === "projects"
			? entry.technologies
			: entry.organization || entry.company || entry.organizationName || entry.publisher || entry.issuer || "",
		linkUrl: entry.projectUrl || entry.url || entry.certificateUrl || entry.linkUrl || "",
		imageUrl: entry.imageUrl || entry.image || entry.profileImage || ""
	};
}

function appendDetails(parent, details) {
	if (!Array.isArray(details) || !details.length) return;
	const list = document.createElement("ul");
	for (const detail of details) {
		const text = typeof detail === "string" ? detail : detail?.text || "";
		if (text) list.append(element("li", "", text));
	}
	if (list.childElementCount) parent.append(list);
}

async function makeCard(entry, index, collection, services) {
	if (collection === "gallery") {
		const card = element("article", "gallery-card", "");
		const imageUrl = await entryImageUrl(services, entry);
		if (imageUrl) {
			const anchor = element("a", "", "");
			anchor.href = imageUrl;
			anchor.target = "_blank";
			anchor.rel = "noopener noreferrer";
			const image = element("img", "", "");
			image.src = imageUrl;
			image.alt = entry.title || "Portfolio gallery image";
			image.loading = "lazy";
			anchor.append(image);
			card.append(anchor);
		}
		const copy = element("div", "gallery-copy", "");
		copy.append(element("h3", "", entry.title), element("p", "", entry.description));
		card.append(copy);
		return card;
	}

	if (collection === "projects") {
		const card = element("article", "project-feature", "");
		const imageUrl = await entryImageUrl(services, entry);
		if (imageUrl) {
			const anchor = element("a", "project-image", "");
			anchor.href = imageUrl;
			anchor.target = "_blank";
			anchor.rel = "noopener noreferrer";
			const image = element("img", "", "");
			image.src = imageUrl;
			image.alt = entry.title || "Project image";
			image.loading = "lazy";
			anchor.append(image);
			card.append(anchor);
		}
		const content = element("div", "project-content", "");
		content.append(element("span", "project-kicker", entry.period || entry.subtitle));
		content.append(element("h3", "", entry.title), element("h4", "", entry.organization));
		content.append(element("p", "", entry.description));
		appendDetails(content, entry.details);
		const linkUrl = safeLink(entry.linkUrl);
		if (linkUrl) {
			const link = element("a", "publication-link", "View project");
			link.href = linkUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			content.append(link);
		}
		const githubUrl = safeLink(entry.githubUrl);
		if (githubUrl) {
			const link = element("a", "publication-link", "View on GitHub");
			link.href = githubUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			content.append(link);
		}
		card.append(content);
		return card;
	}

	if (collection === "education") {
		const item = element("article", "timeline-item", "");
		item.append(element("span", "timeline-dot", ""));
		const content = element("div", "timeline-card", "");
		content.append(element("span", "timeline-year", entry.period));
		content.append(element("h3", "", entry.title), element("h4", "", entry.subtitle || entry.organization));
		content.append(element("p", "", entry.description));
		item.append(content);
		return item;
	}

	if (collection === "publications") {
		const card = element("article", "publication-card", "");
		const meta = element("div", "publication-meta", "");
		const category = element("span", "small-title", "JURNAL TERBIT");
		category.dataset.id = "JURNAL TERBIT";
		category.dataset.en = entry.category || "PUBLISHED JOURNAL";
		const actions = element("div", "publication-actions", "");
		const author = element("span", "publication-status", "PENULIS");
		author.dataset.id = "PENULIS";
		author.dataset.en = "AUTHOR";
		const translate = element("button", "translation-button", "Translate to English");
		translate.type = "button";
		translate.setAttribute("aria-pressed", "false");
		actions.append(author, translate);
		meta.append(category, actions);
		const title = element("h2", "", entry.title);
		title.dataset.id = entry.title || "";
		title.dataset.en = entry.titleEn || entry.title || "";
		card.append(meta, title);
		translate.addEventListener("click", () => {
			const isEnglish = translate.getAttribute("aria-pressed") !== "true";
			card.querySelectorAll("[data-id][data-en]").forEach((node) => {
				node.textContent = isEnglish ? node.dataset.en : node.dataset.id;
			});
			translate.textContent = isEnglish ? "Translate to Indonesian" : "Translate to English";
			translate.setAttribute("aria-pressed", String(isEnglish));
		});
		if (entry.description) {
			const description = element("p", "publication-description", entry.description);
			description.dataset.id = entry.description;
			description.dataset.en = entry.descriptionEn || entry.description;
			card.append(description);
		}
		if (entry.contribution) {
			const contribution = element("div", "publication-contribution", "");
			const contributionLabel = element("span", "small-title", "KONTRIBUSI SAYA");
			contributionLabel.dataset.id = "KONTRIBUSI SAYA";
			contributionLabel.dataset.en = "MY CONTRIBUTION";
			const contributionText = element("p", "", entry.contribution);
			contributionText.dataset.id = entry.contribution;
			contributionText.dataset.en = entry.contributionEn || entry.contribution;
			contribution.append(contributionLabel, contributionText);
			card.append(contribution);
		}
		appendDetails(card, entry.details);
		const linkUrl = safeLink(entry.linkUrl);
		if (linkUrl) {
			const link = element("a", "publication-link", "View published work");
			link.href = linkUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			card.append(link);
		}
		return card;
	}

	if (collection === "socials") {
		const card = element("a", `social-card ${socialClass(entry.title)}`, "");
		const linkUrl = safeLink(entry.linkUrl);
		if (linkUrl) {
			card.href = linkUrl;
			card.target = "_blank";
			card.rel = "noopener noreferrer";
		}
		const imageUrl = safeLink(entry.icon) || await entryImageUrl(services, entry);
		if (imageUrl) {
			const icon = element("span", "social-icon", "");
			const image = element("img", "", "");
			image.src = imageUrl;
			image.alt = `${entry.title || "Social media"} logo`;
			icon.append(image);
			card.append(icon);
		} else if (entry.icon) {
			card.append(element("span", "social-icon", entry.icon));
		}
		const copy = element("span", "social-copy", "");
		copy.append(element("strong", "", entry.title), element("span", "", entry.subtitle), element("small", "", entry.handle || entry.linkUrl));
		card.append(copy, element("span", "social-arrow", "↗"));
		return card;
	}

	const certificate = collection === "certificates";
	const card = element("article", `about-card organization-card${certificate ? " certificate-card" : ""}`, "");
	card.append(element("span", "card-number", String(index + 1).padStart(2, "0")));
	if (entry.period) card.append(element("span", "timeline-year", entry.period));
	const imageUrl = await entryImageUrl(services, entry);
	const fileUrl = safeLink(entry.certificateUrl || entry.fileUrl)
		|| await storageUrl(services, entry.filePath);
	if (certificate && imageUrl) {
		const preview = element("a", "certificate-preview", "");
		preview.href = fileUrl || imageUrl;
		preview.target = "_blank";
		preview.rel = "noopener noreferrer";
		const image = element("img", "", "");
		image.src = imageUrl;
		image.alt = entry.title || "Certificate preview";
		image.loading = "lazy";
		preview.append(image);
		card.append(preview);
	}
	if (certificate && (fileUrl || imageUrl)) {
		const link = element("a", "certificate-link", "Open certificate");
		link.href = fileUrl || imageUrl;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		card.append(link);
	}
	card.append(element("h3", "", entry.title));
	if (entry.subtitle || entry.organization) card.append(element("h4", "", [entry.subtitle, entry.organization].filter(Boolean).join(" · ")));
	card.append(element("p", "", entry.description));
	appendDetails(card, entry.details);
	const linkUrl = safeLink(entry.linkUrl);
	if (linkUrl) {
		const link = element("a", "publication-link", "View details");
		link.href = linkUrl;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		card.append(link);
	}
	return card;
}

function socialClass(title = "") {
	const name = title.toLowerCase();
	if (name.includes("linkedin")) return "social-linkedin";
	if (name.includes("instagram")) return "social-instagram";
	if (name.includes("tiktok")) return "social-tiktok";
	return "";
}

function renderSkills(root, entries) {
	const groups = new Map();
	for (const entry of entries) {
		const category = entry.category || entry.subtitle || "Skills";
		if (!groups.has(category)) groups.set(category, []);
		groups.get(category).push(entry);
	}
	const panels = [...groups].map(([category, skills], index) => {
		const panel = element("article", "skills-panel", "");
		const heading = element("div", "skills-panel-heading", "");
		heading.append(element("span", "skills-number", String(index + 1).padStart(2, "0")));
		const title = element("div", "", "");
		title.append(element("span", "small-title", category.toUpperCase()), element("h2", "", category));
		heading.append(title);
		const list = element("ul", "skills-list", "");
		for (const skill of skills) list.append(element("li", "", skill.title || skill.name));
		panel.append(heading, list);
		return panel;
	});
	root.replaceChildren(...panels);
}

async function renderContact(root, entry, services) {
	const card = element("div", "contact-card", "");
	card.append(element("span", "small-title", "GET IN TOUCH"), element("h2", "Start a conversation"));
	card.append(element("p", "", entry.message || entry.address));
	const details = element("div", "contact-details", "");
	const whatsappValue = entry.whatsapp || entry.whatsappUrl || entry.phone || "";
	const whatsappHref = /^https?:\/\//i.test(whatsappValue)
		? safeLink(whatsappValue)
		: (String(whatsappValue).replace(/\D/g, "")
			? `https://wa.me/${String(whatsappValue).replace(/\D/g, "")}`
			: "");
	for (const [label, value, href] of [
		["WHATSAPP", entry.whatsapp || entry.phone, whatsappHref],
		["ADDRESS", entry.address || entry.location, ""],
		["EMAIL", entry.email, entry.email ? `mailto:${entry.email}` : ""],
		["LINKEDIN", entry.linkedin, safeLink(entry.linkedin)],
		["INSTAGRAM", entry.instagram, safeLink(entry.instagram)],
		["GITHUB", entry.github, safeLink(entry.github)],
		["WEBSITE", entry.website, safeLink(entry.website)]
	]) {
		if (!value) continue;
		const item = element("div", "contact-detail", "");
		item.append(element("span", "contact-label", label));
		if (href) {
			const link = element("a", "", value);
			link.href = href;
			if (href.startsWith("http")) {
				link.target = "_blank";
				link.rel = "noopener noreferrer";
			}
			item.append(link);
		} else item.append(element("span", "", value));
		details.append(item);
	}
	card.append(details);
	if (whatsappHref) {
		const button = element("a", "contact-button", "Contact via WhatsApp →");
		button.href = whatsappHref;
		button.target = "_blank";
		button.rel = "noopener noreferrer";
		card.append(button);
	}
	root.replaceChildren(card);
}

async function renderCollection(root, collection, entries, services) {
	if (!entries.length) return;
	entries = entries.map((entry) => normalizeEntry(entry, collection));
	if (collection === "skills") {
		renderSkills(root, entries);
		return;
	}
	if (collection === "contacts") {
		await renderContact(root, entries[0], services);
		return;
	}
	const cards = await Promise.all(entries.map((entry, index) => makeCard(entry, index, collection, services)));
	if (collection === "projects") {
		const heading = root.querySelector(":scope > .organization-heading");
		root.replaceChildren(...(heading ? [heading] : []), ...cards);
	} else root.replaceChildren(...cards);
}

async function applyProfile(profile, services) {
	if (!profile) return;
	const profileName = profile.name || profile.fullName;
	const name = document.querySelector("[data-profile-name]");
	if (name && profileName) {
		const parts = profileName.trim().split(/\s+/);
		const last = element("span", "", parts.pop());
		name.replaceChildren(document.createTextNode(parts.join(" ")), document.createElement("br"), last);
	}
	for (const [selector, value] of [
		["[data-profile-headline]", profile.title || profile.headline], ["[data-profile-bio]", profile.description || profile.bio],
		["[data-profile-gpa]", profile.gpa], ["[data-profile-university]", profile.university],
		["[data-profile-focus]", profile.focus], ["[data-profile-location]", profile.location]
	]) {
		const target = document.querySelector(selector);
		if (target && value) target.textContent = value;
	}
	const photo = document.querySelector("[data-profile-photo]");
	const imageUrl = safeLink(profile.profileImage || profile.imageUrl)
		|| await storageUrl(services, profile.photoPath);
	if (photo && imageUrl) photo.src = imageUrl;
	if (photo && profileName) photo.alt = profileName;
	const cvUrl = safeLink(profile.cvUrl) || await storageUrl(services, profile.filePath);
	const cvLink = document.querySelector(".btn-cv");
	if (cvLink && cvUrl) cvLink.href = cvUrl;
}

async function loadPublicPortfolio() {
	if (!isFirebaseConfigured()) return;
	const services = await getFirebaseServices();
	const pageName = window.location.pathname.split("/").pop();
	if (pageName === "index.html" || pageName === "about.html") {
		const profileSnapshot = await services.firestoreSdk.getDocs(services.firestoreSdk.query(
			services.firestoreSdk.collection(services.db, "profiles"),
			services.firestoreSdk.where("published", "==", true)
		));
		if (!profileSnapshot.empty) {
			const mainProfile = profileSnapshot.docs.find((record) => record.id === "main") || profileSnapshot.docs[0];
			await applyProfile(mainProfile.data(), services);
		}
	}
	const root = document.querySelector("[data-portfolio-collection]");
	if (!root) return;
	const collection = aliases[root.dataset.portfolioCollection] || root.dataset.portfolioCollection;
	const records = await services.firestoreSdk.getDocs(services.firestoreSdk.query(
		services.firestoreSdk.collection(services.db, collection),
		services.firestoreSdk.where("published", "==", true)
	));
	const entries = records.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
		.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
	await renderCollection(root, collection, entries, services);
}

loadPublicPortfolio().catch((error) => console.warn("Firebase portfolio unavailable; keeping static HTML fallback.", error));