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
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =====================================================
   VARIABLES
===================================================== */

let currentUser = null;
let selectedGame = null;
let selectedService = null;


/* =====================================================
   ELEMENTS
===================================================== */

const gamesContainer =
    document.getElementById("gamesContainer");

const servicesSection =
    document.getElementById("servicesSection");

const servicesContainer =
    document.getElementById("servicesContainer");

const ordersContainer =
    document.getElementById("myOrdersContainer");

const userName =
    document.getElementById("userName");

const welcomeName =
    document.getElementById("welcomeName");

const logoutBtn =
    document.getElementById("logoutBtn");

const selectedGameName =
    document.getElementById("selectedGameName");

const backGamesBtn =
    document.getElementById("backGamesBtn");

const orderModal =
    document.getElementById("orderModal");

const closeModal =
    document.getElementById("closeModal");

const selectedServiceInfo =
    document.getElementById("selectedServiceInfo");

const orderPrice =
    document.getElementById("orderPrice");

const playerId =
    document.getElementById("playerId");

const phone =
    document.getElementById("phone");

const senderPhone =
    document.getElementById("senderPhone");

const paymentNumber =
    document.getElementById("paymentNumber");

const orderForm =
    document.getElementById("orderForm");

const submitOrderBtn =
    document.getElementById("submitOrderBtn");

const orderMessage =
    document.getElementById("orderMessage");


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    try {

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);

        if (userSnap.exists()) {

            const data =
                userSnap.data();

            const name =
                data.name ||
                user.displayName ||
                "مستخدم";

            if (userName) {
                userName.textContent = name;
            }

            if (welcomeName) {
                welcomeName.textContent = name;
            }
        }

        await loadGames();

        await loadOrders();

        await loadPaymentNumber();

    } catch (error) {

        console.error(
            "STORE INIT ERROR:",
            error
        );

        alert(
            "❌ حدث خطأ أثناء تحميل المتجر.\n\n" +
            error.message
        );
    }
});


/* =====================================================
   LOAD GAMES
===================================================== */

async function loadGames() {

    if (!gamesContainer) {
        return;
    }

    gamesContainer.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <p>⏳ جاري تحميل الألعاب...</p>
        </div>
    `;

    try {

        const snapshot =
            await getDocs(
                collection(db, "games")
            );

        const games =
            snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        games.sort((a, b) => {

            const aTime =
                a.createdAt?.seconds || 0;

            const bTime =
                b.createdAt?.seconds || 0;

            return bTime - aTime;
        });


        if (games.length === 0) {

            gamesContainer.innerHTML = `
                <div class="empty-card">
                    🎮 لا توجد ألعاب متاحة حاليًا.
                </div>
            `;

            return;
        }


        gamesContainer.innerHTML = "";


        games.forEach(game => {

            const card =
                document.createElement("div");

            card.className =
                "game-card";

            card.setAttribute(
                "role",
                "button"
            );

            card.setAttribute(
                "tabindex",
                "0"
            );


            card.innerHTML = `
                <div class="game-image-box">

                    <img
                        src="${escapeHtml(game.image || "")}"
                        alt="${escapeHtml(game.name || "لعبة")}"
                    >

                </div>

                <div class="game-info">

                    <h3>
                        ${escapeHtml(
                            game.name || "لعبة"
                        )}
                    </h3>

                    <p>
                        اضغط لعرض الباقات
                    </p>

                    <button
                        type="button"
                        class="primary-btn view-services-btn"
                    >
                        📦 عرض الباقات
                    </button>

                </div>
            `;


            card.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target.closest(
                            ".view-services-btn"
                        )
                    ) {
                        return;
                    }

                    openGame(
                        game.id,
                        game.name
                    );
                }
            );


            const viewButton =
                card.querySelector(
                    ".view-services-btn"
                );


            viewButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    event.stopPropagation();

                    openGame(
                        game.id,
                        game.name
                    );
                }
            );


            card.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        openGame(
                            game.id,
                            game.name
                        );
                    }
                }
            );


            gamesContainer.appendChild(card);
        });


    } catch (error) {

        console.error(
            "LOAD GAMES ERROR:",
            error
        );

        gamesContainer.innerHTML = `
            <div class="empty-card">

                ❌ تعذر تحميل الألعاب.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;
    }
}


/* =====================================================
   OPEN GAME
===================================================== */

async function openGame(
    gameId,
    gameName
) {

    console.log(
        "تم اختيار اللعبة:",
        gameId,
        gameName
    );


    selectedGame = {
        id: gameId,
        name: gameName
    };


    if (servicesSection) {

        servicesSection.classList.remove(
            "hidden"
        );
    }


    if (selectedGameName) {

        selectedGameName.textContent =
            `باقات ${gameName}`;
    }


    await loadServices(
        gameId,
        gameName
    );


    if (servicesSection) {

        setTimeout(() => {

            servicesSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }, 100);
    }
}


/* =====================================================
   LOAD SERVICES
===================================================== */

async function loadServices(
    gameId,
    gameName
) {

    if (!servicesContainer) {
        return;
    }


    servicesContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <p>
                ⏳ جاري تحميل باقات ${escapeHtml(
                    gameName || ""
                )}...
            </p>

        </div>
    `;


    try {

        const servicesRef =
            collection(
                db,
                "games",
                gameId,
                "services"
            );


        const snapshot =
            await getDocs(
                servicesRef
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

            servicesContainer.innerHTML = `
                <div class="empty-card">

                    📦 لا توجد باقات لهذه اللعبة حاليًا.

                </div>
            `;

            return;
        }


        servicesContainer.innerHTML = "";


        services.forEach(service => {

            const card =
                document.createElement("div");

            card.className =
                "service-card";


            card.innerHTML = `
                <h3>
                    📦 ${escapeHtml(
                        service.name || "باقة"
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        service.description ||
                        "شحن سريع وآمن"
                    )}
                </p>

                <div class="service-price">

                    ${Number(
                        service.price || 0
                    ).toFixed(2)}

                    جنيه

                </div>

                <br>

                <button
                    type="button"
                    class="primary-btn buy-service-btn"
                >
                    🛒 شراء الباقة
                </button>
            `;


            const buyButton =
                card.querySelector(
                    ".buy-service-btn"
                );


            buyButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    event.stopPropagation();

                    openOrderModal(
                        service.id,
                        service
                    );
                }
            );


            servicesContainer.appendChild(
                card
            );
        });


    } catch (error) {

        console.error(
            "LOAD SERVICES ERROR:",
            error
        );


        servicesContainer.innerHTML = `
            <div class="empty-card">

                ❌ تعذر تحميل الباقات.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;
    }
}


/* =====================================================
   BACK TO GAMES
===================================================== */

backGamesBtn?.addEventListener(
    "click",
    () => {

        if (servicesSection) {

            servicesSection.classList.add(
                "hidden"
            );
        }


        selectedGame = null;

        selectedService = null;


        if (gamesContainer) {

            gamesContainer.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }
);


/* =====================================================
   OPEN ORDER MODAL
===================================================== */

async function openOrderModal(
    serviceId,
    service
) {

    if (!selectedGame) {

        alert(
            "❌ اختار اللعبة أولًا."
        );

        return;
    }


    selectedService = {
        id: serviceId,
        ...service
    };


    if (selectedServiceInfo) {

        selectedServiceInfo.innerHTML = `
            <strong>
                🎮 اللعبة:
            </strong>

            ${escapeHtml(
                selectedGame.name
            )}

            <br><br>

            <strong>
                📦 الباقة:
            </strong>

            ${escapeHtml(
                service.name || "باقة"
            )}

            <br><br>

            <strong>
                💰 السعر:
            </strong>

            ${Number(
                service.price || 0
            ).toFixed(2)}

            جنيه
        `;
    }


    if (orderPrice) {

        orderPrice.textContent =
            Number(
                service.price || 0
            ).toFixed(2) +
            " جنيه";
    }


    if (playerId) {
        playerId.value = "";
    }

    if (phone) {
        phone.value = "";
    }

    if (senderPhone) {
        senderPhone.value = "";
    }


    if (orderMessage) {

        orderMessage.textContent = "";

        orderMessage.className =
            "form-message";
    }


    await loadPaymentNumber();


    if (orderModal) {

        orderModal.classList.remove(
            "hidden"
        );
    }
}


/* =====================================================
   CLOSE MODAL
===================================================== */

closeModal?.addEventListener(
    "click",
    () => {

        orderModal?.classList.add(
            "hidden"
        );
    }
);


orderModal?.addEventListener(
    "click",
    (event) => {

        if (
            event.target === orderModal
        ) {

            orderModal.classList.add(
                "hidden"
            );
        }
    }
);


/* =====================================================
   PAYMENT NUMBER
===================================================== */

async function loadPaymentNumber() {

    if (!paymentNumber) {
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

            paymentNumber.textContent =
                snap.data().number ||
                "لم يتم تحديد رقم الدفع";

        } else {

            paymentNumber.textContent =
                "لم يتم تحديد رقم الدفع";
        }


    } catch (error) {

        console.error(
            "PAYMENT ERROR:",
            error
        );

        paymentNumber.textContent =
            "تعذر تحميل الرقم";
    }
}


/* =====================================================
   SUBMIT ORDER
===================================================== */

orderForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (
            !selectedGame ||
            !selectedService ||
            !currentUser
        ) {

            showMessage(
                "❌ حدث خطأ، اختار اللعبة والباقة مرة أخرى.",
                "error"
            );

            return;
        }


        const player =
            playerId?.value.trim() || "";


        const customerPhone =
            phone?.value.trim() || "";


        const transferredFrom =
            senderPhone?.value.trim() || "";


        if (!player) {

            showMessage(
                "❌ اكتب ID اللاعب.",
                "error"
            );

            return;
        }


        if (!customerPhone) {

            showMessage(
                "❌ اكتب رقم هاتفك.",
                "error"
            );

            return;
        }


        if (!transferredFrom) {

            showMessage(
                "❌ اكتب الرقم الذي حوّلت منه.",
                "error"
            );

            return;
        }


        if (
            transferredFrom.length < 8
        ) {

            showMessage(
                "❌ رقم التحويل غير صحيح.",
                "error"
            );

            return;
        }


        if (submitOrderBtn) {

            submitOrderBtn.disabled =
                true;

            submitOrderBtn.textContent =
                "⏳ جاري إرسال الطلب...";
        }


        try {

            const price =
                Number(
                    selectedService.price || 0
                );


            await addDoc(
                collection(
                    db,
                    "orders"
                ),
                {

                    userId:
                        currentUser.uid,

                    userEmail:
                        currentUser.email || "",

                    gameId:
                        selectedGame.id,

                    gameName:
                        selectedGame.name,

                    serviceId:
                        selectedService.id,

                    serviceName:
                        selectedService.name || "",

                    playerId:
                        player,

                    phone:
                        customerPhone,

                    senderPhone:
                        transferredFrom,

                    price:
                        price,

                    status:
                        "قيد المراجعة",

                    createdAt:
                        serverTimestamp()
                }
            );


            showMessage(
                "✅ تم إرسال الطلب بنجاح.\nسيتم مراجعته من الإدارة.",
                "success"
            );


            setTimeout(
                () => {

                    orderModal?.classList.add(
                        "hidden"
                    );

                    loadOrders();

                },
                1800
            );


        } catch (error) {

            console.error(
                "CREATE ORDER ERROR:",
                error
            );


            showMessage(
                "❌ حدث خطأ أثناء إرسال الطلب.\n" +
                error.message,
                "error"
            );
        }


        if (submitOrderBtn) {

            submitOrderBtn.disabled =
                false;

            submitOrderBtn.textContent =
                "🚀 إرسال الطلب";
        }
    }
);


/* =====================================================
   LOAD ORDERS
===================================================== */

async function loadOrders() {

    if (
        !ordersContainer ||
        !currentUser
    ) {
        return;
    }


    ordersContainer.innerHTML = `
        <div class="loading-card">

            <div class="loader"></div>

            <p>
                ⏳ جاري تحميل طلباتك...
            </p>

        </div>
    `;


    try {

        /*
         * مهم جدًا:
         * بدل ما نجيب كل الطلبات من Firestore
         * ونفلترها بعد كده،
         * هنطلب فقط طلبات المستخدم الحالي.
         */

        const ordersQuery =
            query(
                collection(
                    db,
                    "orders"
                ),
                where(
                    "userId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                ordersQuery
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


        if (orders.length === 0) {

            ordersContainer.innerHTML = `
                <div class="empty-card">

                    📋 لم تقم بعمل أي طلبات حتى الآن.

                </div>
            `;

            return;
        }


        ordersContainer.innerHTML = "";


        orders.forEach(
            (order, index) => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "order-card";


                card.innerHTML = `

                    <h3>
                        📦 طلب #${orders.length - index}
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
                        🆔 ID:
                        ${escapeHtml(
                            order.playerId || "-"
                        )}
                    </p>

                    <p>
                        📱 رقم الهاتف:
                        ${escapeHtml(
                            order.phone || "-"
                        )}
                    </p>

                    <p>
                        💳 الرقم المحول منه:
                        ${escapeHtml(
                            order.senderPhone || "-"
                        )}
                    </p>

                    <p>
                        💰 السعر:
                        ${Number(
                            order.price || 0
                        ).toFixed(2)}
                        جنيه
                    </p>

                    <div class="order-status">

                        ${getStatusEmoji(
                            order.status
                        )}

                        ${escapeHtml(
                            order.status ||
                            "قيد المراجعة"
                        )}

                    </div>

                `;


                ordersContainer.appendChild(
                    card
                );
            }
        );


    } catch (error) {

        console.error(
            "LOAD ORDERS ERROR:",
            error
        );


        ordersContainer.innerHTML = `
            <div class="empty-card">

                ❌ تعذر تحميل الطلبات.

                <br><br>

                ${escapeHtml(
                    error.message ||
                    "حدث خطأ غير معروف"
                )}

            </div>
        `;
    }
}


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
   REFRESH ORDERS
===================================================== */

document
    .getElementById("refreshOrdersBtn")
    ?.addEventListener(
        "click",
        loadOrders
    );


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
    text,
    type
) {

    if (!orderMessage) {
        return;
    }


    orderMessage.textContent =
        text;


    orderMessage.className =
        "form-message " +
        type;
}


/* =====================================================
   STATUS EMOJI
===================================================== */

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


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}