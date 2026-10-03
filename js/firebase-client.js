const sdkVersion = "11.10.0";
let servicesPromise;

function firebaseConfig() {
	return window.PORTFOLIO_FIREBASE_CONFIG || {};
}

export function isFirebaseConfigured() {
	return Object.values(firebaseConfig()).every((value) =>
		typeof value === "string" && value.trim() !== "" && !value.includes("..."));
}

export function getFirebaseServices() {
	if (!isFirebaseConfigured()) {
		return Promise.reject(new Error("Firebase belum dikonfigurasi. Isi js/firebase-config.js dari Firebase Web App."));
	}

	if (!servicesPromise) {
		const sdkBase = `https://www.gstatic.com/firebasejs/${sdkVersion}`;
		const config = firebaseConfig();
		servicesPromise = Promise.all([
			import(`${sdkBase}/firebase-app.js`),
			import(`${sdkBase}/firebase-auth.js`),
			import(`${sdkBase}/firebase-firestore.js`)
		]).then(([appSdk, authSdk, firestoreSdk]) => {
			const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config);
			return {
				app,
				auth: authSdk.getAuth(app),
				db: firestoreSdk.getFirestore(app),
				authSdk,
				firestoreSdk
			};
		}).catch((error) => {
			servicesPromise = undefined;
			throw new Error(`Firebase SDK gagal dimuat: ${error.message}`);
		});
	}

	return servicesPromise;
}