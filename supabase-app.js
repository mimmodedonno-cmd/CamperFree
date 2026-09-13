(async function () {
  function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Impossibile caricare il servizio account."));
      document.head.appendChild(script);
    });
  }

  function createInterface() {
    const style = document.createElement("style");

    style.textContent = `
      body.cf-auth-locked {
        overflow: hidden !important;
      }

      #cfAuthGate {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 20px;
        background: linear-gradient(145deg, #eaf2ed, #dbe8e0);
        font-family: Arial, sans-serif;
      }

      #cfAuthGate.cf-hidden {
        display: none;
      }

      .cf-auth-card {
        width: min(480px, 100%);
        padding: 26px;
        border-radius: 24px;
        background: white;
        box-shadow: 0 18px 55px rgba(20, 55, 40, 0.18);
      }

      .cf-auth-logo {
        margin-bottom: 5px;
        color: #123f32;
        font-size: 28px;
        font-weight: 800;
        text-align: center;
      }

      .cf-auth-subtitle {
        margin: 0 0 22px;
        color: #607068;
        text-align: center;
      }

      .cf-auth-title {
        margin: 0 0 18px;
        color: #173f33;
        font-size: 22px;
      }

      .cf-auth-label {
        display: block;
        margin: 12px 0 6px;
        color: #263b33;
        font-size: 14px;
        font-weight: 700;
      }

      .cf-auth-input {
        box-sizing: border-box;
        width: 100%;
        min-height: 48px;
        padding: 11px 14px;
        border: 1px solid #cad8d0;
        border-radius: 14px;
        background: white;
        font-size: 16px;
      }

      .cf-password-box {
        position: relative;
      }

      .cf-password-box .cf-auth-input {
        padding-right: 58px;
      }

      .cf-eye {
        position: absolute;
        top: 50%;
        right: 7px;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        cursor: pointer;
        font-size: 20px;
      }

      .cf-auth-primary {
        width: 100%;
        min-height: 48px;
        margin-top: 18px;
        border: 0;
        border-radius: 14px;
        background: #124c3c;
        color: white;
        cursor: pointer;
        font-size: 16px;
        font-weight: 800;
      }

      .cf-auth-link {
        border: 0;
        background: transparent;
        color: #145c48;
        cursor: pointer;
        font-weight: 700;
        text-decoration: underline;
      }

      .cf-auth-center {
        margin-top: 16px;
        text-align: center;
      }

      .cf-auth-check {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        margin-top: 14px;
        color: #37483f;
        font-size: 13px;
      }

      .cf-auth-status {
        min-height: 22px;
        margin-top: 15px;
        color: #315440;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
      }

      .cf-auth-status.cf-error {
        color: #b42318;
      }

      .cf-auth-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .cf-account-tools {
        margin-top: 15px;
        padding: 14px;
        border: 1px solid #d5e1da;
        border-radius: 15px;
      }

      @media (max-width: 540px) {
        #cfAuthGate {
          align-items: flex-start;
          padding: 12px;
        }

        .cf-auth-card {
          padding: 20px;
        }

        .cf-auth-row {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
    `;

    document.head.appendChild(style);

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="cfAuthGate">
        <div class="cf-auth-card">
          <div class="cf-auth-logo">🚐 CamperFree</div>
          <p class="cf-auth-subtitle">
            Accedi per utilizzare mappe, percorsi e soste
          </p>

          <section id="cfLoginView">
            <h2 class="cf-auth-title">Accedi</h2>

            <label class="cf-auth-label" for="cfLoginEmail">Email</label>
            <input
              id="cfLoginEmail"
              class="cf-auth-input"
              type="email"
              autocomplete="email"
              placeholder="nome@email.it"
            >

            <label class="cf-auth-label" for="cfLoginPassword">
              Password
            </label>

            <div class="cf-password-box">
              <input
                id="cfLoginPassword"
                class="cf-auth-input"
                type="password"
                autocomplete="current-password"
                placeholder="Password"
              >
              <button
                class="cf-eye"
                type="button"
                data-password="cfLoginPassword"
                aria-label="Mostra o nascondi password"
              >👁</button>
            </div>

            <button id="cfLoginButton" class="cf-auth-primary" type="button">
              Accedi
            </button>

            <div class="cf-auth-center">
              <button id="cfForgotButton" class="cf-auth-link" type="button">
                Password dimenticata?
              </button>
            </div>

            <div class="cf-auth-center">
              Non hai un account?
              <button id="cfOpenRegister" class="cf-auth-link" type="button">
                Registrati
              </button>
            </div>
          </section>

          <section id="cfRegisterView" hidden>
            <h2 class="cf-auth-title">Crea il tuo account</h2>

            <div class="cf-auth-row">
              <div>
                <label class="cf-auth-label" for="cfRegisterName">Nome</label>
                <input id="cfRegisterName" class="cf-auth-input" type="text">
              </div>

              <div>
                <label class="cf-auth-label" for="cfRegisterSurname">
                  Cognome
                </label>
                <input id="cfRegisterSurname" class="cf-auth-input" type="text">
              </div>
            </div>

            <label class="cf-auth-label" for="cfRegisterPhone">Telefono</label>
            <input
              id="cfRegisterPhone"
              class="cf-auth-input"
              type="tel"
              autocomplete="tel"
            >

            <label class="cf-auth-label" for="cfRegisterEmail">Email</label>
            <input
              id="cfRegisterEmail"
              class="cf-auth-input"
              type="email"
              autocomplete="email"
              placeholder="nome@email.it"
            >

            <label class="cf-auth-label" for="cfRegisterPassword">
              Password
            </label>

            <div class="cf-password-box">
              <input
                id="cfRegisterPassword"
                class="cf-auth-input"
                type="password"
                minlength="8"
                autocomplete="new-password"
                placeholder="Almeno 8 caratteri"
              >
              <button
                class="cf-eye"
                type="button"
                data-password="cfRegisterPassword"
                aria-label="Mostra o nascondi password"
              >👁</button>
            </div>

            <label class="cf-auth-label" for="cfConfirmPassword">
              Ripeti password
            </label>

            <div class="cf-password-box">
              <input
                id="cfConfirmPassword"
                class="cf-auth-input"
                type="password"
                minlength="8"
                autocomplete="new-password"
                placeholder="Ripeti la password"
              >
              <button
                class="cf-eye"
                type="button"
                data-password="cfConfirmPassword"
                aria-label="Mostra o nascondi password"
              >👁</button>
            </div>

            <label class="cf-auth-check">
              <input id="cfRegisterPrivacy" type="checkbox">
              <span>
                Ho letto l’informativa privacy e acconsento al trattamento
                necessario per utilizzare CamperFree.
              </span>
            </label>

            <label class="cf-auth-check">
              <input id="cfRegisterMarketing" type="checkbox">
              <span>
                Voglio ricevere comunicazioni e novità CamperFree
                (facoltativo).
              </span>
            </label>

            <button
              id="cfRegisterButton"
              class="cf-auth-primary"
              type="button"
            >
              Crea account
            </button>

            <div class="cf-auth-center">
              Hai già un account?
              <button id="cfBackToLogin" class="cf-auth-link" type="button">
                Accedi
              </button>
            </div>
          </section>

          <section id="cfRecoveryView" hidden>
            <h2 class="cf-auth-title">Recupera password</h2>

            <label class="cf-auth-label" for="cfRecoveryEmail">Email</label>
            <input
              id="cfRecoveryEmail"
              class="cf-auth-input"
              type="email"
              autocomplete="email"
              placeholder="nome@email.it"
            >

            <button
              id="cfSendRecovery"
              class="cf-auth-primary"
              type="button"
            >
              Invia email di recupero
            </button>

            <div class="cf-auth-center">
              <button id="cfRecoveryBack" class="cf-auth-link" type="button">
                Torna ad Accedi
              </button>
            </div>
          </section>

          <section id="cfNewPasswordView" hidden>
            <h2 class="cf-auth-title">Crea una nuova password</h2>

            <label class="cf-auth-label" for="cfNewPassword">
              Nuova password
            </label>

            <div class="cf-password-box">
              <input
                id="cfNewPassword"
                class="cf-auth-input"
                type="password"
                minlength="8"
                autocomplete="new-password"
                placeholder="Almeno 8 caratteri"
              >
              <button
                class="cf-eye"
                type="button"
                data-password="cfNewPassword"
                aria-label="Mostra o nascondi password"
              >👁</button>
            </div>

            <button
              id="cfSaveNewPassword"
              class="cf-auth-primary"
              type="button"
            >
              Salva nuova password
            </button>
          </section>

          <div id="cfAuthStatus" class="cf-auth-status"></div>
        </div>
      </div>
      `
    );
  }

  createInterface();

  const gate = document.getElementById("cfAuthGate");
  const status = document.getElementById("cfAuthStatus");

  const views = {
    login: document.getElementById("cfLoginView"),
    register: document.getElementById("cfRegisterView"),
    recovery: document.getElementById("cfRecoveryView"),
    newPassword: document.getElementById("cfNewPasswordView")
  };

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("cf-error", error);
  }

  function showView(name) {
    Object.entries(views).forEach(([viewName, element]) => {
      element.hidden = viewName !== name;
    });

    setStatus("");
  }

  function lockApp() {
    gate.classList.remove("cf-hidden");
    document.body.classList.add("cf-auth-locked");
  }

  function unlockApp() {
    gate.classList.add("cf-hidden");
    document.body.classList.remove("cf-auth-locked");
  }

  document.querySelectorAll("[data-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password);
      const hidden = input.type === "password";

      input.type = hidden ? "text" : "password";
      button.textContent = hidden ? "🙈" : "👁";
    });
  });

  document
    .getElementById("cfOpenRegister")
    .addEventListener("click", () => showView("register"));

  document
    .getElementById("cfBackToLogin")
    .addEventListener("click", () => showView("login"));

  document
    .getElementById("cfForgotButton")
    .addEventListener("click", () => {
      document.getElementById("cfRecoveryEmail").value =
        document.getElementById("cfLoginEmail").value;
      showView("recovery");
    });

  document
    .getElementById("cfRecoveryBack")
    .addEventListener("click", () => showView("login"));

  lockApp();
  showView("login");

  try {
    const response = await fetch("/api/supabase-config", {
      cache: "no-store"
    });

    const config = await response.json();

    if (!response.ok || !config.ok) {
      throw new Error(
        config.error || "Configurazione account non disponibile."
      );
    }

    await loadSupabaseLibrary();

    const supabaseClient = window.supabase.createClient(
      config.url,
      config.key
    );

    window.camperFreeSupabase = supabaseClient;

    document
      .getElementById("cfRegisterButton")
      .addEventListener("click", async () => {
        const firstName =
          document.getElementById("cfRegisterName").value.trim();
        const lastName =
          document.getElementById("cfRegisterSurname").value.trim();
        const phone =
          document.getElementById("cfRegisterPhone").value.trim();
        const email =
          document.getElementById("cfRegisterEmail").value.trim();
        const password =
          document.getElementById("cfRegisterPassword").value;
        const confirmation =
          document.getElementById("cfConfirmPassword").value;
        const privacy =
          document.getElementById("cfRegisterPrivacy").checked;
        const marketing =
          document.getElementById("cfRegisterMarketing").checked;

        if (!firstName || !lastName || !email) {
          setStatus("Compila nome, cognome ed email.", true);
          return;
        }

        if (!privacy) {
          setStatus("Devi accettare l’informativa privacy.", true);
          return;
        }

        if (password.length < 8) {
          setStatus(
            "La password deve contenere almeno 8 caratteri.",
            true
          );
          return;
        }

        if (password !== confirmation) {
          setStatus("Le due password non coincidono.", true);
          return;
        }

        setStatus("Creazione account in corso…");

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + window.location.pathname,
            data: {
              first_name: firstName,
              last_name: lastName,
              phone,
              privacy_accepted: true,
              marketing_accepted: marketing
            }
          }
        });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        if (data.session) {
          await supabaseClient.auth.signOut();
        }

        document.getElementById("cfLoginEmail").value = email;
        document.getElementById("cfLoginPassword").value = "";

        showView("login");
        setStatus(
          "Account creato. Conferma l’email ricevuta, poi torna qui e accedi."
        );
      });

    document
      .getElementById("cfLoginButton")
      .addEventListener("click", async () => {
        const email =
          document.getElementById("cfLoginEmail").value.trim();
        const password =
          document.getElementById("cfLoginPassword").value;

        if (!email || !password) {
          setStatus("Inserisci email e password.", true);
          return;
        }

        setStatus("Accesso in corso…");

        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          setStatus(
            "Email o password non corrette, oppure email non confermata.",
            true
          );
          return;
        }

        if (data.user) {
          document.getElementById("cfLoginPassword").value = "";
          unlockApp();
        }
      });

    document
      .getElementById("cfSendRecovery")
      .addEventListener("click", async () => {
        const email =
          document.getElementById("cfRecoveryEmail").value.trim();

        if (!email) {
          setStatus("Inserisci la tua email.", true);
          return;
        }

        setStatus("Invio email di recupero…");

        const redirectTo =
          window.location.origin +
          window.location.pathname +
          "?reset-password=1";

        const { error } =
          await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo
          });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        setStatus(
          "Email inviata. Aprila e premi il collegamento per cambiare password."
        );
      });

    document
      .getElementById("cfSaveNewPassword")
      .addEventListener("click", async () => {
        const password =
          document.getElementById("cfNewPassword").value;

        if (password.length < 8) {
          setStatus(
            "La password deve contenere almeno 8 caratteri.",
            true
          );
          return;
        }

        setStatus("Aggiornamento password…");

        const { error } = await supabaseClient.auth.updateUser({
          password
        });

        if (error) {
          setStatus(error.message, true);
          return;
        }

        await supabaseClient.auth.signOut();

        history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        showView("login");
        setStatus("Password aggiornata. Ora puoi accedere.");
      });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        lockApp();
        showView("newPassword");
        return;
      }

      if (session?.user) {
        unlockApp();
      } else {
        lockApp();
      }
    });

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    const recoveryMode =
      new URLSearchParams(window.location.search)
        .get("reset-password") === "1";

    if (recoveryMode) {
      lockApp();
      showView("newPassword");
    } else if (session?.user) {
      unlockApp();
    } else {
      lockApp();
      showView("login");
       }

    const profileStatus = document.getElementById("profileStatus");

    if (profileStatus) {
      profileStatus.insertAdjacentHTML(
        "beforebegin",
        `
        <div class="cf-account-tools">
          <strong>Account CamperFree</strong>
          <div style="margin-top:10px">
            <button id="cfChangePasswordInside" type="button">
              Cambia password
            </button>
            <button id="cfLogoutInside" type="button">
              Esci
            </button>
          </div>
        </div>
        `
      );

      document
        .getElementById("cfChangePasswordInside")
        .addEventListener("click", () => {
          lockApp();
          showView("newPassword");
        });

      document
        .getElementById("cfLogoutInside")
        .addEventListener("click", async () => {
          await supabaseClient.auth.signOut();
          showView("login");
          lockApp();
        });

      profileStatus.textContent = "Servizio account disponibile.";
    }
  } catch (error) {
    lockApp();
    setStatus(error.message, true);
  }
})();
