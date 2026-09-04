import {
    auth,
    db
} from "./firebase.js";


import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
    doc,
    setDoc,
    collection,
    getDocs,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";



/* ========================= */
/* VANTA */
/* ========================= */

VANTA.NET({

    el: "#background",

    mouseControls: true,

    touchControls: true,

    gyroControls: false,

    minHeight: 200,

    minWidth: 200,

    scale: 1,

    scaleMobile: 1,

    color: 0xff1010,

    backgroundColor: 0x030303,

    points: 13,

    maxDistance: 22,

    spacing: 18

});



/* ========================= */
/* MODAL */
/* ========================= */

const modal =
    document.getElementById("authModal");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");


function openLogin() {

    modal.classList.add("active");

    loginForm.classList.remove("hidden");

    registerForm.classList.add("hidden");

}


function openRegister() {

    modal.classList.add("active");

    registerForm.classList.remove("hidden");

    loginForm.classList.add("hidden");

}



document.getElementById("loginNav")
    .onclick = openLogin;


document.getElementById("registerNav")
    .onclick = openRegister;


document.getElementById("heroLogin")
    .onclick = openLogin;


document.getElementById("heroRegister")
    .onclick = openRegister;


document.getElementById("switchRegister")
    .onclick = openRegister;


document.getElementById("switchLogin")
    .onclick = openLogin;


document.getElementById("closeModal")
    .onclick = () => {

        modal.classList.remove("active");

    };



/* ========================= */
/* REGISTER */
/* ========================= */

document.getElementById("registerBtn")
.onclick = async () => {


    const name =
        document.getElementById(
            "registerName"
        ).value.trim();


    const phone =
        document.getElementById(
            "registerPhone"
        ).value.trim();


    const email =
        document.getElementById(
            "registerEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "registerPassword"
        ).value;


    const message =
        document.getElementById(
            "registerMessage"
        );


    if (
        !name ||
        !phone ||
        !email ||
        !password
    ) {

        message.textContent =
            "❌ من فضلك املأ جميع البيانات.";

        return;

    }


    if (password.length < 6) {

        message.textContent =
            "❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل.";

        return;

    }


    try {


        const credential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            credential.user;


        await setDoc(
            doc(
                db,
                "users",
                user.uid
            ),
            {

                uid: user.uid,

                name: name,

                phone: phone,

                email: email,

                role: "user",

                createdAt:
                    serverTimestamp()

            }
        );


        message.style.color =
            "#35ff72";


        message.textContent =
            "✅ تم إنشاء الحساب بنجاح";


        setTimeout(() => {

            window.location.href =
                "store.html";

        }, 800);


    } catch (error) {


        console.error(error);


        message.style.color =
            "#ff3030";


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            message.textContent =
                "❌ البريد الإلكتروني مستخدم بالفعل.";

        } else {

            message.textContent =
                "❌ حدث خطأ أثناء إنشاء الحساب.";

        }

    }

};



/* ========================= */
/* LOGIN */
/* ========================= */

document.getElementById("loginBtn")
.onclick = async () => {


    const email =
        document.getElementById(
            "loginEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "loginPassword"
        ).value;


    const message =
        document.getElementById(
            "loginMessage"
        );


    if (!email || !password) {

        message.textContent =
            "❌ اكتب البريد وكلمة المرور.";

        return;

    }


    try {


        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            credential.user;


        const userSnapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    user.uid
                )
            );


        if (!userSnapshot.exists()) {

            message.textContent =
                "❌ بيانات الحساب غير موجودة.";

            return;

        }


        const userData =
            userSnapshot.data();


        message.style.color =
            "#35ff72";


        message.textContent =
            "✅ تم تسجيل الدخول";


        setTimeout(() => {


            if (
                userData.role ===
                "admin"
            ) {

                window.location.href =
                    "admin.html";

            } else {

                window.location.href =
                    "store.html";

            }


        }, 500);


    } catch (error) {


        console.error(error);


        message.style.color =
            "#ff3030";


        message.textContent =
            "❌ البريد الإلكتروني أو كلمة المرور غير صحيحة.";

    }

};



/* ========================= */
/* LOAD GAMES */
/* ========================= */

async function loadGames() {


    const container =
        document.getElementById(
            "gamesContainer"
        );


    try {


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "games"
                )
            );


        container.innerHTML = "";


        if (snapshot.empty) {


            container.innerHTML = `

                <div class="empty">

                    🎮

                    <h3>
                        لا توجد ألعاب حاليًا
                    </h3>

                    <p>
                        سيتم إضافة الألعاب قريبًا.
                    </p>

                </div>

            `;


            return;

        }


        snapshot.forEach((item) => {


            const game =
                item.data();


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "game-card";


            card.innerHTML = `

                <img
                    src="${game.image}"
                    alt="${game.name}"
                >

                <div class="game-info">

                    <h3>
                        ${game.name}
                    </h3>

                    <p>
                        🔐 سجل الدخول لرؤية الباقات
                    </p>

                </div>

            `;


            card.onclick = () => {

                openLogin();

            };


            container.appendChild(card);

        });


    } catch (error) {


        console.error(error);


        container.innerHTML = `

            <div class="empty">

                ❌ حدث خطأ أثناء تحميل الألعاب

            </div>

        `;

    }

}


loadGames();