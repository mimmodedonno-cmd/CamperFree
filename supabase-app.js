(async function () {
  const profileStatus = document.getElementById("profileStatus");
  const profileEmail = document.getElementById("profileEmail");
  const privacyInput = document.getElementById("privacyAccept");

  if (!profileStatus || !profileEmail || !privacyInput) return;

  function showStatus(message, isError = false) {
    profileStatus.textContent = message;
    profileStatus.style.color = isError ? "#b42318" : "#315440";
  }

  function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Impossibile caricare Supabase"));
      document.head.appendChild(script);
    });
  }

  try {
    const response = await fetch("/api/supabase-config", {
      cache: "no-store"
    });

    const config = await response.json();

    if (!response.ok || !config.ok) {
      throw new Error(
        config.error || "Configurazione Supabase non disponibile"
      );
    }

    await loadSupabaseLibrary();

    const supabaseClient = window.supabase.createClient(
      config.url,
      config.key
    );

    window.camperFreeSupabase = supabaseClient;

    profileStatus.insertAdjacentHTML(
      "beforebegin",
      `
      <div id="accountPanel"
           style="margin-top:16px;padding:16px;border:1px solid #d7e2dc;
                  border-radius:18px;background:#fff">

        <h3 id="accountTitle" style="margin:0 0 14px">
          🔐 Accedi al tuo account
        </h3>

        <div id="accountLoginFields">
          <div class="label">Email account</div>
          <input
            id="accountEmail"
            type="email"
            autocomplete="email"
            placeholder="nome@email.it"
          >

          <div class="label" style="margin-top:12px">
            Password
          </div>

          <div style="position:relative">
            <input
              id="accountPassword"
              type="password"
              minlength="8"
              autocomplete="current-password"
              placeholder="Almeno 8 caratteri"
              style="padding-right:55px"
            >

            <button
              id="togglePassword"
              type="button"
              aria-label="Mostra o nascondi password"
              title="Mostra o nascondi password"
              style="position:absolute;right:8px;top:50%;
                     transform:translateY(-50%);padding:7px 10px"
            >👁</button>
          </div>
        </div>

        <div id="loginActions" style="margin-top:14px">
          <button id="loginAccount" type="button" class="primary">
            Accedi
          </button>

          <button id="forgotPassword" type="button">
            Password dimenticata?
          </button>

          <div style="margin-top:14px">
            Non hai un account?
            <button id="showRegister" type="button">
              Registrati
            </button>
          </div>
        </div>

        <div id="registerActions" style="display:none;margin-top:14px">
          <p style="margin:0 0 12px;color:#53645b">
            Compila anche nome, cognome e accetta l’informativa privacy.
          </p>

          <button id="registerAccount" type="button" class="primary">
            Crea account
          </button>

          <button id="backToLogin" type="button">
            Torna ad Accedi
          </button>
        </div>

        <div id="loggedActions" style="display:none;margin-top:14px">
          <button id="changePassword" type="button">
            Cambia password
          </button>

          <button id="logoutAccount" type="button">
            Esci
          </button>
        </div>

        <div id="newPasswordPanel" style="display:none;margin-top:14px">
          <div class="label">Nuova password</div>

          <div style="position:relative">
            <input
              id="newAccountPassword"
              type="password"
              minlength="8"
              autocomplete="new-password"
              placeholder="Almeno 8 caratteri"
              style="padding-right:55px"
            >

            <button
              id="toggleNewPassword"
              type="button"
              aria-label="Mostra o nascondi nuova password"
              title="Mostra o nascondi nuova password"
              style="position:absolute;right:8px;top:50%;
                     transform:translateY(-50%);padding:7px 10px"
            >👁</button>
          </div>

          <button
            id="saveNewPassword"
            type="button"
            class="primary"
            style="margin-top:12px"
          >
            Salva nuova password
          </button>

          <button id="cancelNewPassword" type="button">
            Annulla
          </button>
        </div>

        <div id="accountStatus"
             class="status"
             style="margin-top:12px"></div>
      </div>
      `
    );

    const accountTitle = document.getElementById("accountTitle");
    const accountEmail = document.getElementById("accountEmail");
    const passwordInput = document.getElementById("accountPassword");
    const newPasswordInput =
      document.getElementById("newAccountPassword");

    const loginActions = document.getElementById("loginActions");
    const registerActions = document.getElementById("registerActions");
    const loggedActions = document.getElementById("loggedActions");
    const loginFields = document.getElementById("accountLoginFields");
    const newPasswordPanel =
      document.getElementById("newPasswordPanel");
    const accountStatus = document.getElementById("accountStatus");

    const loginButton = document.getElementById("loginAccount");
    const registerButton =
      document.getElementById("registerAccount");
    const logoutButton =
      document.getElementById("logoutAccount");

    function setAccountStatus(message, isError = false) {
      accountStatus.textContent = message;
      accountStatus.style.color = isError ? "#b42318" : "#315440";
    }

    function toggleVisibility(input, button) {
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.textContent = hidden ? "🙈" : "👁";
      button.title = hidden ? "Nascondi password" : "Mostra password";
    }

    document
      .getElementById("togglePassword")
      .addEventListener("click", () => {
        toggleVisibility(
          passwordInput,
          document.getElementById("togglePassword")
        );
      });

    document
      .getElementById("toggleNewPassword")
      .addEventListener("click", () => {
        toggleVisibility(
          newPasswordInput,
          document.getElementById("toggleNewPassword")
        );
      });

    function showLogin() {
      accountTitle.textContent = "🔐 Accedi al tuo account";
      loginFields.style.display = "";
      loginActions.style.display = "";
      registerActions.style.display = "none";
      loggedActions.style.display = "none";
      newPasswordPanel.style.display = "none";
      passwordInput.autocomplete = "current-password";
      setAccountStatus("Inserisci email e password.");
    }

    function showRegister() {
      accountTitle.textContent = "👤 Crea il tuo account";
      loginFields.style.display = "";
      loginActions.style.display = "none";
      registerActions.style.display = "";
      loggedActions.style.display = "none";
      newPasswordPanel.style.display = "none";
      passwordInput.autocomplete = "new-password";
      setAccountStatus(
        "Inserisci i dati e scegli una password di almeno 8 caratteri."
      );
    }

    function showLoggedIn(user) {
      accountTitle.textContent = "✅ Account collegato";
      loginFields.style.display = "none";
      loginActions.style.display = "none";
      registerActions.style.display = "none";
      loggedActions.style.display = "";
      newPasswordPanel.style.display = "none";

      if (user?.email) {
  accountEmail.value = user.email;
}

      setAccountStatus(`Accesso effettuato: ${user?.email || ""}`);
    }

    function showNewPassword() {
      accountTitle.textContent = "🔑 Imposta una nuova password";
      loginFields.style.display = "none";
      loginActions.style.display = "none";
      registerActions.style.display = "none";
      loggedActions.style.display = "none";
      newPasswordPanel.style.display = "";
      newPasswordInput.value = "";
      setAccountStatus(
        "Inserisci una nuova password di almeno 8 caratteri."
      );
    }

   
    document
      .getElementById("showRegister")
      .addEventListener("click", showRegister);

    document
      .getElementById("backToLogin")
      .addEventListener("click", showLogin);

    registerButton.addEventListener("click", async () => {
      const email = accountEmail.value.trim();
      const password = passwordInput.value;

      if (!privacyInput.checked) {
        setAccountStatus(
          "Devi accettare l’informativa privacy.",
          true
        );
        return;
      }

      if (!email) {
        setAccountStatus("Inserisci la tua email.", true);
        return;
      }

      if (password.length < 8) {
        setAccountStatus(
          "La password deve contenere almeno 8 caratteri.",
          true
        );
        return;
      }

      setAccountStatus("Creazione account in corso…");

      const { data, error } =
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + window.location.pathname,
            data: {
              first_name:
                document.getElementById("profileName")?.value.trim() || "",
              last_name:
                document.getElementById("profileSurname")?.value.trim() || ""
            }
          }
        });

      if (error) {
        setAccountStatus(error.message, true);
        return;
      }

      passwordInput.value = "";

      if (data.session) {
        showLoggedIn(data.user);
      } else {
        showLogin();
        setAccountStatus(
          "Account creato. Controlla l’email, conferma la registrazione e poi accedi."
        );
      }
    });

    loginButton.addEventListener("click", async () => {
      const email = accountEmail.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setAccountStatus("Inserisci email e password.", true);
        return;
      }

      setAccountStatus("Accesso in corso…");

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        setAccountStatus(
          "Email o password non corrette, oppure email non ancora confermata.",
          true
        );
        return;
      }

      passwordInput.value = "";
      showLoggedIn(data.user);
    });

    document
      .getElementById("forgotPassword")
      .addEventListener("click", async () => {
        const email = accountEmail.value.trim();

        if (!email) {
          setAccountStatus(
            "Inserisci prima la tua email.",
            true
          );
          return;
        }

        setAccountStatus("Invio email di recupero…");

        const redirectUrl =
          window.location.origin +
          window.location.pathname +
          "?reset-password=1";

        const { error } =
          await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
          });

        if (error) {
          setAccountStatus(error.message, true);
          return;
        }

        setAccountStatus(
          "Email inviata. Aprila e premi il collegamento per cambiare password."
        );
      });

    document
      .getElementById("changePassword")
      .addEventListener("click", showNewPassword);

    document
      .getElementById("cancelNewPassword")
      .addEventListener("click", async () => {
        const {
          data: { session }
        } = await supabaseClient.auth.getSession();

        if (session?.user) {
          showLoggedIn(session.user);
        } else {
          showLogin();
        }
      });

    document
      .getElementById("saveNewPassword")
      .addEventListener("click", async () => {
        const newPassword = newPasswordInput.value;

        if (newPassword.length < 8) {
          setAccountStatus(
            "La nuova password deve contenere almeno 8 caratteri.",
            true
          );
          return;
        }

        setAccountStatus("Aggiornamento password…");

        const { data, error } =
          await supabaseClient.auth.updateUser({
            password: newPassword
          });

        if (error) {
          setAccountStatus(error.message, true);
          return;
        }

        newPasswordInput.value = "";
        showLoggedIn(data.user);
        setAccountStatus("Password aggiornata correttamente.");
      });

    logoutButton.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        setAccountStatus(error.message, true);
        return;
      }

      passwordInput.value = "";
      showLogin();
      setAccountStatus("Disconnessione effettuata.");
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        showNewPassword();
        return;
      }

      if (session?.user) {
        showLoggedIn(session.user);
      } else {
        showLogin();
      }
    });

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    const isPasswordRecovery =
      new URLSearchParams(window.location.search)
        .get("reset-password") === "1";

    if (isPasswordRecovery && session?.user) {
      showNewPassword();
    } else if (session?.user) {
      showLoggedIn(session.user);
    } else {
      showLogin();
    }

    showStatus("Servizio account disponibile.");
  } catch (error) {
    showStatus(error.message, true);
  }
})();
