(async function () {
  function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Impossibile caricare il servizio account."));
      document.head.appendChild(script);
    });
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      body.cf-auth-locked{overflow:hidden!important}
      #cfAuthGate{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;overflow-y:auto;padding:20px;background:rgba(10,28,22,.82);font-family:Arial,sans-serif}
      #cfAuthGate.cf-visible{display:flex}
      .cf-auth-card{width:min(480px,100%);padding:26px;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(0,0,0,.28)}
      .cf-auth-logo{text-align:center;color:#123f32;font-size:28px;font-weight:800}
      .cf-auth-subtitle{text-align:center;color:#607068}
      .cf-auth-title{margin:20px 0 16px;color:#173f33;font-size:22px}
      .cf-auth-label{display:block;margin:12px 0 6px;color:#263b33;font-size:14px;font-weight:700}
      .cf-auth-input{box-sizing:border-box;width:100%;min-height:48px;padding:11px 14px;border:1px solid #cad8d0;border-radius:14px;background:#fff;font-size:16px}
      .cf-password-box{position:relative}.cf-password-box .cf-auth-input{padding-right:58px}
      .cf-eye{position:absolute;top:50%;right:7px;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;font-size:20px}
      .cf-primary{width:100%;min-height:48px;margin-top:18px;border:0;border-radius:14px;background:#124c3c;color:#fff;cursor:pointer;font-size:16px;font-weight:800}
      .cf-secondary{width:100%;min-height:46px;margin-top:10px;border:1px solid #b9cbc1;border-radius:14px;background:#fff;color:#173f33;cursor:pointer;font-size:15px;font-weight:700}
      .cf-link{border:0;background:transparent;color:#145c48;cursor:pointer;font-weight:700;text-decoration:underline}
      .cf-center{margin-top:16px;text-align:center}.cf-check{display:flex;gap:9px;align-items:flex-start;margin-top:14px;color:#37483f;font-size:13px}
      .cf-status{min-height:22px;margin-top:15px;color:#315440;font-size:14px;font-weight:700;text-align:center}.cf-status.cf-error{color:#b42318}
      .cf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .cf-splash-access{margin-left:8px}
      .cf-account-tools{margin-top:15px;padding:14px;border:1px solid #d5e1da;border-radius:15px}
      @media(max-width:540px){#cfAuthGate{align-items:flex-start;padding:12px}.cf-auth-card{padding:20px}.cf-row{grid-template-columns:1fr;gap:0}}
    `;
    document.head.appendChild(style);
  }

  function addInterface() {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="cfAuthGate" role="dialog" aria-modal="true">
        <div class="cf-auth-card">
          <div class="cf-auth-logo">ðŸš CamperFree</div>
          <div class="cf-auth-subtitle">Il tuo viaggio, il tuo account</div>

          <section id="cfConfirmView" hidden>
            <h2 class="cf-auth-title">Conferma account</h2>
            <p id="cfConfirmText"></p>
            <button id="cfContinueButton" class="cf-primary" type="button">Continua</button>
            <button id="cfOtherAccount" class="cf-secondary" type="button">Accedi con un altro account</button>
            <button id="cfConfirmCancel" class="cf-link" type="button" style="margin-top:16px">Torna alla copertina</button>
          </section>

          <section id="cfLoginView" hidden>
            <h2 class="cf-auth-title">Accedi</h2>
            <label class="cf-auth-label" for="cfLoginEmail">Email</label>
            <input id="cfLoginEmail" class="cf-auth-input" type="email" autocomplete="email" placeholder="nome@email.it">
            <label class="cf-auth-label" for="cfLoginPassword">Password</label>
            <div class="cf-password-box">
              <input id="cfLoginPassword" class="cf-auth-input" type="password" autocomplete="current-password" placeholder="Password">
              <button class="cf-eye" type="button" data-password="cfLoginPassword">ðŸ‘</button>
            </div>
            <button id="cfLoginButton" class="cf-primary" type="button">Accedi</button>
            <div class="cf-center"><button id="cfForgotButton" class="cf-link" type="button">Password dimenticata?</button></div>
            <div class="cf-center">Non hai un account? <button id="cfOpenRegister" class="cf-link" type="button">Registrati</button></div>
            <div class="cf-center"><button id="cfLoginCancel" class="cf-link" type="button">Torna alla copertina</button></div>
          </section>

          <section id="cfRegisterView" hidden>
            <h2 class="cf-auth-title">Crea il tuo account</h2>
            <div class="cf-row">
              <div><label class="cf-auth-label" for="cfRegisterName">Nome</label><input id="cfRegisterName" class="cf-auth-input" type="text"></div>
              <div><label class="cf-auth-label" for="cfRegisterSurname">Cognome</label><input id="cfRegisterSurname" class="cf-auth-input" type="text"></div>
            </div>
            <label class="cf-auth-label" for="cfRegisterPhone">Telefono</label>
            <input id="cfRegisterPhone" class="cf-auth-input" type="tel" autocomplete="tel">
            <label class="cf-auth-label" for="cfRegisterEmail">Email</label>
            <input id="cfRegisterEmail" class="cf-auth-input" type="email" autocomplete="email" placeholder="nome@email.it">
            <label class="cf-auth-label" for="cfRegisterPassword">Password</label>
            <div class="cf-password-box"><input id="cfRegisterPassword" class="cf-auth-input" type="password" minlength="8" autocomplete="new-password" placeholder="Almeno 8 caratteri"><button class="cf-eye" type="button" data-password="cfRegisterPassword">ðŸ‘</button></div>
            <label class="cf-auth-label" for="cfConfirmPassword">Ripeti password</label>
            <div class="cf-password-box"><input id="cfConfirmPassword" class="cf-auth-input" type="password" minlength="8" autocomplete="new-password" placeholder="Ripeti la password"><button class="cf-eye" type="button" data-password="cfConfirmPassword">ðŸ‘</button></div>
            <label class="cf-check"><input id="cfRegisterPrivacy" type="checkbox"><span>Ho letto lâ€™informativa privacy e acconsento al trattamento necessario per utilizzare CamperFree.</span></label>
            <label class="cf-check"><input id="cfRegisterMarketing" type="checkbox"><span>Voglio ricevere comunicazioni e novitÃ  CamperFree (facoltativo).</span></label>
            <button id="cfRegisterButton" class="cf-primary" type="button">Crea account</button>
            <div class="cf-center">Hai giÃ  un account? <button id="cfBackToLogin" class="cf-link" type="button">Accedi</button></div>
          </section>

          <section id="cfRecoveryView" hidden>
            <h2 class="cf-auth-title">Recupera password</h2>
            <label class="cf-auth-label" for="cfRecoveryEmail">Email</label>
            <input id="cfRecoveryEmail" class="cf-auth-input" type="email" autocomplete="email" placeholder="nome@email.it">
            <button id="cfSendRecovery" class="cf-primary" type="button">Invia email di recupero</button>
            <div class="cf-center"><button id="cfRecoveryBack" class="cf-link" type="button">Torna ad Accedi</button></div>
          </section>

          <section id="cfNewPasswordView" hidden>
            <h2 class="cf-auth-title">Crea una nuova password</h2>
            <label class="cf-auth-label" for="cfNewPassword">Nuova password</label>
            <div class="cf-password-box"><input id="cfNewPassword" class="cf-auth-input" type="password" minlength="8" autocomplete="new-password" placeholder="Almeno 8 caratteri"><button class="cf-eye" type="button" data-password="cfNewPassword">ðŸ‘</button></div>
            <button id="cfSaveNewPassword" class="cf-primary" type="button">Salva nuova password</button>
          </section>

          <div id="cfAuthStatus" class="cf-status"></div>
        </div>
      </div>
    `);
  }

  addStyles();
  addInterface();

  const gate = document.getElementById("cfAuthGate");
  const status = document.getElementById("cfAuthStatus");
  const splash = document.getElementById("splash");
  const enterButton = document.getElementById("enterApp");
  const originalEnter = enterButton ? enterButton.onclick : null;
  let client;
  let activeSession = null;

  const views = {
    confirm: document.getElementById("cfConfirmView"),
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
    Object.entries(views).forEach(([key, element]) => { element.hidden = key !== name; });
    setStatus("");
  }

  function showGate(name) {
    showView(name);
    gate.classList.add("cf-visible");
    document.body.classList.add("cf-auth-locked");
  }

  function hideGate() {
    gate.classList.remove("cf-visible");
    document.body.classList.remove("cf-auth-locked");
  }

  function returnToCover() {
    hideGate();
    if (splash) splash.style.display = "flex";
  }

  function openApp() {
    hideGate();
    if (originalEnter) originalEnter.call(enterButton);
    else if (splash) splash.style.display = "none";
  }

  async function requestEntry() {
    if (!client) {
      showGate("login");
      setStatus("Servizio account in caricamentoâ€¦");
      return;
    }
    const { data } = await client.auth.getSession();
    activeSession = data.session;
    if (activeSession?.user) {
      document.getElementById("cfConfirmText").textContent = `Vuoi continuare come ${activeSession.user.email}?`;
      showGate("confirm");
    } else {
      showGate("login");
    }
  }

  if (enterButton) {
  enterButton.textContent = "ENTRA";

  enterButton.onclick = event => {
    event.preventDefault();
    requestEntry();
  };
}
   
  document.querySelectorAll("[data-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.password);
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.textContent = hidden ? "ðŸ™ˆ" : "ðŸ‘";
    });
  });

  document.getElementById("cfOpenRegister").onclick = () => showView("register");
  document.getElementById("cfBackToLogin").onclick = () => showView("login");
  document.getElementById("cfLoginCancel").onclick = returnToCover;
  document.getElementById("cfConfirmCancel").onclick = returnToCover;
  document.getElementById("cfRecoveryBack").onclick = () => showView("login");
  document.getElementById("cfForgotButton").onclick = () => {
    document.getElementById("cfRecoveryEmail").value = document.getElementById("cfLoginEmail").value;
    showView("recovery");
  };
  document.getElementById("cfContinueButton").onclick = openApp;

  try {
    const response = await fetch("/api/supabase-config", { cache: "no-store" });
    const config = await response.json();
    if (!response.ok || !config.ok) throw new Error(config.error || "Configurazione account non disponibile.");

    await loadSupabaseLibrary();
    client = window.supabase.createClient(config.url, config.key);
    window.camperFreeSupabase = client;

    document.getElementById("cfOtherAccount").onclick = async () => {
      await client.auth.signOut();
      activeSession = null;
      showView("login");
    };

    document.getElementById("cfLoginButton").onclick = async () => {
      const email = document.getElementById("cfLoginEmail").value.trim();
      const password = document.getElementById("cfLoginPassword").value;
      if (!email || !password) return setStatus("Inserisci email e password.", true);
      setStatus("Accesso in corsoâ€¦");
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return setStatus("Email o password non corrette, oppure email non confermata.", true);
      activeSession = data.session;
      document.getElementById("cfLoginPassword").value = "";
      openApp();
    };

    document.getElementById("cfRegisterButton").onclick = async () => {
      const firstName = document.getElementById("cfRegisterName").value.trim();
      const lastName = document.getElementById("cfRegisterSurname").value.trim();
      const phone = document.getElementById("cfRegisterPhone").value.trim();
      const email = document.getElementById("cfRegisterEmail").value.trim();
      const password = document.getElementById("cfRegisterPassword").value;
      const confirmation = document.getElementById("cfConfirmPassword").value;
      const privacy = document.getElementById("cfRegisterPrivacy").checked;
      const marketing = document.getElementById("cfRegisterMarketing").checked;
      if (!firstName || !lastName || !email) return setStatus("Compila nome, cognome ed email.", true);
      if (!privacy) return setStatus("Devi accettare lâ€™informativa privacy.", true);
      if (password.length < 8) return setStatus("La password deve contenere almeno 8 caratteri.", true);
      if (password !== confirmation) return setStatus("Le due password non coincidono.", true);
      setStatus("Creazione account in corsoâ€¦");
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
          data: { first_name: firstName, last_name: lastName, phone, privacy_accepted: true, marketing_accepted: marketing }
        }
      });
      if (error) return setStatus(error.message, true);
      if (data.session) await client.auth.signOut();
      document.getElementById("cfLoginEmail").value = email;
      showView("login");
      setStatus("Account creato. Conferma lâ€™email ricevuta, poi accedi.");
    };

    document.getElementById("cfSendRecovery").onclick = async () => {
      const email = document.getElementById("cfRecoveryEmail").value.trim();
      if (!email) return setStatus("Inserisci la tua email.", true);
      setStatus("Invio email di recuperoâ€¦");
      const redirectTo = window.location.origin + window.location.pathname + "?reset-password=1";
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return setStatus(error.message, true);
      setStatus("Email inviata. Aprila e premi il collegamento per cambiare password.");
    };

    document.getElementById("cfSaveNewPassword").onclick = async () => {
      const password = document.getElementById("cfNewPassword").value;
      if (password.length < 8) return setStatus("La password deve contenere almeno 8 caratteri.", true);
      setStatus("Aggiornamento passwordâ€¦");
      const { error } = await client.auth.updateUser({ password });
      if (error) return setStatus(error.message, true);
      await client.auth.signOut();
      history.replaceState({}, document.title, window.location.pathname);
      showView("login");
      setStatus("Password aggiornata. Ora puoi accedere.");
    };

    client.auth.onAuthStateChange((event, session) => {
      activeSession = session;
      if (event === "PASSWORD_RECOVERY") showGate("newPassword");
    });

    const { data } = await client.auth.getSession();
    activeSession = data.session;
    const recoveryMode = new URLSearchParams(window.location.search).get("reset-password") === "1";
    if (recoveryMode) showGate("newPassword");

    const profileStatus = document.getElementById("profileStatus");
    if (profileStatus) {
      profileStatus.insertAdjacentHTML("beforebegin", `<div class="cf-account-tools"><strong>Account CamperFree</strong><div style="margin-top:10px"><button id="cfLogoutInside" type="button">Esci</button></div></div>`);
      document.getElementById("cfLogoutInside").onclick = async () => {
        await client.auth.signOut();
        activeSession = null;
        returnToCover();
      };
      profileStatus.textContent = "Servizio account disponibile.";
    }
  } catch (error) {
    setStatus(error.message, true);
  }
})();
