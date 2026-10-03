export const portfolioCollections = {
	profiles: {
		label: "Profile",
		single: true,
		fields: [
			["name", "Full name", "required"],
			["headline", "Headline"],
			["bio", "Bio", "textarea"],
			["description", "Description", "textarea"],
			["location", "Location"],
			["email", "Email", "email"],
			["phone", "Phone", "tel"],
			["profileImage", "Profile image URL", "url"],
			["gpa", "GPA"],
			["university", "University"],
			["cvUrl", "CV URL", "url"],
			["published", "Published", "checkbox"]
		]
	},
	experiences: {
		label: "Experience",
		fields: [
			["position", "Position", "required"], ["company", "Company"], ["location", "Location"],
			["startDate", "Start date", "date"], ["endDate", "End date", "date"],
			["description", "Description", "textarea"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	education: {
		label: "Education",
		fields: [
			["institution", "Institution", "required"], ["degree", "Degree"], ["field", "Field of study"],
			["startDate", "Start date", "date"], ["endDate", "End date", "date"],
			["description", "Description", "textarea"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	organizations: {
		label: "Organization",
		fields: [
			["organizationName", "Organization name", "required"], ["position", "Position"],
			["startDate", "Start date", "date"], ["endDate", "End date", "date"],
			["description", "Description", "textarea"], ["image", "Image URL", "url"],
			["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	projects: {
		label: "Projects",
		fields: [
			["title", "Title", "required"], ["description", "Description", "textarea"],
			["technologies", "Technologies", "textarea"], ["projectUrl", "Project URL", "url"],
			["githubUrl", "GitHub URL", "url"], ["image", "Image URL", "url"],
			["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	gallery: {
		label: "Gallery",
		fields: [
			["title", "Title", "required"], ["description", "Description", "textarea"],
			["imageUrl", "Image URL", "url"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	publications: {
		label: "Publications",
		fields: [
			["title", "Title", "required"], ["publisher", "Publisher"], ["date", "Date", "date"],
			["description", "Description", "textarea"], ["url", "Publication URL", "url"],
			["contribution", "Contribution", "textarea"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	achievements: {
		label: "Achievements",
		fields: [
			["title", "Title", "required"], ["issuer", "Issuer"], ["date", "Date", "date"],
			["description", "Description", "textarea"], ["image", "Image URL", "url"],
			["url", "Achievement URL", "url"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	certificates: {
		label: "Certificates",
		fields: [
			["title", "Certificate name", "required"], ["issuer", "Issuer"], ["date", "Date", "date"],
			["description", "Description", "textarea"], ["certificateUrl", "Certificate URL", "url"],
			["image", "Image URL", "url"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	skills: {
		label: "Skills",
		fields: [
			["name", "Name", "required"], ["category", "Category"], ["level", "Level"],
			["description", "Description", "textarea"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	socials: {
		label: "Social media",
		fields: [
			["platform", "Platform", "required"], ["username", "Username"], ["url", "Profile URL", "url"],
			["icon", "Icon", "url"], ["published", "Published", "checkbox"], ["order", "Order", "number"]
		]
	},
	contacts: {
		label: "Contact",
		single: true,
		fields: [
			["email", "Email", "email"], ["phone", "Phone", "tel"], ["whatsapp", "WhatsApp"],
			["address", "Address", "textarea"], ["linkedin", "LinkedIn URL", "url"],
			["instagram", "Instagram URL", "url"], ["github", "GitHub URL", "url"],
			["website", "Website URL", "url"], ["published", "Published", "checkbox"]
		]
	}
};
