import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =====================================================
   CLOUDINARY
===================================================== */

const CLOUDINARY_CLOUD_NAME = "gvj8xixz";
const CLOUDINARY_UPLOAD_PRESET = "bdawy_store";


/* =====================================================
   VARIABLES
===================================================== */

let currentAdmin = null;
let gamesCache = [];


/* =====================================================
   ELEMENTS
===================================================== */

const adminName = document.getElementById("adminName");
const logoutBtn = document.getElementById("logoutBtn");

const gamesCount = document.getElementById("gamesCount");
const servicesCount = document.getElementById("servicesCount");
const ordersCount = document.getElementById("ordersCount");
const usersCount = document.getElementById("usersCount");

const addGameForm = document.getElementById("addGameForm");
const gameName = document.getElementById("gameName");
const gameImage = document.getElementById("gameImage");
const gameImagePreview = document.getElementById("gameImagePreview");
const addGameBtn = document.getElementById("addGameBtn");
const gameMessage = document.getElementById("gameMessage");

const adminGamesContainer =
    document.getElementById("adminGamesContainer");

const refreshGamesBtn =
    document.getElementById("refreshGamesBtn");

const addServiceForm =
    document.getElementById("addServiceForm");

const serviceGame =
    document.getElementById("serviceGame");

const serviceName =
    document.getElementById("serviceName");

const servicePrice =
    document.getElementById("servicePrice");

const serviceDescription =
    document.getElementById("serviceDescription");

const addServiceBtn =
    document.getElementById("addServiceBtn");

const serviceMessage =
    document.getElementById("serviceMessage");

const adminServicesContainer =
    document.getElementById("adminServicesContainer");

const paymentNumberInput =
    document.getElementById("paymentNumberInput");

const savePaymentNumberBtn =
    document.getElementById("savePaymentNumberBtn");

const paymentMessage =
    document.getElementById("paymentMessage");

const adminOrdersContainer =
    document.getElementById("adminOrdersContainer");

const refreshOrdersBtn =
    document.getElementById("refreshOrdersBtn");


/* =====================================================
   ADMIN AUTH CHECK
===================================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    try {

        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            alert("❌ حساب المستخدم غير موجود.");

            await signOut(auth);

            window.location.href = "login.html";

            return;
        }

        const data = userSnap.data();

        if (data.role !== "admin") {

            alert("❌ ليس لديك صلاحية دخول لوحة الإدارة.");

            window.location.href = "store.html";

            return;
        }

        currentAdmin = user;

        if (adminName) {

            adminName.textContent =
                "👑 " +
                (
                    data.name ||
                    user.email ||
                    "الأدمن"
                );
        }

        await loadAll();

    } catch (error) {

        console.error("ADMIN AUTH ERROR:", error);

        alert(
            "❌ حدث خطأ أثناء التحقق من حساب الأدمن.\n\n" +
            error.message
        );
    }

});


/* =====================================================
   LOAD ALL
===================================================== */

async function loadAll() {

    await loadGames();
    await loadOrders();
    await loadUsers();
    await loadPaymentNumber();

    await updateServicesCount();
}


/* =====================================================
   CLOUDINARY UPLOAD
===================================================== */

async function uploadImageToCloudinary(file) {

    if (!file) {
        throw new Error("لم يتم اختيار صورة.");
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("الملف المختار ليس صورة.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("حجم الصورة يجب ألا يتجاوز 5MB.");
    }

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    const result = await response.json();

    if (!response.ok) {

        console.error(
            "CLOUDINARY ERROR:",
            result
        );

        throw new Error(
            result.error?.message ||
            "فشل رفع الصورة."
        );
    }

    if (!result.secure_url) {
        throw new Error(
            "لم يتم الحصول على رابط الصورة."
        );
    }

    return result.secure_url;
}


/* =====================================================
   IMAGE PREVIEW
===================================================== */

gameImage?.addEventListener("change", () => {

    const file = gameImage.files?.[0];

    if (!file) {

        gameImagePreview.innerHTML = "";

        return;
    }

    const url = URL.createObjectURL(file);

    gameImagePreview.innerHTML = `
        <img
            src="${url}"
            alt="معاينة الصورة"
            style="
                max-width:180px;
                max-height:180px;
                border-radius:15px;
                object-fit:cover;
            "
        >
    `;
});


/* =====================================================
   ADD GAME
===================================================== */

addGameForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const name = gameName.value.trim();
        const file = gameImage.files?.[0];

        if (!name) {

            showMessage(
                gameMessage,
                "❌ اكتب اسم اللعبة.",
                "error"
            );

            return;
        }

        if (!file) {

            showMessage(
                gameMessage,
                "❌ اختر صورة اللعبة.",
                "error"
            );

            return;
        }

        addGameBtn.disabled = true;

        addGameBtn.textContent =
            "⏳ جاري رفع الصورة...";

        try {

            const imageUrl =
                await uploadImageToCloudinary(file);

            addGameBtn.textContent =
                "⏳ جاري إضافة اللعبة...";

            await addDoc(
                collection(db, "games"),
                {
                    name: name,
                    image: imageUrl,
                    createdAt: serverTimestamp()
                }
            );

            showMessage(
                gameMessage,
                "✅ تمت إضافة اللعبة بنجاح.",
                "success"
            );

            addGameForm.reset();

            gameImagePreview.innerHTML = "";

            await loadGames();

            await updateServicesCount();

        } catch (error) {

            console.error(
                "ADD GAME ERROR:",
                error
            );

            showMessage(
                gameMessage,
                "❌ " +
                (
                    error.message ||
                    "حدث خطأ أثناء إضافة اللعبة."
                ),
                "error"
            );
        }

        addGameBtn.disabled = false;

        addGameBtn.textContent =
            "➕ إضافة اللعبة";
    }
);


/* =====================================================
   LOAD GAMES
===================================================== */

async function loadGames() {

    if (!adminGamesContainer) {
        return;
    }

    adminGamesContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <p>
                ⏳ جاري تحميل الألعاب...
            </p>

        </div>
    `;

    try {

        const snapshot = await getDocs(
            collection(db, "games")
        );

        gamesCache = snapshot.docs.map(
            item => ({
                id: item.id,
                ...item.data()
            })
        );

        gamesCache.sort((a, b) => {

            const aTime =
                a.createdAt?.seconds || 0;

            const bTime =
                b.createdAt?.seconds || 0;

            return bTime - aTime;
        });

        if (gamesCount) {
            gamesCount.textContent =
                gamesCache.length;
        }

        updateGameSelect();

        if (gamesCache.length === 0) {

            adminGamesContainer.innerHTML = `
                <div class="empty-card">
                    🎮 لا توجد ألعاب حاليًا.
                </div>
            `;

            return;
        }

        adminGamesContainer.innerHTML = "";

        gamesCache.forEach(game => {

            const card =
                document.createElement("div");

            card.className =
                "admin-game-card";

            card.innerHTML = `
                <div
                    style="
                        display:flex;
                        gap:15px;
                        align-items:center;
                        flex-wrap:wrap;
                    "
                >

                    <img
                        src="${escapeHtml(game.image || "")}"
                        alt="${escapeHtml(game.name || "")}"
                        style="
                            width:90px;
                            height:90px;
                            object-fit:cover;
                            border-radius:14px;
                        "
                    >

                    <div>

                        <h3>
                            🎮 ${escapeHtml(
                                game.name || "لعبة"
                            )}
                        </h3>

                        <p>
                            ID:
                            ${escapeHtml(game.id)}
                        </p>

                    </div>

                </div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        margin-top:15px;
                        flex-wrap:wrap;
                    "
                >

                    <button
                        class="small-btn"
                        data-action="services"
                    >
                        📦 الباقات
                    </button>

                    <button
                        class="small-btn"
                        data-action="edit"
                    >
                        ✏️ تعديل
                    </button>

                    <button
                        class="small-btn"
                        data-action="delete"
                    >
                        🗑️ حذف
                    </button>

                </div>
            `;

            card.querySelector(
                '[data-action="services"]'
            )?.addEventListener(
                "click",
                () => {

                    serviceGame.value =
                        game.id;

                    loadServices(game.id);
                }
            );

            card.querySelector(
                '[data-action="edit"]'
            )?.addEventListener(
                "click",
                () => editGame(game)
            );

            card.querySelector(
                '[data-action="delete"]'
            )?.addEventListener(
                "click",
                () => deleteGame(game)
            );

            adminGamesContainer.appendChild(card);
        });

    } catch (error) {

        console.error(
            "LOAD GAMES ERROR:",
            error
        );

        adminGamesContainer.innerHTML = `
            <div class="empty-card">
                ❌ تعذر تحميل الألعاب.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


/* =====================================================
   GAME SELECT
===================================================== */

function updateGameSelect() {

    if (!serviceGame) {
        return;
    }

    serviceGame.innerHTML = `
        <option value="">
            اختر اللعبة
        </option>
    `;

    gamesCache.forEach(game => {

        const option =
            document.createElement("option");

        option.value = game.id;

        option.textContent = game.name;

        serviceGame.appendChild(option);
    });
}


/* =====================================================
   EDIT GAME
===================================================== */

async function editGame(game) {

    const newName = prompt(
        "اكتب اسم اللعبة الجديد:",
        game.name || ""
    );

    if (newName === null) {
        return;
    }

    const name = newName.trim();

    if (!name) {

        alert(
            "❌ اسم اللعبة لا يمكن أن يكون فارغًا."
        );

        return;
    }

    try {

        await updateDoc(
            doc(db, "games", game.id),
            {
                name: name
            }
        );

        alert(
            "✅ تم تعديل اسم اللعبة."
        );

        await loadGames();

    } catch (error) {

        console.error(
            "EDIT GAME ERROR:",
            error
        );

        alert(
            "❌ تعذر تعديل اللعبة.\n\n" +
            error.message
        );
    }
}


/* =====================================================
   DELETE GAME
===================================================== */

async function deleteGame(game) {

    const confirmed = confirm(
        `هل أنت متأكد من حذف لعبة "${game.name}"؟\n\n` +
        `يجب حذف الباقات الموجودة بداخلها أولًا.`
    );

    if (!confirmed) {
        return;
    }

    try {

        const servicesSnapshot =
            await getDocs(
                collection(
                    db,
                    "games",
                    game.id,
                    "services"
                )
            );

        if (!servicesSnapshot.empty) {

            alert(
                "⚠️ لا يمكن حذف اللعبة قبل حذف الباقات الموجودة بداخلها."
            );

            return;
        }

        await deleteDoc(
            doc(db, "games", game.id)
        );

        alert(
            "✅ تم حذف اللعبة."
        );

        await loadGames();

        adminServicesContainer.innerHTML = `
            <div class="empty-card">
                اختر لعبة لإدارة باقاتها.
            </div>
        `;

    } catch (error) {

        console.error(
            "DELETE GAME ERROR:",
            error
        );

        alert(
            "❌ تعذر حذف اللعبة.\n\n" +
            error.message
        );
    }
}


/* =====================================================
   ADD SERVICE
===================================================== */

addServiceForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const selectedGameId =
            serviceGame.value;

        const name =
            serviceName.value.trim();

        const price =
            Number(servicePrice.value);

        const description =
            serviceDescription.value.trim();

        if (!selectedGameId) {

            showMessage(
                serviceMessage,
                "❌ اختر اللعبة.",
                "error"
            );

            return;
        }

        if (!name) {

            showMessage(
                serviceMessage,
                "❌ اكتب اسم الباقة.",
                "error"
            );

            return;
        }

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            showMessage(
                serviceMessage,
                "❌ اكتب سعرًا صحيحًا.",
                "error"
            );

            return;
        }

        addServiceBtn.disabled = true;

        addServiceBtn.textContent =
            "⏳ جاري إضافة الباقة...";

        try {

            await addDoc(
                collection(
                    db,
                    "games",
                    selectedGameId,
                    "services"
                ),
                {
                    name: name,
                    price: price,
                    description: description,
                    createdAt: serverTimestamp()
                }
            );

            showMessage(
                serviceMessage,
                "✅ تمت إضافة الباقة بنجاح.",
                "success"
            );

            addServiceForm.reset();

            serviceGame.value =
                selectedGameId;

            await loadServices(
                selectedGameId
            );

            await updateServicesCount();

        } catch (error) {

            console.error(
                "ADD SERVICE ERROR:",
                error
            );

            showMessage(
                serviceMessage,
                "❌ تعذر إضافة الباقة.\n" +
                error.message,
                "error"
            );
        }

        addServiceBtn.disabled = false;

        addServiceBtn.textContent =
            "➕ إضافة الباقة";
    }
);


/* =====================================================
   LOAD SERVICES
===================================================== */

async function loadServices(gameId) {

    if (!adminServicesContainer) {
        return;
    }

    adminServicesContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <p>
                ⏳ جاري تحميل الباقات...
            </p>

        </div>
    `;

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "games",
                    gameId,
                    "services"
                )
            );

        const services =
            snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

        services.sort((a, b) => {

            const aTime =
                a.createdAt?.seconds || 0;

            const bTime =
                b.createdAt?.seconds || 0;

            return bTime - aTime;
        });

        if (services.length === 0) {

            adminServicesContainer.innerHTML = `
                <div class="empty-card">
                    📦 لا توجد باقات لهذه اللعبة.
                </div>
            `;

            return;
        }

        adminServicesContainer.innerHTML = "";

        services.forEach(service => {

            const card =
                document.createElement("div");

            card.className =
                "admin-service-card";

            card.innerHTML = `
                <div>

                    <h3>
                        📦 ${escapeHtml(
                            service.name || "باقة"
                        )}
                    </h3>

                    <p>
                        💰 السعر:
                        ${Number(
                            service.price || 0
                        ).toFixed(2)}
                        جنيه
                    </p>

                    <p>
                        📝 ${escapeHtml(
                            service.description ||
                            "بدون وصف"
                        )}
                    </p>

                </div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        flex-wrap:wrap;
                        margin-top:10px;
                    "
                >

                    <button
                        class="small-btn"
                        data-action="edit"
                    >
                        ✏️ تعديل
                    </button>

                    <button
                        class="small-btn"
                        data-action="delete"
                    >
                        🗑️ حذف
                    </button>

                </div>
            `;

            card.querySelector(
                '[data-action="edit"]'
            )?.addEventListener(
                "click",
                () => editService(gameId, service)
            );

            card.querySelector(
                '[data-action="delete"]'
            )?.addEventListener(
                "click",
                () => deleteService(gameId, service)
            );

            adminServicesContainer.appendChild(card);
        });

    } catch (error) {

        console.error(
            "LOAD SERVICES ERROR:",
            error
        );

        adminServicesContainer.innerHTML = `
            <div class="empty-card">
                ❌ تعذر تحميل الباقات.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


/* =====================================================
   EDIT SERVICE
===================================================== */

async function editService(gameId, service) {

    const newName = prompt(
        "اسم الباقة:",
        service.name || ""
    );

    if (newName === null) {
        return;
    }

    const newPrice = prompt(
        "السعر بالجنيه:",
        service.price ?? 0
    );

    if (newPrice === null) {
        return;
    }

    const newDescription = prompt(
        "وصف الباقة:",
        service.description || ""
    );

    if (newDescription === null) {
        return;
    }

    const price = Number(newPrice);

    if (
        !newName.trim() ||
        !Number.isFinite(price) ||
        price < 0
    ) {

        alert(
            "❌ البيانات غير صحيحة."
        );

        return;
    }

    try {

        await updateDoc(
            doc(
                db,
                "games",
                gameId,
                "services",
                service.id
            ),
            {
                name: newName.trim(),
                price: price,
                description: newDescription.trim()
            }
        );

        alert(
            "✅ تم تعديل الباقة."
        );

        await loadServices(gameId);

    } catch (error) {

        console.error(
            "EDIT SERVICE ERROR:",
            error
        );

        alert(
            "❌ تعذر تعديل الباقة.\n\n" +
            error.message
        );
    }
}


/* =====================================================
   DELETE SERVICE
===================================================== */

async function deleteService(gameId, service) {

    const confirmed = confirm(
        `هل تريد حذف الباقة "${service.name}"؟`
    );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "games",
                gameId,
                "services",
                service.id
            )
        );

        alert(
            "✅ تم حذف الباقة."
        );

        await loadServices(gameId);

        await updateServicesCount();

    } catch (error) {

        console.error(
            "DELETE SERVICE ERROR:",
            error
        );

        alert(
            "❌ تعذر حذف الباقة.\n\n" +
            error.message
        );
    }
}


/* =====================================================
   SERVICES COUNT
===================================================== */

async function updateServicesCount() {

    let total = 0;

    try {

        for (const game of gamesCache) {

            const snapshot =
                await getDocs(
                    collection(
                        db,
                        "games",
                        game.id,
                        "services"
                    )
                );

            total += snapshot.size;
        }

        if (servicesCount) {
            servicesCount.textContent = total;
        }

    } catch (error) {

        console.error(
            "SERVICES COUNT ERROR:",
            error
        );
    }
}


/* =====================================================
   LOAD USERS
===================================================== */

async function loadUsers() {

    if (!usersCount) {
        return;
    }

    try {

        const snapshot =
            await getDocs(
                collection(db, "users")
            );

        usersCount.textContent =
            snapshot.size;

    } catch (error) {

        console.error(
            "LOAD USERS ERROR:",
            error
        );

        usersCount.textContent = "0";
    }
}


/* =====================================================
   LOAD PAYMENT NUMBER
===================================================== */

async function loadPaymentNumber() {

    if (!paymentNumberInput) {
        return;
    }

    try {

        const snap =
            await getDoc(
                doc(
                    db,
                    "settings",
                    "payment"
                )
            );

        if (snap.exists()) {

            paymentNumberInput.value =
                snap.data().number || "";

        } else {

            paymentNumberInput.value = "";
        }

    } catch (error) {

        console.error(
            "LOAD PAYMENT ERROR:",
            error
        );
    }
}


/* =====================================================
   SAVE PAYMENT NUMBER
===================================================== */

savePaymentNumberBtn?.addEventListener(
    "click",
    async () => {

        const number =
            paymentNumberInput.value.trim();

        if (!number) {

            showMessage(
                paymentMessage,
                "❌ اكتب رقم الدفع.",
                "error"
            );

            return;
        }

        savePaymentNumberBtn.disabled = true;

        savePaymentNumberBtn.textContent =
            "⏳ جاري الحفظ...";

        try {

            await setDoc(
                doc(
                    db,
                    "settings",
                    "payment"
                ),
                {
                    number: number,
                    updatedAt: serverTimestamp()
                },
                {
                    merge: true
                }
            );

            showMessage(
                paymentMessage,
                "✅ تم حفظ رقم الدفع.",
                "success"
            );

        } catch (error) {

            console.error(
                "SAVE PAYMENT ERROR:",
                error
            );

            showMessage(
                paymentMessage,
                "❌ تعذر حفظ رقم الدفع.\n" +
                error.message,
                "error"
            );
        }

        savePaymentNumberBtn.disabled = false;

        savePaymentNumberBtn.textContent =
            "💾 حفظ الرقم";
    }
);


/* =====================================================
   LOAD ORDERS
===================================================== */

async function loadOrders() {

    if (!adminOrdersContainer) {
        return;
    }

    adminOrdersContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <p>
                ⏳ جاري تحميل الطلبات...
            </p>

        </div>
    `;

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );

        const orders =
            snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

        orders.sort((a, b) => {

            const aTime =
                a.createdAt?.seconds || 0;

            const bTime =
                b.createdAt?.seconds || 0;

            return bTime - aTime;
        });

        if (ordersCount) {
            ordersCount.textContent =
                orders.length;
        }

        if (orders.length === 0) {

            adminOrdersContainer.innerHTML = `
                <div class="empty-card">
                    📋 لا توجد طلبات حاليًا.
                </div>
            `;

            return;
        }

        adminOrdersContainer.innerHTML = "";

        orders.forEach((order, index) => {

            const card =
                document.createElement("div");

            card.className =
                "admin-order-card";

            const status =
                order.status ||
                "قيد المراجعة";

            card.innerHTML = `
                <div>

                    <h3>
                        🧾 طلب #${orders.length - index}
                    </h3>

                    <p>
                        🎮 اللعبة:
                        ${escapeHtml(
                            order.gameName || "-"
                        )}
                    </p>

                    <p>
                        📦 الباقة:
                        ${escapeHtml(
                            order.serviceName || "-"
                        )}
                    </p>

                    <p>
                        👤 البريد:
                        ${escapeHtml(
                            order.userEmail || "-"
                        )}
                    </p>

                    <p>
                        🆔 ID اللاعب:
                        ${escapeHtml(
                            order.playerId || "-"
                        )}
                    </p>

                    <p>
                        📱 رقم العميل:
                        ${escapeHtml(
                            order.phone || "-"
                        )}
                    </p>

                    <p>
                        💳 الرقم الذي حوّل منه:
                        <strong>
                            ${escapeHtml(
                                order.senderPhone || "-"
                            )}
                        </strong>
                    </p>

                    <p>
                        💰 السعر:
                        <strong>
                            ${Number(
                                order.price || 0
                            ).toFixed(2)}
                            جنيه
                        </strong>
                    </p>

                    <p>
                        📌 الحالة:
                        <strong>
                            ${getStatusEmoji(status)}
                            ${escapeHtml(status)}
                        </strong>
                    </p>

                </div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        flex-wrap:wrap;
                        margin-top:15px;
                    "
                >

                    <button
                        class="small-btn"
                        data-status="تم القبول"
                    >
                        ✅ قبول
                    </button>

                    <button
                        class="small-btn"
                        data-status="قيد التنفيذ"
                    >
                        🔄 تنفيذ
                    </button>

                    <button
                        class="small-btn"
                        data-status="مكتمل"
                    >
                        🎉 مكتمل
                    </button>

                    <button
                        class="small-btn"
                        data-status="مرفوض"
                    >
                        ❌ رفض
                    </button>

                </div>
            `;

            card.querySelectorAll(
                "[data-status]"
            ).forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        updateOrderStatus(
                            order,
                            button.dataset.status
                        );
                    }
                );
            });

            adminOrdersContainer.appendChild(card);
        });

    } catch (error) {

        console.error(
            "LOAD ORDERS ERROR:",
            error
        );

        adminOrdersContainer.innerHTML = `
            <div class="empty-card">
                ❌ تعذر تحميل الطلبات.
                <br><br>
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


/* =====================================================
   UPDATE ORDER STATUS
===================================================== */

async function updateOrderStatus(
    order,
    newStatus
) {

    const confirmed = confirm(
        `تغيير حالة الطلب إلى "${newStatus}"؟`
    );

    if (!confirmed) {
        return;
    }

    try {

        await updateDoc(
            doc(
                db,
                "orders",
                order.id
            ),
            {
                status: newStatus,
                updatedAt: serverTimestamp()
            }
        );

        alert(
            "✅ تم تحديث حالة الطلب."
        );

        await loadOrders();

    } catch (error) {

        console.error(
            "UPDATE ORDER ERROR:",
            error
        );

        alert(
            "❌ تعذر تحديث حالة الطلب.\n\n" +
            error.message
        );
    }
}


/* =====================================================
   REFRESH BUTTONS
===================================================== */

refreshGamesBtn?.addEventListener(
    "click",
    async () => {

        await loadGames();
        await updateServicesCount();

    }
);


refreshOrdersBtn?.addEventListener(
    "click",
    loadOrders
);


/* =====================================================
   LOGOUT
===================================================== */

logoutBtn?.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );
        }
    }
);


/* =====================================================
   HELPERS
===================================================== */

function showMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }

    element.textContent = text;

    element.className =
        "form-message " + type;
}


function getStatusEmoji(status) {

    switch (status) {

        case "تم القبول":
            return "✅";

        case "قيد التنفيذ":
            return "🔄";

        case "مرفوض":
            return "❌";

        case "مكتمل":
            return "🎉";

        default:
            return "⏳";
    }
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}