(async function () {
  const profileStatus = document.getElementById("profileStatus");
  const emailInput = document.getElementById("profileEmail");
  const privacyInput = document.getElementById("privacyAccept");

  function showStatus(message, isError = false) {
    profileStatus.textContent = message;
    profileStatus.style.color = isError ? "#b42318" : "#315440";
  }

  function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }

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
      <div id="accountPanel" style="margin-top:14px">
        <div class="label">Password account</div>
        <input
          id="accountPassword"
          type="password"
          minlength="8"
          autocomplete="current-password"
          placeholder="Almeno 8 caratteri"
        >

        <div class="filterGrid" style="margin-top:12px">
          <button id="registerAccount" class="primary">
            Crea account
          </button>
          <button id="loginAccount">
            Accedi
          </button>
          <button id="logoutAccount" style="display:none">
            Esci
          </button>
        </div>

        <div id="accountStatus" class="status"></div>
      </div>
      `
    );

    const passwordInput =
      document.getElementById("accountPassword");
    const registerButton =
      document.getElementById("registerAccount");
    const loginButton =
      document.getElementById("loginAccount");
    const logoutButton =
      document.getElementById("logoutAccount");
    const accountStatus =
      document.getElementById("accountStatus");

    function setAccountStatus(message, isError = false) {
      accountStatus.textContent = message;
      accountStatus.style.color = isError ? "#b42318" : "#315440";
    }

    function updateAccountView(user) {
      const loggedIn = Boolean(user);

      registerButton.style.display = loggedIn ? "none" : "";
      loginButton.style.display = loggedIn ? "none" : "";
      logoutButton.style.display = loggedIn ? "" : "none";
      passwordInput.style.display = loggedIn ? "none" : "";

      if (user) {
        emailInput.value = user.email || emailInput.value;
        setAccountStatus(`Account collegato: ${user.email}`);
      } else {
        setAccountStatus("Nessun account collegato.");
      }
    }

    registerButton.addEventListener("click", async () => {
      const email = emailInput.value.trim();
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
            emailRedirectTo: window.location.origin,
            data: {
              first_name:
                document.getElementById("profileName").value.trim(),
              last_name:
                document.getElementById("profileSurname").value.trim()
            }
          }
        });

      if (error) {
        setAccountStatus(error.message, true);
        return;
      }

      passwordInput.value = "";

      if (data.session) {
        updateAccountView(data.user);
      } else {
        setAccountStatus(
          "Account creato. Controlla l’email e conferma la registrazione."
        );
      }
    });

    loginButton.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setAccountStatus(
          "Inserisci email e password.",
          true
        );
        return;
      }

      setAccountStatus("Accesso in corso…");

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        setAccountStatus(error.message, true);
        return;
      }

      passwordInput.value = "";
      updateAccountView(data.user);
    });

    logoutButton.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        setAccountStatus(error.message, true);
        return;
      }

      updateAccountView(null);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateAccountView(session?.user || null);
    });

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    updateAccountView(session?.user || null);
    showStatus("Servizio account disponibile.");
  } catch (error) {
    showStatus(error.message, true);
  }
})();
