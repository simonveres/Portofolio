import { getFirebaseServices } from "./firebase-client.js";

const registerForm = document.querySelector("#user-register-form");
const loginForm = document.querySelector("#user-login-form");
const notice = document.querySelector("#user-account-notice");

function showNotice(message, isError = false) {
	if (!notice) return;
	notice.textContent = message;
	notice.classList.toggle("is-error", isError);
}

function friendlyError(error) {
	const messages = {
		"auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
		"auth/invalid-email": "Format email tidak valid.",
		"auth/weak-password": "Gunakan password minimal 8 karakter.",
		"auth/invalid-credential": "Email atau password tidak cocok.",
		"auth/user-not-found": "Akun tidak ditemukan. Silakan daftar terlebih dahulu.",
		"auth/wrong-password": "Email atau password tidak cocok.",
		"permission-denied": "Akun belum dapat dibuat. Periksa Firestore Rules atau hubungi admin."
	};
	return messages[error.code] || "Permintaan gagal. Periksa koneksi dan coba lagi.";
}

async function userIsAdmin(services, uid) {
	const reference = services.firestoreSdk.doc(services.db, "admins", uid);
	const snapshot = await services.firestoreSdk.getDoc(reference);
	return snapshot.exists() && snapshot.data().active === true;
}

async function ensureUserRecord(services, user, name = "") {
	const reference = services.firestoreSdk.doc(services.db, "users", user.uid);
	const snapshot = await services.firestoreSdk.getDoc(reference);
	if (snapshot.exists()) return snapshot.data();

	const timestamp = services.firestoreSdk.serverTimestamp();
	const record = {
		uid: user.uid,
		email: user.email || "",
		name: name.trim(),
		username: "",
		role: "user",
		accountStatus: "pending",
		paymentStatus: "unpaid",
		portfolioStatus: "draft",
		createdAt: timestamp,
		updatedAt: timestamp
	};
	await services.firestoreSdk.setDoc(reference, record);
	return record;
}

async function routeSignedInUser(services, user, name = "") {
	if (await userIsAdmin(services, user.uid)) {
		window.location.replace("admin/dashboard.html");
		return;
	}
	const record = await ensureUserRecord(services, user, name);
	if (record.role !== "user") {
		await services.authSdk.signOut(services.auth);
		throw new Error("Akun belum memiliki akses. Hubungi admin.");
	}
	window.location.replace("dashboard/user.html");
}

if (registerForm) {
	registerForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const name = registerForm.elements.namedItem("name").value.trim();
		const email = registerForm.elements.namedItem("email").value.trim();
		const password = registerForm.elements.namedItem("password");
		const confirmation = registerForm.elements.namedItem("confirmPassword");
		const submit = registerForm.querySelector("button[type='submit']");

		if (password.value.length < 8) {
			showNotice("Password harus memiliki minimal 8 karakter.", true);
			return;
		}
		if (password.value !== confirmation.value) {
			showNotice("Konfirmasi password tidak sama.", true);
			confirmation.value = "";
			confirmation.focus();
			return;
		}

		submit.disabled = true;
		showNotice("Membuat akun...");
		try {
			const services = await getFirebaseServices();
			const credential = await services.authSdk.createUserWithEmailAndPassword(
				services.auth,
				email,
				password.value
			);
			await ensureUserRecord(services, credential.user, name);
			window.location.replace("dashboard/user.html");
		} catch (error) {
			showNotice(friendlyError(error), true);
		} finally {
			password.value = "";
			confirmation.value = "";
			submit.disabled = false;
		}
	});
}

if (loginForm) {
	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const email = loginForm.elements.namedItem("email").value.trim();
		const password = loginForm.elements.namedItem("password");
		const submit = loginForm.querySelector("button[type='submit']");
		submit.disabled = true;
		showNotice("Memeriksa akun...");
		try {
			const services = await getFirebaseServices();
			const credential = await services.authSdk.signInWithEmailAndPassword(
				services.auth,
				email,
				password.value
			);
			await routeSignedInUser(services, credential.user);
		} catch (error) {
			showNotice(friendlyError(error), true);
		} finally {
			password.value = "";
			submit.disabled = false;
		}
	});
}
