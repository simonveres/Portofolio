const translationToggle = document.querySelector("#translation-toggle");

if (translationToggle) {
	let isEnglish = false;

	translationToggle.addEventListener("click", () => {
		isEnglish = !isEnglish;

		document.querySelectorAll("[data-id][data-en]").forEach((element) => {
			element.textContent = isEnglish ? element.dataset.en : element.dataset.id;
		});

		translationToggle.textContent = isEnglish
			? "Translate to Indonesian"
			: "Translate to English";
		translationToggle.setAttribute("aria-pressed", String(isEnglish));
	});
}

function googleTranslateElementInit() {
	if (window.google && google.translate) {
		new google.translate.TranslateElement({
			pageLanguage: "id",
			includedLanguages: "id,en",
			buttonText: "Translate",
			autoDisplay: false
		}, "google_translate_element");
	}
}

const translateContainer = document.querySelector("#google_translate_element");

if (translateContainer && !document.querySelector("script[data-google-translate]")) {
	const translateScript = document.createElement("script");

	translateScript.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
	translateScript.async = true;
	translateScript.dataset.googleTranslate = "true";
	document.body.appendChild(translateScript);
}

const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector(".nav-menu");

if (menuToggle && primaryNavigation) {
	const closeMenu = () => {
		menuToggle.classList.remove("is-open");
		primaryNavigation.classList.remove("is-open");
		menuToggle.setAttribute("aria-expanded", "false");
		menuToggle.setAttribute("aria-label", "Open navigation menu");
	};

	menuToggle.addEventListener("click", () => {
		const isOpen = primaryNavigation.classList.toggle("is-open");
		menuToggle.classList.toggle("is-open", isOpen);
		menuToggle.setAttribute("aria-expanded", String(isOpen));
		menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
	});

	primaryNavigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
	window.addEventListener("resize", () => {
		if (window.innerWidth > 768) closeMenu();
	});
}

const aiProfileButton = document.querySelector(".ai-profile-button");
const aiProfilePanel = document.querySelector("#ai-profile-panel");
const aiProfileClose = document.querySelector(".ai-profile-close");
const aiProfileForm = document.querySelector(".ai-profile-form");
const aiProfileInput = document.querySelector("#ai-profile-input");
const aiChatMessages = document.querySelector("#ai-chat-messages");
const aiQuestionButtons = document.querySelectorAll("[data-ai-question]");

if (aiProfileButton && aiProfilePanel && aiProfileForm && aiProfileInput && aiChatMessages) {
	const answers = [
		{
			keywords: ["hello", "hi", "halo", "hey", "hai"],
			text: "Hi! I am Simon's profile assistant. Ask me anything about his background, experience, projects, or skills."
		},
		{
			keywords: ["who is", "about him", "about simon", "profil", "profile", "siapa"],
			text: "Simon Veres Sianturi is an Accounting, Finance, and Tax student at Universitas Kristen Indonesia who is interested in audit, financial analysis, and professional development."
		},
		{
			keywords: ["experience", "pengalaman", "kerja", "auditor", "intern", "worked"],
			text: "Simon worked as a Junior Auditor Intern at KAP Ribka Aretha & Rekan and as a Transfer Pricing Intern at MBC Consulting. His work included audit procedures, documentation, financial analysis, and tax-related projects."
		},
		{
			keywords: ["education", "pendidikan", "kuliah", "university", "universitas", "study", "studies"],
			text: "Simon studies at Universitas Kristen Indonesia, focusing on accounting, finance, audit, and taxation."
		},
		{
			keywords: ["skill", "skills", "keahlian", "excel", "tax", "audit", "good at", "can he"],
			text: "Simon is skilled in financial analysis, audit documentation, taxation, transfer pricing, data analysis, Microsoft Excel, and internal control review."
		},
		{
			keywords: ["project", "projects", "pt santani", "santani", "financial statement"],
			text: "One of Simon's featured projects is a comprehensive financial statement audit for PT Santani Agro Perkasa, covering vouching, tracing, reconciliations, confirmations, working papers, and PSAK compliance."
		},
		{
			keywords: ["organization", "leadership", "hima", "president", "leader"],
			text: "Simon served in HIMA FEB Universitas Kristen Indonesia, progressing from Public Relations Coordinator to President and leading collaborations, events, and student programs."
		},
		{
			keywords: ["certificate", "certificates", "sertifikat", "credential", "award"],
			text: "Simon has certificates and recognitions from internships, training, seminars, competitions, organizational activities, and the UKI Reading Ambassador 2025 program."
		},
		{
			keywords: ["contact", "kontak", "whatsapp", "hubungi", "reach him", "email"],
			text: "You can contact Simon through WhatsApp at +62 852-8415-0827 or visit the Contact page."
		},
		{
			keywords: ["gallery", "foto", "photo", "interest", "interests", "free time"],
			text: "The Gallery shows Simon's academic, professional, organizational, literacy, debate, and internship moments."
		}
	];

	const setPanelState = (isOpen) => {
		aiProfilePanel.hidden = !isOpen;
		aiProfileButton.setAttribute("aria-expanded", String(isOpen));
		if (isOpen) aiProfileInput.focus();
	};

	aiProfileButton.addEventListener("click", () => setPanelState(aiProfilePanel.hidden));
	aiProfileClose?.addEventListener("click", () => setPanelState(false));

	const getAiAnswer = (questionText) => {
		const question = questionText.toLowerCase();
		if (!question) {
			return "Ask me a question about Simon and I will look through his portfolio.";
		}
		const result = answers.find((answer) => answer.keywords.some((keyword) => question.includes(keyword)));
		return result
			? result.text
			: "I do not have that detail yet, but you can ask me about Simon's profile, education, experience, projects, skills, certificates, organization, gallery, or contact details.";
	};

	const scrollChatToBottom = () => {
		aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
	};

	const appendMessage = (text, type) => {
		const message = document.createElement("div");
		message.className = `ai-message ai-message-${type}`;
		message.textContent = text;
		aiChatMessages.appendChild(message);
		scrollChatToBottom();
		return message;
	};

	const answerQuestion = (questionText) => {
		const question = questionText.trim();
		if (!question) return;

		appendMessage(question, "user");
		aiProfileInput.value = "";
		aiProfileInput.style.height = "auto";

		const typing = document.createElement("div");
		typing.className = "ai-message ai-message-bot ai-typing";
		typing.setAttribute("aria-label", "Simon AI is typing");
		typing.innerHTML = "<span></span><span></span><span></span>";
		aiChatMessages.appendChild(typing);
		scrollChatToBottom();

		window.setTimeout(() => {
			typing.remove();
			appendMessage(getAiAnswer(question), "bot");
		}, 520);
	};

	aiProfileForm.addEventListener("submit", (event) => {
		event.preventDefault();
		answerQuestion(aiProfileInput.value);
	});

	aiProfileInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			answerQuestion(aiProfileInput.value);
		}
	});

	aiProfileInput.addEventListener("input", () => {
		aiProfileInput.style.height = "auto";
		aiProfileInput.style.height = `${Math.min(aiProfileInput.scrollHeight, 96)}px`;
	});

	aiQuestionButtons.forEach((button) => {
		button.addEventListener("click", () => {
			answerQuestion(button.dataset.aiQuestion);
			aiProfileInput.focus();
		});
	});
}

const reactiveBoxes = document.querySelectorAll(
	".quick-card, .about-card, .social-card, .gallery-card, .organization-heading, " +
	".timeline-card, .skills-panel, .publication-card, .contact-card, .profile-frame, .ai-profile-panel"
);

reactiveBoxes.forEach((box) => {
	box.classList.add("cursor-reactive");
	box.addEventListener("pointermove", (event) => {
		const bounds = box.getBoundingClientRect();
		const x = ((event.clientX - bounds.left) / bounds.width) * 100;
		const y = ((event.clientY - bounds.top) / bounds.height) * 100;

		box.style.setProperty("--cursor-x", `${x}%`);
		box.style.setProperty("--cursor-y", `${y}%`);
	});
});
