const portfolioConfigUrl = new URL("supabase-config.js", document.currentScript.src);

function loadPortfolioScript(url) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = url;
		script.onload = resolve;
		script.onerror = () => reject(new Error("Portfolio backend could not be loaded."));
		document.head.appendChild(script);
	});
}

function safePortfolioLink(value) {
	if (!value) return "";
	try {
		const url = new URL(value, window.location.href);
		return ["http:", "https:"].includes(url.protocol) ? url.href : "";
	} catch {
		return "";
	}
}

function portfolioElement(tag, className, text) {
	const element = document.createElement(tag);
	if (className) element.className = className;
	element.textContent = text || "";
	return element;
}

function addPortfolioDetails(parent, details) {
	if (!Array.isArray(details) || !details.length) return;
	const list = document.createElement("ul");
	for (const detail of details) {
		const item = portfolioElement("li", "", typeof detail === "string" ? detail : detail?.text);
		if (item.textContent) list.append(item);
	}
	if (list.childElementCount) parent.append(list);
}

function makePortfolioCard(entry, index, collection) {
	if (collection === "gallery_items") {
		const card = portfolioElement("article", "gallery-card", "");
		const imageUrl = safePortfolioLink(entry.image_url);
		if (imageUrl) {
			const link = document.createElement("a");
			link.href = imageUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			const image = document.createElement("img");
			image.src = imageUrl;
			image.alt = entry.title || "Portfolio image";
			image.loading = "lazy";
			link.append(image);
			card.append(link);
		}
		const copy = portfolioElement("div", "gallery-copy", "");
		copy.append(portfolioElement("h3", "", entry.title), portfolioElement("p", "", entry.description));
		card.append(copy);
		return card;
	}

	if (collection === "projects") {
		const card = portfolioElement("article", "project-feature", "");
		const imageUrl = safePortfolioLink(entry.image_url);
		if (imageUrl) {
			const imageLink = portfolioElement("a", "project-image", "");
			imageLink.href = imageUrl;
			imageLink.target = "_blank";
			imageLink.rel = "noopener noreferrer";
			const image = document.createElement("img");
			image.src = imageUrl;
			image.alt = entry.title || "Project image";
			image.loading = "lazy";
			imageLink.append(image);
			card.append(imageLink);
		}
		const content = portfolioElement("div", "project-content", "");
		content.append(portfolioElement("span", "project-kicker", entry.period || entry.subtitle));
		content.append(portfolioElement("h3", "", entry.title), portfolioElement("h4", "", entry.organization));
		content.append(portfolioElement("p", "", entry.description));
		addPortfolioDetails(content, entry.details);
		const linkUrl = safePortfolioLink(entry.link_url);
		if (linkUrl) {
			const link = portfolioElement("a", "publication-link", "View project");
			link.href = linkUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			content.append(link);
		}
		card.append(content);
		return card;
	}

	if (collection === "education") {
		const item = portfolioElement("article", "timeline-item", "");
		item.append(portfolioElement("span", "timeline-dot", ""));
		const content = portfolioElement("div", "timeline-card", "");
		content.append(portfolioElement("span", "timeline-year", entry.period));
		content.append(portfolioElement("h3", "", entry.title), portfolioElement("h4", "", entry.subtitle || entry.organization));
		content.append(portfolioElement("p", "", entry.description));
		item.append(content);
		return item;
	}

	const isCertificate = collection === "certificates";
	const card = portfolioElement("article", `about-card organization-card${isCertificate ? " certificate-card" : ""}`, "");
	card.append(portfolioElement("span", "card-number", String(index + 1).padStart(2, "0")));
	if (entry.period) card.append(portfolioElement("span", "timeline-year", entry.period));
	const documentUrl = safePortfolioLink(entry.link_url || entry.image_url);
	const previewUrl = safePortfolioLink(entry.image_url);
	if (isCertificate && previewUrl) {
		const preview = portfolioElement("a", "certificate-preview", "");
		preview.href = documentUrl || previewUrl;
		preview.target = "_blank";
		preview.rel = "noopener noreferrer";
		const image = document.createElement("img");
		image.src = previewUrl;
		image.alt = entry.title || "Certificate preview";
		image.loading = "lazy";
		preview.append(image);
		card.append(preview);
	}
	if (isCertificate && documentUrl) {
		const link = portfolioElement("a", "certificate-link", "Open certificate");
		link.href = documentUrl;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		card.append(link);
	}
	card.append(portfolioElement("h3", "", entry.title));
	if (entry.subtitle || entry.organization) {
		card.append(portfolioElement("h4", "", [entry.subtitle, entry.organization].filter(Boolean).join(" · ")));
	}
	card.append(portfolioElement("p", "", entry.description));
	addPortfolioDetails(card, entry.details);
	return card;
}

function renderPortfolioSkills(root, entries) {
	const groups = new Map();
	for (const entry of entries) {
		const label = entry.subtitle || "Skills";
		if (!groups.has(label)) groups.set(label, []);
		groups.get(label).push(entry);
	}
	const panels = [...groups].map(([label, skills], index) => {
		const panel = portfolioElement("article", "skills-panel", "");
		const heading = portfolioElement("div", "skills-panel-heading", "");
		heading.append(portfolioElement("span", "skills-number", String(index + 1).padStart(2, "0")));
		const title = portfolioElement("div", "", "");
		title.append(portfolioElement("span", "small-title", label.toUpperCase()), portfolioElement("h2", "", label));
		heading.append(title);
		const list = portfolioElement("ul", "skills-list", "");
		for (const skill of skills) list.append(portfolioElement("li", "", skill.title));
		panel.append(heading, list);
		return panel;
	});
	root.replaceChildren(...panels);
}

function makePortfolioSocialCard(entry) {
	const linkUrl = safePortfolioLink(entry.link_url);
	const card = linkUrl ? document.createElement("a") : document.createElement("article");
	card.className = "social-card";
	if (linkUrl) {
		card.href = linkUrl;
		card.target = "_blank";
		card.rel = "noopener noreferrer";
	}
	const imageUrl = safePortfolioLink(entry.image_url);
	if (imageUrl) {
		const icon = portfolioElement("span", "social-icon", "");
		const image = document.createElement("img");
		image.src = imageUrl;
		image.alt = `${entry.title || "Social media"} logo`;
		icon.append(image);
		card.append(icon);
	}
	const copy = portfolioElement("span", "social-copy", "");
	copy.append(portfolioElement("strong", "", entry.title));
	copy.append(portfolioElement("span", "", entry.subtitle));
	copy.append(portfolioElement("small", "", entry.organization || entry.link_url));
	card.append(copy, portfolioElement("span", "social-arrow", "↗"));
	return card;
}

function renderPortfolioCollection(root, collection, entries) {
	if (!entries.length) return;
	if (collection === "skills") {
		renderPortfolioSkills(root, entries);
		return;
	}
	const cards = entries.map((entry, index) => collection === "social_links"
		? makePortfolioSocialCard(entry)
		: makePortfolioCard(entry, index, collection));
	if (["projects", "publications"].includes(collection)) {
		const heading = root.querySelector(":scope > .organization-heading");
		root.replaceChildren(...(heading ? [heading] : []), ...cards);
		return;
	}
	root.replaceChildren(...cards);
}

function applyPortfolioProfile(profile) {
	if (!profile) return;
	const nameHeading = document.querySelector("[data-profile-name]");
	if (nameHeading && profile.full_name) {
		const names = profile.full_name.trim().split(/\s+/);
		const lastName = document.createElement("span");
		lastName.textContent = names.pop();
		nameHeading.replaceChildren(document.createTextNode(names.join(" ")), document.createElement("br"), lastName);
	}
	const values = [
		["[data-profile-headline]", profile.headline], ["[data-profile-gpa]", profile.gpa],
		["[data-profile-university]", profile.university], ["[data-profile-focus]", profile.focus],
		["[data-profile-location]", profile.location], ["[data-profile-bio]", profile.bio]
	];
	for (const [selector, value] of values) {
		const element = document.querySelector(selector);
		if (element && value) element.textContent = value;
	}
	const photo = document.querySelector("[data-profile-photo]");
	const photoUrl = safePortfolioLink(profile.photo_url);
	if (photo && photoUrl) photo.src = photoUrl;
	if (photo && profile.full_name) photo.alt = profile.full_name;
	const cvLink = document.querySelector(".btn-cv");
	const cvUrl = safePortfolioLink(profile.cv_url);
	if (cvLink && cvUrl) cvLink.href = cvUrl;
}

async function connectPortfolioContent() {
	if (!window.PORTFOLIO_SUPABASE) await loadPortfolioScript(portfolioConfigUrl.href);
	const config = window.PORTFOLIO_SUPABASE;
	if (!config?.url || !config?.anonKey) return;
	if (!window.supabase?.createClient) await loadPortfolioScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
	const client = window.supabase.createClient(config.url, config.anonKey);
	const pageName = window.location.pathname.split("/").pop();
	if (pageName === "index.html" || pageName === "about.html") {
		const { data } = await client.from("profiles").select("*").eq("id", "main").maybeSingle();
		applyPortfolioProfile(data);
	}
	const root = document.querySelector("[data-portfolio-collection]");
	if (!root) return;
	const collection = root.dataset.portfolioCollection;
	const { data, error } = await client.from(collection).select("*").eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
	if (!error) renderPortfolioCollection(root, collection, data || []);
}

connectPortfolioContent().catch((error) => console.error("Could not load portfolio data:", error));