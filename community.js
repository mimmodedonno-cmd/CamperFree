(() => {
  const STYLE_ID = "cfCommunityStyles";
  const SCREEN_ID = "screen-community";
  const BUCKET = "community-images";

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .communityComposer textarea{width:100%;min-height:90px;border:1px solid #d7dfd9;border-radius:14px;padding:13px 14px;font:inherit;resize:vertical}
      .communityComposer input[type=file]{padding:9px;background:#fff}
      .communityActions{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:10px}
      .communityPost{background:#fff;border-radius:18px;box-shadow:0 3px 18px #00000012;padding:12px;margin-bottom:10px}
      .communityAuthor{font-weight:900}.communityDate{color:#68736d;font-size:12px;margin-top:2px}
      .communityPlace{font-weight:800;color:#315440;margin:10px 0 5px}
      .communityBody{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4;margin:8px 0 10px}
      .communityImage{display:block;width:100%;max-height:520px;object-fit:cover;border-radius:14px;margin-top:10px;background:#eef3ee}
      .communityComment{padding:8px 0;border-top:1px solid #edf1ed;font-size:13px}
      .communityCommentForm{display:flex;gap:7px;margin-top:9px}.communityCommentForm input{flex:1;min-width:0}
      .communityEmpty{text-align:center;color:#68736d;padding:24px 10px}
      .communityDelete{background:none;box-shadow:none;color:#8b2d2d;padding:5px 8px;font-size:12px}
      .communityHeader{display:flex;align-items:center;justify-content:space-between;gap:10px}
      @media(max-width:600px){.communityCommentForm{align-items:stretch}.communityCommentForm button{flex:none}}
    `;
    document.head.appendChild(style);
  }

  function addInterface() {
    if (document.getElementById(SCREEN_ID)) return;
    addStyles();

    const screen = document.createElement("section");
    screen.id = SCREEN_ID;
    screen.className = "screen";
    screen.innerHTML = `
      <div class="card communityComposer">
        <div class="routeTitle">💬 Comunità CamperFree</div>
        <div class="muted" style="margin:5px 0 10px">Condividi soste, consigli ed esperienze con gli altri camperisti.</div>
        <div class="label">Località o area di sosta (facoltativa)</div>
        <input id="communityPlace" maxlength="120" placeholder="Es. Area sosta Nizza">
        <div class="label">Il tuo post</div>
        <textarea id="communityBody" maxlength="1500" placeholder="Scrivi un consiglio o racconta la tua esperienza…"></textarea>
        <div class="label">Fotografia facoltativa (JPG, PNG o WebP, massimo 5 MB)</div>
        <input id="communityImage" type="file" accept="image/jpeg,image/png,image/webp">
        <div class="communityActions">
          <div id="communityStatus" class="status" aria-live="polite"></div>
          <button id="communityPublish" class="primary" type="button">Pubblica</button>
        </div>
      </div>
      <div id="communityFeed"><div class="card communityEmpty">Apri Comunità per caricare i post.</div></div>
    `;
    document.querySelector(".app").appendChild(screen);

    const nav = document.createElement("button");
    nav.className = "navBtn";
    nav.dataset.screen = "community";
    nav.innerHTML = "💬<br>Comunità";
    document.querySelector(".bottom").appendChild(nav);
    nav.addEventListener("click", openCommunity);
    document.getElementById("communityPublish").addEventListener("click", publishPost);
  }

  function setStatus(message, error = false) {
    const el = document.getElementById("communityStatus");
    el.textContent = message;
    el.style.color = error ? "#8b2d2d" : "#315440";
  }

  async function getClient() {
    for (let i = 0; i < 50; i += 1) {
      if (window.camperFreeSupabase) return window.camperFreeSupabase;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Servizio account non disponibile.");
  }

  async function getUser() {
    const client = await getClient();
    const { data } = await client.auth.getUser();
    return data.user || null;
  }

  function displayName(user) {
    const meta = user?.user_metadata || {};
    const full = [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim();
    return full || user?.email?.split("@")[0] || "Camperista";
  }

  function openCommunity() {
    document.querySelectorAll(".navBtn").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".screen").forEach(item => item.classList.remove("active"));
    document.querySelector('.navBtn[data-screen="community"]').classList.add("active");
    document.getElementById(SCREEN_ID).classList.add("active");
    loadPosts();
  }

  async function uploadImage(client, user, file) {
    if (!file) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Formato fotografia non supportato.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La fotografia supera 5 MB.");
    }
    const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) throw error;
    return path;
  }

  async function publishPost() {
    const button = document.getElementById("communityPublish");
    const body = document.getElementById("communityBody").value.trim();
    const place = document.getElementById("communityPlace").value.trim();
    const file = document.getElementById("communityImage").files[0] || null;
    if (!body) return setStatus("Scrivi un testo prima di pubblicare.", true);

    button.disabled = true;
    setStatus("Pubblicazione in corso…");
    let imagePath = null;
    try {
      const client = await getClient();
      const user = await getUser();
      if (!user) throw new Error("Devi accedere per pubblicare.");
      imagePath = await uploadImage(client, user, file);
      const { error } = await client.from("community_posts").insert({
        user_id: user.id,
        body,
        place_name: place || null,
        image_path: imagePath
      });
      if (error) throw error;
      document.getElementById("communityBody").value = "";
      document.getElementById("communityPlace").value = "";
      document.getElementById("communityImage").value = "";
      setStatus("Post pubblicato.");
      await loadPosts();
    } catch (error) {
      setStatus(error.message || "Pubblicazione non riuscita.", true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadPosts() {
    const feed = document.getElementById("communityFeed");
    feed.innerHTML = '<div class="card communityEmpty">Caricamento post…</div>';
    try {
      const client = await getClient();
      const user = await getUser();
      const { data: posts, error } = await client
        .from("community_posts")
        .select("id,user_id,body,place_name,image_path,created_at,community_comments(id,user_id,body,created_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!posts?.length) {
        feed.innerHTML = '<div class="card communityEmpty">Non ci sono ancora post. Puoi pubblicare il primo.</div>';
        return;
      }
      feed.innerHTML = posts.map(post => postHtml(client, post, user)).join("");
      bindPostActions();
    } catch (error) {
      feed.innerHTML = `<div class="card communityEmpty">${escapeHtml(error.message || "Impossibile caricare i post.")}</div>`;
    }
  }

  function postHtml(client, post, user) {
    const imageUrl = post.image_path
      ? client.storage.from(BUCKET).getPublicUrl(post.image_path).data.publicUrl
      : "";
    const comments = (post.community_comments || [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const ownPost = user?.id === post.user_id;
    return `
      <article class="communityPost" data-post-id="${post.id}">
        <div class="communityHeader">
          <div><div class="communityAuthor">🚐 Camperista</div><div class="communityDate">${new Date(post.created_at).toLocaleString("it-IT")}</div></div>
          ${ownPost ? `<button class="communityDelete" data-delete-post="${post.id}" type="button">Elimina</button>` : ""}
        </div>
        ${post.place_name ? `<div class="communityPlace">📍 ${escapeHtml(post.place_name)}</div>` : ""}
        <div class="communityBody">${escapeHtml(post.body)}</div>
        ${imageUrl ? `<img class="communityImage" src="${escapeHtml(imageUrl)}" alt="Fotografia pubblicata nella Comunità CamperFree" loading="lazy">` : ""}
        <div class="small" style="font-weight:800;margin-top:12px">💬 ${comments.length} comment${comments.length === 1 ? "o" : "i"}</div>
        <div>${comments.map(comment => `
          <div class="communityComment">
            <b>Camperista:</b> ${escapeHtml(comment.body)}
            ${user?.id === comment.user_id ? `<button class="communityDelete" data-delete-comment="${comment.id}" type="button">Elimina</button>` : ""}
          </div>`).join("")}
        </div>
        <form class="communityCommentForm" data-comment-form="${post.id}">
          <input maxlength="500" aria-label="Scrivi un commento" placeholder="Scrivi un commento…">
          <button class="primary" type="submit">Invia</button>
        </form>
      </article>`;
  }

  function bindPostActions() {
    document.querySelectorAll("[data-comment-form]").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();
        const input = form.querySelector("input");
        const body = input.value.trim();
        if (!body) return;
        try {
          const client = await getClient();
          const user = await getUser();
          if (!user) throw new Error("Devi accedere per commentare.");
          const { error } = await client.from("community_comments").insert({
            post_id: form.dataset.commentForm,
            user_id: user.id,
            body
          });
          if (error) throw error;
          input.value = "";
          await loadPosts();
        } catch (error) {
          setStatus(error.message || "Commento non inviato.", true);
        }
      });
    });

    document.querySelectorAll("[data-delete-post]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Eliminare questo post e i suoi commenti?")) return;
        const client = await getClient();
        const { error } = await client.from("community_posts").delete().eq("id", button.dataset.deletePost);
        if (error) return setStatus(error.message, true);
        await loadPosts();
      });
    });

    document.querySelectorAll("[data-delete-comment]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Eliminare questo commento?")) return;
        const client = await getClient();
        const { error } = await client.from("community_comments").delete().eq("id", button.dataset.deleteComment);
        if (error) return setStatus(error.message, true);
        await loadPosts();
      });
    });
  }

  addInterface();
})();
