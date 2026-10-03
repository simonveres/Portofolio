import { getFirebaseServices } from "./firebase-client.js";

const platformName = document.querySelector("#builder-platform-name");
const priceLabel = document.querySelector("#builder-price");

try {
	const services = await getFirebaseServices();
	const snapshot = await services.firestoreSdk.getDoc(
		services.firestoreSdk.doc(services.db, "settings", "platform")
	);
	if (snapshot.exists()) {
		const settings = snapshot.data();
		if (settings.platformName) platformName.textContent = settings.platformName;
		if (Number(settings.portfolioPrice) > 0) {
			priceLabel.textContent = `Mulai dari ${new Intl.NumberFormat("id-ID", {
				style: "currency",
				currency: settings.currency || "IDR",
				maximumFractionDigits: 0
			}).format(settings.portfolioPrice)}.`;
		}
	}
} catch (error) {
	console.warn("Platform settings unavailable; showing fallback landing text.", error.message);
}
