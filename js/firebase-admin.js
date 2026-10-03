import { getFirebaseServices } from "./firebase-client.js";
import { portfolioCollections as collections } from "./portfolio-schema.js";

const pageName = window.location.pathname.split("/").pop();
const isDashboard = pageName === "dashboard.html";

const loginForm = document.querySelector("#login-form");
const loginNotice = document.querySelector("#login-notice");
const dashboard = document.querySelector("#dashboard");
const dashboardNotice = document.querySelector("#dashboard-notice");
const overviewNotice = document.querySelector("#overview-notice");
const dashboardFallbackNotice = document.querySelector(
    "#dashboard-notice-fallback"
);
const dashboardOverview = document.querySelector("#dashboard-overview");
const collectionView = document.querySelector("#collection-view");
const adminManagementView = document.querySelector("#admin-management-view");
const managementNotice = document.querySelector("#management-notice");
const managementHead = document.querySelector("#management-head");
const managementRows = document.querySelector("#management-rows");
const managementTableWrap = document.querySelector("#management-table-wrap");
const platformSettingsForm = document.querySelector("#platform-settings-form");

let loginServices = null;
let activeCollection = "profiles";

/* =========================
   NOTICE
========================= */

function setNotice(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("is-error", isError);
}

function showLoginNotice(message, isError = true) {
    setNotice(loginNotice, message, isError);

    if (isDashboard) {
        sessionStorage.setItem(
            "firebaseAdminNotice",
            message
        );
    }
}

/* =========================
   CEK ADMIN
========================= */

async function userIsAdmin(db, firestoreSdk, uid) {
    try {
        console.log("================================");
        console.log("ADMIN CHECK");
        console.log("Firebase Project ID:", db?._databaseId?.projectId);
        console.log("Firebase Auth UID:", uid);
        console.log(
            "Document path:",
            `admins/${uid}`
        );
        console.log("================================");

        const adminRef = firestoreSdk.doc(
            db,
            "admins",
            uid
        );

        console.log(
            "Reading Firestore document..."
        );

        const snapshot =
            await firestoreSdk.getDoc(adminRef);

        console.log(
            "Admin document exists:",
            snapshot.exists()
        );

        if (!snapshot.exists()) {
            console.error(
                "ADMIN DOCUMENT TIDAK DITEMUKAN"
            );

            return {
                isAdmin: false,
                reason: "missing",
                uid
            };
        }

        const data = snapshot.data();

        console.log(
            "Admin document data:",
            data
        );

        console.log(
            "Admin active value:",
            data.active
        );

        console.log(
            "Admin active type:",
            typeof data.active
        );

        if (data.active !== true) {
            return {
                isAdmin: false,
                reason: "inactive",
                uid
            };
        }

        return {
            isAdmin: true,
            reason: "active",
            uid
        };

    } catch (error) {
        console.error(
            "ADMIN CHECK ERROR"
        );

        console.error(
            "Error code:",
            error.code
        );

        console.error(
            "Error message:",
            error.message
        );

        return {
            isAdmin: false,
            reason: "error",
            uid,
            error
        };
    }
}

/* =========================
   LOGIN
========================= */

loginForm?.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const emailInput =
            loginForm.querySelector(
                "#login-email"
            );

        const passwordInput =
            loginForm.querySelector(
                "#login-password"
            );

        const submitButton =
            loginForm.querySelector(
                "button[type='submit']"
            );

        if (!loginServices) {
            passwordInput.value = "";

            showLoginNotice(
                "Firebase Auth is not ready. Check the Firebase configuration and try again."
            );

            return;
        }

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (!email || !password) {
            showLoginNotice(
                "Email dan password wajib diisi."
            );

            return;
        }

        submitButton.disabled = true;

        setNotice(
            loginNotice,
            "Signing in..."
        );

        try {
            await loginServices.authSdk
                .signInWithEmailAndPassword(
                    loginServices.auth,
                    email,
                    password
                );

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            showLoginNotice(
                `Login failed: ${error.message}`
            );

        } finally {
            passwordInput.value = "";
            submitButton.disabled = false;
        }
    }
);

/* =========================
   FIELD GENERATOR
========================= */

function makeField([
    name,
    label,
    type
]) {
    const group =
        document.createElement("div");

    group.className =
        "field-group";

    const fieldLabel =
        document.createElement("label");

    fieldLabel.htmlFor =
        `field-${name}`;

    fieldLabel.textContent =
        label;

    let input;

    if (
        type === "textarea" ||
        type === "json"
    ) {
        input =
            document.createElement(
                "textarea"
            );
    } else {
        input =
            document.createElement(
                "input"
            );
    }

    input.id =
        `field-${name}`;

    input.name =
        name;

    if (["number", "checkbox", "email", "tel", "url", "date"].includes(type)) {
        input.type = type;
    }

    if (type === "required") {
        input.required = true;
    }

    if (type === "json") {
        input.rows = 5;

        input.placeholder =
            '["Responsibility one", "Responsibility two"]';
    }

    if (type === "textarea") {
        input.rows = 4;
    }

    group.append(
        fieldLabel,
        input
    );

    return group;
}

/* =========================
   RENDER FIELDS
========================= */

function renderFields(
    collection,
    entry = {}
) {
    const fieldsRoot =
        document.querySelector(
            "#editor-fields"
        );

    const form =
        document.querySelector(
            "#entry-form"
        );

    if (!fieldsRoot || !form) {
        return;
    }

    fieldsRoot.replaceChildren(
        ...collections[
            collection
        ].fields.map(makeField)
    );

    for (
        const [name]
        of collections[
            collection
        ].fields
    ) {
        const input =
            form.elements.namedItem(
                name
            );

        if (!input) continue;

        if (name === "details") {
            input.value =
                JSON.stringify(
                    entry[name] ?? [],
                    null,
                    2
                );

        } else if (
            name === "published"
        ) {
            input.checked =
                entry[name] ?? true;

        } else if (
            name === "order"
        ) {
            input.value =
                entry[name] ?? "0";

        } else {
            input.value =
                entry[name] ?? "";
        }
    }
}

/* =========================
   RENDER ENTRIES
========================= */

function renderEntries(
    entries,
    collection,
    services
) {
    const root =
        document.querySelector(
            "#entry-list"
        );

    const addButton =
        document.querySelector(
            "#new-entry-button"
        );

    if (!root || !addButton) {
        return;
    }

    root.replaceChildren();

    addButton.hidden =
        Boolean(
            collections[
                collection
            ].single &&
            entries.length
        );

    if (!entries.length) {
        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "empty-state";

        empty.textContent =
            "No records in this collection yet.";

        root.append(empty);

        return;
    }

    for (const entry of entries) {
        const row =
            document.createElement(
                "article"
            );

        row.className =
            "entry-row";

        const summary =
            document.createElement(
                "div"
            );

        const title =
            document.createElement(
                "h2"
            );

        title.textContent =
            entry.title ||
            entry.name ||
            entry.position ||
            entry.organizationName ||
            entry.platform ||
            entry.institution ||
            entry.fullName ||
            entry.email ||
            collections[
                collection
            ].label;

        const detail =
            document.createElement(
                "p"
            );

        detail.textContent =
            entry.subtitle ||
            entry.company ||
            entry.degree ||
            entry.publisher ||
            entry.issuer ||
            entry.category ||
            entry.username ||
            entry.organization ||
            entry.headline ||
            entry.location ||
            "";

        const status =
            document.createElement(
                "span"
            );

        status.className =
            entry.published === false
                ? "entry-status"
                : "entry-status is-live";

        status.textContent =
            entry.published === false
                ? "Draft"
                : "Published";

        const updated = document.createElement("small");
        updated.className = "entry-updated";
        const updatedAt = entry.updatedAt?.toDate?.();
        updated.textContent = updatedAt
            ? `Updated ${updatedAt.toLocaleString()}`
            : "Not updated yet";

        const buttons =
            document.createElement(
                "div"
            );

        buttons.className =
            "entry-actions";

        const edit =
            document.createElement(
                "button"
            );

        edit.type = "button";
        edit.className =
            "button button-quiet";
        edit.textContent = "Edit";

        edit.addEventListener(
            "click",
            () => {
                openEditor(
                    entry,
                    collection,
                    services
                );
            }
        );

        const remove =
            document.createElement(
                "button"
            );

        remove.type = "button";
        remove.className =
            "button button-danger";
        remove.textContent = "Delete";

        remove.addEventListener(
            "click",
            () => {
                deleteEntry(
                    entry,
                    collection,
                    services
                );
            }
        );

        buttons.append(
            edit,
            remove
        );

        summary.append(
            title,
            detail,
            status,
            updated
        );

        row.append(
            summary,
            buttons
        );

        root.append(row);
    }
}

/* =========================
   LOAD ENTRIES
========================= */

async function loadEntries(
    services
) {
    const collectionTitle =
        document.querySelector(
            "#collection-title"
        );

    const entryForm =
        document.querySelector(
            "#entry-form"
        );

    if (!collectionView) {
        return;
    }

    const collection = activeCollection;

    const definition =
        collections[
            collection
        ];

    if (collectionTitle) {
        collectionTitle.textContent =
            definition.label;
    }

    if (entryForm) {
        entryForm.hidden = true;
    }

    setNotice(
        dashboardNotice,
        "Loading..."
    );

    try {
        const collectionRef =
            services.firestoreSdk.collection(
                services.db,
                collection
            );

        const snapshot =
            await services.firestoreSdk.getDocs(
                collectionRef
            );

        const entries =
            snapshot.docs.map(
                (document) => ({
                    id: document.id,
                    ...document.data()
                })
            );

        entries.sort(
            (left, right) =>
                (left.order ?? 0) -
                (right.order ?? 0)
        );

        setNotice(
            dashboardNotice,
            ""
        );

        renderEntries(
            entries,
            collection,
            services
        );

    } catch (error) {
        console.error(error);

        setNotice(
            dashboardNotice,
            `Could not read ${definition.label}: ${error.message}`,
            true
        );
    }
}

async function loadDashboardStats(services) {
    const statCollections = [
        "profiles",
        "experiences",
        "organizations",
        "projects",
        "gallery",
        "publications",
        "achievements",
        "certificates"
    ];

    try {
        const counts = await Promise.all(
            statCollections.map(async (collection) => {
                const snapshot = await services.firestoreSdk.getDocs(
                    services.firestoreSdk.collection(services.db, collection)
                );
                return [collection, snapshot.size];
            })
        );

        for (const [collection, count] of counts) {
            const target = document.querySelector(`[data-stat="${collection}"]`);
            if (target) target.textContent = String(count);
        }

        setNotice(overviewNotice, "");
    } catch (error) {
        console.error("Dashboard statistics failed:", error);
        setNotice(overviewNotice, `Could not load statistics: ${error.message}`, true);
    }
}

function userDate(value) {
    return value?.toDate?.().toLocaleDateString("id-ID") || "-";
}

function managementButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${className}`;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

function managementLink(label, username) {
    const link = document.createElement("a");
    link.className = "button button-quiet";
    link.textContent = label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const url = new URL("../portfolio.html", window.location.href);
    url.searchParams.set("username", username);
    url.searchParams.set("preview", "1");
    url.searchParams.set("adminPreview", "1");
    link.href = url.href;
    return link;
}

async function deleteUserPortfolioData(user, services) {
    if (!window.confirm(`Hapus seluruh konten portfolio ${user.name || user.email}? Akun login dan data pembayaran tidak dihapus.`)) return;
    const firestore = services.firestoreSdk;
    const names = Object.keys(collections);
    try {
        const snapshots = await Promise.all(names.map((name) => firestore.getDocs(
            firestore.query(firestore.collection(services.db, name), firestore.where("userId", "==", user.uid))
        )));
        const references = snapshots.flatMap((snapshot) => snapshot.docs.map((record) => record.ref));
        for (let start = 0; start < references.length; start += 450) {
            const batch = firestore.writeBatch(services.db);
            references.slice(start, start + 450).forEach((reference) => batch.delete(reference));
            await batch.commit();
        }
        const accountRef = firestore.doc(services.db, "users", user.uid);
        const usernameRef = user.username
            ? firestore.doc(services.db, "usernames", user.username)
            : null;
        const cleanup = firestore.writeBatch(services.db);
        if (usernameRef) cleanup.delete(usernameRef);
        cleanup.update(accountRef, {
            username: "",
            portfolioStatus: "draft",
            updatedAt: firestore.serverTimestamp()
        });
        await cleanup.commit();
        setNotice(managementNotice, "Konten portfolio user dihapus. Akun Firebase Auth tetap ada.");
        await loadAdminManagementView("users", services, currentAdminUser);
    } catch (error) {
        console.error("Portfolio data deletion failed:", error);
        setNotice(managementNotice, `Gagal menghapus konten portfolio: ${error.message}`, true);
    }
}

let currentAdminUser = null;

async function updateManagedUser(user, action, services) {
    const descriptions = {
        approve: `Konfirmasi pembayaran ${user.name || user.email} dan publikasikan portfolio?`,
        pending: `Tandai pembayaran ${user.name || user.email} sedang menunggu verifikasi?`,
        reject: `Tolak pembayaran ${user.name || user.email}?`,
        suspend: `Nonaktifkan akun ${user.name || user.email}?`,
        activate: `Aktifkan akun ${user.name || user.email}?`,
        unpublish: `Batalkan publikasi portfolio ${user.name || user.email}?`
    };
    if (!window.confirm(descriptions[action])) return;
    const firestore = services.firestoreSdk;
    const changes = { updatedAt: firestore.serverTimestamp() };
    if (action === "pending") changes.paymentStatus = "pending";
    if (action === "approve") Object.assign(changes, {
        paymentStatus: "paid",
        accountStatus: "active",
        portfolioStatus: "published",
        approvedAt: firestore.serverTimestamp(),
        approvedBy: currentAdminUser.uid
    });
    if (action === "reject") Object.assign(changes, {
        paymentStatus: "rejected",
        portfolioStatus: "draft"
    });
    if (action === "suspend") changes.accountStatus = "suspended";
    if (action === "activate") changes.accountStatus = "active";
    if (action === "unpublish") changes.portfolioStatus = "draft";

    try {
        await firestore.updateDoc(firestore.doc(services.db, "users", user.uid), changes);
        setNotice(managementNotice, "Status user berhasil diperbarui.");
        await loadAdminManagementView(["approve", "pending", "reject"].includes(action) ? "payments" : "users", services, currentAdminUser);
    } catch (error) {
        console.error("User status update failed:", error);
        setNotice(managementNotice, `Gagal memperbarui status: ${error.message}`, true);
    }
}

async function loadAdminManagementView(view, services, adminUser) {
    adminManagementView.hidden = false;
    dashboardOverview.hidden = true;
    collectionView.hidden = true;
    const title = document.querySelector("#management-title");
    platformSettingsForm.hidden = view !== "settings";
    managementTableWrap.hidden = view === "settings";
    title.textContent = ({ users: "Users", payments: "Payments", portfolios: "Portfolios", settings: "Settings" })[view];
    setNotice(managementNotice, "Memuat data...");

    if (view === "settings") {
        try {
            const snapshot = await services.firestoreSdk.getDoc(services.firestoreSdk.doc(services.db, "settings", "platform"));
            const settings = snapshot.exists() ? snapshot.data() : {};
            platformSettingsForm.elements.namedItem("platformName").value = settings.platformName || "Portfolio Builder";
            platformSettingsForm.elements.namedItem("whatsappNumber").value = settings.whatsappNumber || "";
            platformSettingsForm.elements.namedItem("portfolioPrice").value = settings.portfolioPrice ?? 0;
            platformSettingsForm.elements.namedItem("currency").value = settings.currency || "IDR";
            setNotice(managementNotice, "");
        } catch (error) {
            setNotice(managementNotice, `Gagal memuat settings: ${error.message}`, true);
        }
        return;
    }

    try {
        const snapshot = await services.firestoreSdk.getDocs(services.firestoreSdk.collection(services.db, "users"));
        const users = snapshot.docs.map((record) => ({ uid: record.id, ...record.data() }));
        const headings = view === "payments"
            ? ["Name", "Email", "Username", "Payment", "Account", "Portfolio", "Registered", "Actions"]
            : ["Name", "Email", "Username", "Payment", "Account", "Portfolio", "Registered", "Actions"];
        managementHead.replaceChildren();
        const headerRow = document.createElement("tr");
        headings.forEach((heading) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = heading;
            headerRow.append(cell);
        });
        managementHead.append(headerRow);
        managementRows.replaceChildren();

        const visibleUsers = view === "payments"
            ? users.filter((user) => ["unpaid", "pending", "rejected"].includes(user.paymentStatus))
            : view === "portfolios"
                ? users.filter((user) => user.username || user.portfolioStatus === "published")
                : users;

        for (const user of visibleUsers) {
            const row = document.createElement("tr");
            for (const value of [
                user.name || "-", user.email || "-", user.username || "-",
                user.paymentStatus || "unpaid", user.accountStatus || "pending",
                user.portfolioStatus || "draft", userDate(user.createdAt)
            ]) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.append(cell);
            }
            const actions = document.createElement("td");
            actions.className = "management-actions";
            if (view === "payments") {
                if (user.username) actions.append(managementLink("View", user.username));
                if (user.paymentStatus === "pending") {
                    actions.append(managementButton("Approve", "button-primary", () => updateManagedUser(user, "approve", services)));
                    actions.append(managementButton("Reject", "button-danger", () => updateManagedUser(user, "reject", services)));
                } else if (["unpaid", "rejected"].includes(user.paymentStatus || "unpaid")) {
                    actions.append(managementButton("Mark pending", "button-quiet", () => updateManagedUser(user, "pending", services)));
                }
            } else {
                if (user.username) actions.append(managementLink("Open portfolio", user.username));
                actions.append(managementButton(user.accountStatus === "suspended" ? "Activate" : "Disable", "button-quiet", () => updateManagedUser(user, user.accountStatus === "suspended" ? "activate" : "suspend", services)));
                if (view === "portfolios" && user.portfolioStatus === "published") {
                    actions.append(managementButton("Unpublish", "button-danger", () => updateManagedUser(user, "unpublish", services)));
                }
                actions.append(managementButton("Delete portfolio data", "button-danger", () => deleteUserPortfolioData(user, services)));
            }
            row.append(actions);
            managementRows.append(row);
        }
        if (!visibleUsers.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = headings.length;
            cell.textContent = view === "payments" ? "No outstanding payments." : "No users found.";
            row.append(cell);
            managementRows.append(row);
        }
        setNotice(managementNotice, `${visibleUsers.length} record(s)`);
    } catch (error) {
        console.error("Admin user list failed:", error);
        setNotice(managementNotice, `Gagal memuat data: ${error.message}`, true);
    }
}

function attachSettingsSave(services) {
    platformSettingsForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const number = form.elements.namedItem("whatsappNumber").value.replace(/\D/g, "");
        const currency = form.elements.namedItem("currency").value.trim().toUpperCase();
        if (number && !/^\d{8,15}$/.test(number)) {
            setNotice(managementNotice, "Nomor WhatsApp harus berformat internasional, misalnya 628xxxxxxxxxx.", true);
            return;
        }
        if (!/^[A-Z]{3}$/.test(currency)) {
            setNotice(managementNotice, "Kode mata uang harus terdiri dari 3 huruf, misalnya IDR.", true);
            return;
        }
        const firestore = services.firestoreSdk;
        try {
            await firestore.setDoc(firestore.doc(services.db, "settings", "platform"), {
                platformName: form.elements.namedItem("platformName").value.trim(),
                whatsappNumber: number,
                portfolioPrice: Number(form.elements.namedItem("portfolioPrice").value || 0),
                currency,
                updatedAt: firestore.serverTimestamp()
            }, { merge: true });
            setNotice(managementNotice, "Settings tersimpan.");
        } catch (error) {
            setNotice(managementNotice, `Gagal menyimpan settings: ${error.message}`, true);
        }
    });
}

/* =========================
   OPEN EDITOR
========================= */

function openEditor(
    entry,
    collection,
    services
) {
    const form =
        document.querySelector(
            "#entry-form"
        );

    if (!form) {
        return;
    }

    form.dataset.documentId =
        entry.id || "";

    form.dataset.collection =
        collection;

    renderFields(
        collection,
        entry
    );

    form.hidden = false;

    setNotice(
        dashboardNotice,
        ""
    );

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================
   SAVE ENTRY
========================= */

async function saveEntry(
    event,
    services
) {
    event.preventDefault();

    const form =
        event.currentTarget;

    const collection =
        form.dataset.collection ||
        activeCollection;

    const definition =
        collections[
            collection
        ];

    const payload = {};

    for (
        const [name, , type]
        of definition.fields
    ) {
        const field =
            form.elements.namedItem(
                name
            );

        if (!field) continue;

        if (type === "checkbox") {
            payload[name] =
                field.checked;

        } else if (
            type === "number"
        ) {
            payload[name] =
                Number(
                    field.value || 0
                );

        } else if (
            type === "json"
        ) {
            try {
                payload[name] =
                    JSON.parse(
                        field.value || "[]"
                    );

            } catch {
                setNotice(
                    dashboardNotice,
                    "Details must be a valid JSON array.",
                    true
                );

                return;
            }

        } else {
            payload[name] =
                field.value.trim();
        }
    }

    payload.published ??= true;
    if (definition.fields.some(([name]) => name === "order")) {
        payload.order ??= 0;
    }

    setNotice(
        dashboardNotice,
        "Saving..."
    );

    try {
        const id =
            definition.single
                ? "main"
                : (
                    form.dataset.documentId ||
                    null
                );

        const reference =
            id
                ? services.firestoreSdk.doc(
                    services.db,
                    collection,
                    id
                )
                : services.firestoreSdk.doc(
                    services.firestoreSdk.collection(
                        services.db,
                        collection
                    )
                );

        payload.updatedAt =
            services.firestoreSdk.serverTimestamp();

        if (
            !form.dataset.documentId &&
            !definition.single
        ) {
            payload.createdAt =
                services.firestoreSdk.serverTimestamp();
        }

        await services.firestoreSdk.setDoc(
            reference,
            payload,
            {
                merge: true
            }
        );

        form.hidden = true;

        setNotice(
            dashboardNotice,
            "Saved to Firebase."
        );

        await loadEntries(
            services
        );
        await loadDashboardStats(services);

    } catch (error) {
        console.error(error);

        setNotice(
            dashboardNotice,
            `Save failed: ${error.message}`,
            true
        );
    }
}

/* =========================
   DELETE ENTRY
========================= */

async function deleteEntry(
    entry,
    collection,
    services
) {
    if (
        !window.confirm(
            "Delete this record? This cannot be undone."
        )
    ) {
        return;
    }

    try {
        await services.firestoreSdk.deleteDoc(
            services.firestoreSdk.doc(
                services.db,
                collection,
                entry.id
            )
        );

        setNotice(
            dashboardNotice,
            "Record deleted."
        );

        await loadEntries(
            services
        );
        await loadDashboardStats(services);

    } catch (error) {
        console.error(error);

        setNotice(
            dashboardNotice,
            `Delete failed: ${error.message}`,
            true
        );
    }
}

/* =========================
   LOGIN PAGE
========================= */

async function startLoginPage() {
    const notice =
        sessionStorage.getItem(
            "firebaseAdminNotice"
        );

    if (notice) {
        showLoginNotice(notice);

        sessionStorage.removeItem(
            "firebaseAdminNotice"
        );
    }

    try {
        loginServices =
            await getFirebaseServices();

        console.log(
            "Firebase services loaded successfully."
        );

        console.log(
            "Firebase Project:",
            loginServices.app?.options?.projectId
        );

    } catch (error) {
        console.error(
            "Firebase initialization error:",
            error
        );

        showLoginNotice(
            error.message
        );

        loginForm
            ?.querySelectorAll(
                "input, button"
            )
            .forEach((input) => {
                input.disabled = true;
            });

        return;
    }

    loginServices.authSdk.onAuthStateChanged(
        loginServices.auth,
        async (user) => {
            if (!user) {
                return;
            }

            console.log(
                "================================"
            );

            console.log(
                "CURRENT FIREBASE USER"
            );

            console.log(
                "Email:",
                user.email
            );

            console.log(
                "UID:",
                user.uid
            );

            console.log(
                "================================"
            );

            try {
                const admin =
                    await userIsAdmin(
                        loginServices.db,
                        loginServices.firestoreSdk,
                        user.uid
                    );

                if (admin.isAdmin) {
                    console.log(
                        "ADMIN VERIFIED"
                    );

                    window.location.replace(
                        "dashboard.html"
                    );

                    return;
                }

                await loginServices.authSdk.signOut(
                    loginServices.auth
                );

                if (
                    admin.reason ===
                    "missing"
                ) {
                    showLoginNotice(
                        `Admin belum terdaftar. UID akun kamu: ${admin.uid}`
                    );

                } else if (
                    admin.reason ===
                    "inactive"
                ) {
                    showLoginNotice(
                        `Admin ditemukan, tetapi active bukan true. UID: ${admin.uid}`
                    );

                } else if (
                    admin.reason ===
                    "error"
                ) {
                    showLoginNotice(
                        `Gagal mengecek admin: ${admin.error?.message || "Unknown error"}`
                    );

                } else {
                    showLoginNotice(
                        `Akun bukan admin. UID akun kamu: ${admin.uid}`
                    );
                }

            } catch (error) {
                console.error(
                    "Admin verification error:",
                    error
                );

                await loginServices.authSdk
                    .signOut(
                        loginServices.auth
                    )
                    .catch(() => {});

                showLoginNotice(
                    `Admin access could not be verified: ${error.message}`
                );
            }
        }
    );
}

/* =========================
   DASHBOARD PAGE
========================= */

async function startDashboardPage() {
    let services;

    try {
        services =
            await getFirebaseServices();

        console.log(
            "Dashboard Firebase Project:",
            services.app?.options?.projectId
        );

    } catch (error) {
        console.error(
            "Firebase initialization error:",
            error
        );

        sessionStorage.setItem(
            "firebaseAdminNotice",
            error.message
        );

        window.location.replace(
            "index.html"
        );

        return;
    }

    services.authSdk.onAuthStateChanged(
        services.auth,
        async (user) => {
            if (!user) {
                window.location.replace(
                    "index.html"
                );

                return;
            }

            try {
                const admin =
                    await userIsAdmin(
                        services.db,
                        services.firestoreSdk,
                        user.uid
                    );

                if (!admin.isAdmin) {
                    await services.authSdk.signOut(
                        services.auth
                    );

                    sessionStorage.setItem(
                        "firebaseAdminNotice",
                        `Akun bukan admin. UID: ${user.uid}`
                    );

                    window.location.replace(
                        "index.html"
                    );

                    return;
                }

                currentAdminUser = user;

                if (
                    dashboardFallbackNotice
                ) {
                    dashboardFallbackNotice.hidden =
                        true;
                }

                if (dashboard) {
                    dashboard.hidden = false;
                }

                const accountEmail =
                    document.querySelector(
                        "#account-email"
                    );

                if (accountEmail) {
                    accountEmail.textContent =
                        user.email ||
                        "Admin";
                }

                dashboardOverview.hidden = false;
                collectionView.hidden = true;
                await loadDashboardStats(services);

            } catch (error) {
                console.error(error);

                setNotice(
                    dashboardFallbackNotice,
                    `Admin access could not be verified: ${error.message}`,
                    true
                );
            }
        }
    );

    const navigationItems = document.querySelectorAll(".dashboard-nav-item");
    const activateNavigationItem = (activeItem) => {
        navigationItems.forEach((item) => {
            const isActive = item === activeItem;
            item.classList.toggle("is-active", isActive);
            if (isActive) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });
    };

    navigationItems.forEach((item) => {
        item.addEventListener("click", () => {
            activateNavigationItem(item);

            if (item.dataset.view === "overview") {
                dashboardOverview.hidden = false;
                collectionView.hidden = true;
                adminManagementView.hidden = true;
                loadDashboardStats(services);
                return;
            }

            if (item.dataset.adminView) {
                loadAdminManagementView(item.dataset.adminView, services, currentAdminUser);
                return;
            }

            if (item.dataset.collection) {
                activeCollection = item.dataset.collection;
                dashboardOverview.hidden = true;
                collectionView.hidden = false;
                adminManagementView.hidden = true;
                loadEntries(services);
            }
        });
    });

    const newEntryButton =
        document.querySelector(
            "#new-entry-button"
        );

    if (newEntryButton) {
        newEntryButton.addEventListener(
            "click",
            () => {
                openEditor(
                    {},
                    activeCollection,
                    services
                );
            }
        );
    }

    const cancelEditButton =
        document.querySelector(
            "#cancel-edit-button"
        );

    if (cancelEditButton) {
        cancelEditButton.addEventListener(
            "click",
            () => {
                const form =
                    document.querySelector(
                        "#entry-form"
                    );

                if (form) {
                    form.hidden = true;
                }
            }
        );
    }

    const entryForm =
        document.querySelector(
            "#entry-form"
        );

    if (entryForm) {
        entryForm.addEventListener(
            "submit",
            (event) =>
                saveEntry(
                    event,
                    services
                )
        );
    }

    attachSettingsSave(services);

    for (const logoutButton of document.querySelectorAll(
        "#logout-button, #sidebar-logout-button"
    )) {
        logoutButton.addEventListener(
            "click",
            async () => {
                await services.authSdk.signOut(
                    services.auth
                );

                window.location.replace(
                    "index.html"
                );
            }
        );
    }
}

/* =========================
   START
========================= */

if (isDashboard) {
    startDashboardPage();
} else {
    startLoginPage();
}