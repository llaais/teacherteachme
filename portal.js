
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eddveobyuaqkkldgekud.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_4HH5hhK270UYXFc9lMR8Dg_9LVFrEyv";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const BUCKET = "materials";

const PLANS = {
  "1": {
    title: "1 aula por semana",
    lessons: 4,
    price: 80
  },
  "2": {
    title: "2 aulas por semana",
    lessons: 8,
    price: 150
  },
  "3": {
    title: "3 aulas por semana",
    lessons: 12,
    price: 225
  },
  "4": {
    title: "4 aulas por semana",
    lessons: 16,
    price: 300
  }
};

const $ = id => document.getElementById(id);

let redirecting = false;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showMessage(element, message) {
  if (element) {
    element.textContent = message;
  }
}

function setBusy(button, busy, message = "Aguarde...") {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = true;
    button.textContent = message;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
}

function formatDate(date) {
  if (!date) return "Data não informada";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Data não informada";
  }

  return parsedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function getRedirectURL() {
  const url = new URL("login.html", window.location.href);

  url.search = "";
  url.hash = "";

  return url.href;
}

function initYear() {
  const year = $("currentYear");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

async function getProfile(userId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, plan, created_at, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }

    await new Promise(resolve => setTimeout(resolve, 700));
  }

  throw new Error(
    "Não encontramos seu perfil. Verifique as permissões da tabela profiles no Supabase."
  );
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    window.location.replace("login.html");
    return null;
  }

  return data.user;
}

async function goToRolePage(profile) {
  if (redirecting) return;

  if (profile.role === "teacher") {
    redirecting = true;
    window.location.replace("professora.html");
    return;
  }

  if (profile.role !== "student") {
    throw new Error("Tipo de conta não reconhecido.");
  }

  if (profile.is_active === false) {
    redirecting = true;

    await supabase.auth.signOut({
      scope: "local"
    });

    alert(
      "Sua conta está desativada. Entre em contato com a professora."
    );

    window.location.replace("login.html");
    return;
  }

  redirecting = true;
  window.location.replace("aluno.html");
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("Não foi possível sair da conta: " + error.message);
    return;
  }

  window.location.replace("login.html");
}

function initLogin() {
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  const feedback = $("authFeedback");
  const googleButton = $("googleLogin");
  const heading = $("authHeading");
  const subtitle = $("authSubtitle");
  const tabs = document.querySelectorAll("[data-tab]");

  if (!loginForm || !registerForm) {
    console.error("Os formulários de autenticação não foram encontrados.");
    return;
  }

  if (googleButton) {
    googleButton.type = "button";
  }

  const params = new URLSearchParams(window.location.search);
  const selectedPlan = params.get("plan");

  if (
    selectedPlan &&
    PLANS[selectedPlan] &&
    $("registerPlan")
  ) {
    $("registerPlan").value = selectedPlan;
  }

  function setTab(tab) {
    const registering = tab === "register";

    loginForm.hidden = registering;
    registerForm.hidden = !registering;

    tabs.forEach(button => {
      const active = button.dataset.tab === tab;

      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    if (heading) {
      heading.textContent = registering
        ? "Crie sua conta."
        : "Bem-vindo(a) de volta.";
    }

    if (subtitle) {
      subtitle.textContent = registering
        ? "Preencha seus dados para acessar a plataforma."
        : "Entre na sua conta para continuar.";
    }

    showMessage(feedback, "");
  }

  tabs.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      setTab(button.dataset.tab);
    });
  });

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = loginForm.querySelector(
      "button[type='submit']"
    );

    setBusy(button, true, "Entrando...");
    showMessage(feedback, "Verificando seus dados...");

    try {
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      const profile = await getProfile(data.user.id);

      await goToRolePage(profile);

    } catch (error) {
      console.error("Erro no login:", error);

      showMessage(
        feedback,
        error.message || "Não foi possível entrar na conta."
      );

      setBusy(button, false);
    }
  });

  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = registerForm.querySelector(
      "button[type='submit']"
    );

    setBusy(button, true, "Criando conta...");
    showMessage(feedback, "Criando sua conta...");

    try {
      const name = $("registerName").value.trim();
      const email = $("registerEmail").value.trim();
      const password = $("registerPassword").value;
      const plan = $("registerPlan").value;

      if (!name) {
        throw new Error("Informe seu nome.");
      }

      if (!PLANS[plan]) {
        throw new Error("Selecione um plano válido.");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            plan
          },
          emailRedirectTo: getRedirectURL()
        }
      });

      if (error) {
        throw error;
      }

      if (data.session && data.user) {
        const profile = await getProfile(data.user.id);
        await goToRolePage(profile);
      } else {
        showMessage(
          feedback,
          "Cadastro realizado! Confira seu e-mail para confirmar a conta. Depois, volte para entrar."
        );

        registerForm.reset();
        setBusy(button, false);
      }

    } catch (error) {
      console.error("Erro no cadastro:", error);

      showMessage(
        feedback,
        error.message || "Não foi possível criar sua conta."
      );

      setBusy(button, false);
    }
  });

  async function socialLogin(provider, button) {
    if (!button) return;

    setBusy(button, true, "Conectando...");

    showMessage(
      feedback,
      `Conectando com ${provider === "google" ? "Google" : "Apple"}...`
    );

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectURL()
        }
      });

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error(`Erro no login com ${provider}:`, error);

      showMessage(
        feedback,
        error.message || `Não foi possível entrar com ${provider}.`
      );

      setBusy(button, false);
    }
  }

  if (googleButton) {
    googleButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      socialLogin("google", googleButton);
    });
  }

  async function checkExistingSession() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session) {
        return;
      }

      showMessage(feedback, "Identificando sua conta...");

      const profile = await getProfile(data.session.user.id);

      await goToRolePage(profile);

    } catch (error) {
      console.error("Erro ao recuperar sessão:", error);

      showMessage(
        feedback,
        error.message || "Não foi possível recuperar sua sessão."
      );
    }
  }

  setTab(selectedPlan && PLANS[selectedPlan] ? "register" : "login");

  checkExistingSession();
}

async function initStudentPage() {
  let user;

  try {
    user = await getCurrentUser();

    if (!user) return;

  } catch (error) {
    console.error(error);
    window.location.replace("login.html");
    return;
  }

  let profile;

  try {
    profile = await getProfile(user.id);

  } catch (error) {
    console.error("Erro ao carregar perfil:", error);

    document.body.innerHTML = `
      <main class="empty-state">
        ${escapeHTML(error.message)}
      </main>
    `;

    return;
  }

  if (profile.role === "teacher") {
    window.location.replace("professora.html");
    return;
  }

  if (profile.role !== "student") {
    await logout();
    return;
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut({
      scope: "local"
    });

    alert(
      "Sua conta está desativada. Entre em contato com a professora."
    );

    window.location.replace("login.html");
    return;
  }

  const name = profile.full_name || user.email || "Estudante";
  const initials = name.trim().charAt(0).toUpperCase();

  if ($("studentName")) {
    $("studentName").textContent = name.split(" ")[0];
  }

  if ($("studentNavName")) {
    $("studentNavName").textContent = name;
  }

  if ($("studentInitials")) {
    $("studentInitials").textContent = initials;
  }

  $("studentLogout")?.addEventListener("click", logout);

  updateStudentPlan(profile);

  const hasAccess = await loadStudentAccess(user.id);

  if (hasAccess) {
    await loadStudentMaterials(user.id);
  } else {
    const container = $("studentMaterials");

    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          Seu acesso aos materiais está indisponível.
          Para liberar ou renovar o acesso, realize o pagamento
          do seu plano e aguarde a aprovação da professora.
        </div>
      `;
    }
  }

  if (!profile.plan && $("planSelection")) {
    $("planSelection").hidden = false;
  }

  const planForm = $("studentPlanForm");

  if (planForm) {
    planForm.addEventListener("submit", async event => {
      event.preventDefault();

      const plan = $("studentPlanSelect")?.value;

      if (!PLANS[plan]) {
        alert("Selecione um plano válido.");
        return;
      }

      const button = event.submitter;

      setBusy(button, true, "Salvando...");

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ plan })
          .eq("id", user.id);

        if (error) {
          throw error;
        }

        profile.plan = plan;

        updateStudentPlan(profile);

        if ($("planSelection")) {
          $("planSelection").hidden = true;
        }

      } catch (error) {
        console.error(error);

        alert(
          "Não foi possível salvar o plano: " + error.message
        );

      } finally {
        setBusy(button, false);
      }
    });
  }
}

function updateStudentPlan(profile) {
  const plan = PLANS[String(profile.plan)];

  if ($("studentPlanTitle")) {
    $("studentPlanTitle").textContent = plan
      ? plan.title
      : "Plano não selecionado";
  }

  if ($("studentPlanDescription")) {
    $("studentPlanDescription").textContent = plan
      ? `${plan.lessons} aulas por mês · R$ ${plan.price
          .toFixed(2)
          .replace(".", ",")}`
      : "Selecione seu plano para completar seu cadastro.";
  }
}

async function loadStudentAccess(userId) {
  const planDescription = $("studentPlanDescription");

  let status = $("studentAccessStatus");

  if (!status && planDescription) {
    status = document.createElement("div");

    status.id = "studentAccessStatus";
    status.className = "access-status";

    planDescription.insertAdjacentElement("afterend", status);
  }

  if (status) {
    status.textContent = "Verificando seu acesso...";
  }

  try {
    const { data, error } = await supabase
      .from("student_access")
      .select("starts_at, expires_at")
      .eq("student_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      if (status) {
        status.textContent =
          "Acesso ainda não liberado. Aguarde a aprovação do pagamento.";
      }

      return false;
    }

    const expiration = new Date(data.expires_at);
    const start = data.starts_at ? new Date(data.starts_at) : null;
    const now = new Date();

    if (Number.isNaN(expiration.getTime())) {
      throw new Error("A data de vencimento do acesso é inválida.");
    }

    if (start && !Number.isNaN(start.getTime()) && start > now) {
      if (status) {
        status.textContent =
          `Seu acesso começará em ${formatDate(data.starts_at)}.`;
      }

      return false;
    }

    if (expiration <= now) {
      if (status) {
        status.textContent =
          `Seu acesso venceu em ${formatDate(data.expires_at)}. Renove seu plano para continuar acessando os materiais.`;
      }

      return false;
    }

    if (status) {
      status.textContent =
        `Acesso ativo até ${formatDate(data.expires_at)}.`;
    }

    return true;

  } catch (error) {
    console.error("Erro ao verificar acesso:", error);

    if (status) {
      status.textContent =
        "Não foi possível verificar seu acesso. Atualize a página ou tente novamente.";
    }

    return false;
  }
}

async function loadStudentMaterials(userId) {
  const container = $("studentMaterials");

  if (!container) return;

  const { data, error } = await supabase
    .from("materials")
    .select(`
      id,
      title,
      subject,
      description,
      file_path,
      file_name,
      created_at
    `)
    .or(`target_id.is.null,target_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar materiais:", error);

    container.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar os materiais.
        ${escapeHTML(error.message)}
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Ainda não há materiais publicados para você.
        Quando a professora disponibilizar um conteúdo,
        ele aparecerá aqui.
      </div>
    `;

    return;
  }

  container.innerHTML = data.map(material => `
    <article class="material-card">
      <div>
        <p class="material-meta">
          ${escapeHTML(material.subject || "Material de aula")}
          · ${formatDate(material.created_at)}
        </p>

        <h3>${escapeHTML(material.title)}</h3>

        <p>
          ${escapeHTML(
            material.description ||
            "Conteúdo disponibilizado pela professora."
          )}
        </p>

        ${
          material.file_name
            ? `<p>Arquivo: ${escapeHTML(material.file_name)}</p>`
            : ""
        }
      </div>

      ${
        material.file_path
          ? `
            <button
              type="button"
              class="material-download"
              data-file-path="${escapeHTML(material.file_path)}"
            >
              Abrir material ↗
            </button>
          `
          : ""
      }
    </article>
  `).join("");

  container.querySelectorAll("[data-file-path]").forEach(button => {
    button.addEventListener("click", async () => {
      const filePath = button.dataset.filePath;
      const newWindow = window.open("about:blank", "_blank");

      if (!newWindow) {
        alert("Permita pop-ups neste site para abrir os materiais.");
        return;
      }

      button.disabled = true;
      button.textContent = "Abrindo...";

      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(filePath, 60);

        if (error) {
          throw error;
        }

        if (!data?.signedUrl) {
          throw new Error("Não foi possível gerar o link do arquivo.");
        }

        newWindow.location.href = data.signedUrl;

      } catch (error) {
        console.error("Erro ao abrir material:", error);

        newWindow.close();

        alert(
          "Não foi possível abrir o material. Verifique se seu acesso está ativo."
        );

      } finally {
        button.disabled = false;
        button.textContent = "Abrir material ↗";
      }
    });
  });
}

async function connectGoogleCalendar(button) {
  const feedback = $("calendarFeedback");

  setBusy(button, true, "Conectando...");
  showMessage(feedback, "Preparando conexão com o Google...");

  try {
    const { data, error } = await supabase.functions.invoke(
      "google-calendar-oauth",
      {
        method: "POST"
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.authorization_url) {
      throw new Error("Não foi possível iniciar a autorização.");
    }

    window.location.assign(data.authorization_url);

  } catch (error) {
    console.error("Erro ao conectar Google Calendar:", error);

    showMessage(
      feedback,
      error.message || "Não foi possível conectar o Google Calendar."
    );

    setBusy(button, false);
  }
}

async function initTeacherPage() {
  let user;

  try {
    user = await getCurrentUser();

    if (!user) return;

  } catch (error) {
    console.error(error);
    window.location.replace("login.html");
    return;
  }

  let profile;

  try {
    profile = await getProfile(user.id);

  } catch (error) {
    console.error(error);

    document.body.innerHTML = `
      <main class="empty-state">
        ${escapeHTML(error.message)}
      </main>
    `;

    return;
  }

  if (profile.role !== "teacher") {
    window.location.replace("aluno.html");
    return;
  }

  $("teacherLogout")?.addEventListener("click", logout);

  const calendarButton = $("connectGoogleCalendar");

  calendarButton?.addEventListener("click", () => {
    connectGoogleCalendar(calendarButton);
  });

  $("materialForm")?.addEventListener("submit", addMaterial);

  await Promise.all([
    loadTeacherData(),
    loadTeacherStudents(),
    loadGoogleCalendarEvents()
  ]);
}

async function loadGoogleCalendarEvents() {
  const button = $("connectGoogleCalendar");
  const feedback = $("calendarFeedback");
  const calendarCard = button?.closest(".calendar-connect-card");

  if (!calendarCard) return;

  let container = $("calendarEvents");

  if (!container) {
    container = document.createElement("div");
    container.id = "calendarEvents";
    container.className = "calendar-events";

    calendarCard.insertAdjacentElement("afterend", container);
  }

  container.innerHTML = `
    <div class="empty-state">Carregando sua agenda...</div>
  `;

  try {
    const { data, error } = await supabase.functions.invoke(
      "google-calendar-events",
      {
        method: "POST",
        body: {}
      }
    );

    if (error) {
      throw error;
    }

    const events = data?.events || [];

    if (!events.length) {
      container.innerHTML = `
        <div class="empty-state">
          Nenhum compromisso encontrado nos próximos dias.
        </div>
      `;

      return;
    }

    const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long"
    });

    const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    container.innerHTML = `
      <h3>Próximos compromissos</h3>

      <div class="calendar-event-list">
        ${events.map(event => {
          const startValue =
            event.start?.dateTime || event.start?.date;

          const endValue =
            event.end?.dateTime || event.end?.date;

          const startDate = startValue
            ? new Date(startValue)
            : null;

          const endDate = endValue
            ? new Date(endValue)
            : null;

          const allDay = Boolean(event.start?.date);

          const dateText = startDate &&
            !Number.isNaN(startDate.getTime())
              ? dateFormatter.format(startDate)
              : "Data não informada";

          const timeText = allDay
            ? "Dia inteiro"
            : startDate &&
              endDate &&
              !Number.isNaN(startDate.getTime()) &&
              !Number.isNaN(endDate.getTime())
                ? `${timeFormatter.format(startDate)} às ${timeFormatter.format(endDate)}`
                : "Horário não informado";

          return `
            <article class="calendar-event">
              <div class="calendar-event-date">
                ${escapeHTML(dateText)}
              </div>

              <div class="calendar-event-details">
                <h4>${escapeHTML(event.summary || "Aula ou compromisso")}</h4>
                <p>${escapeHTML(timeText)}</p>

                ${
                  event.location
                    ? `<p>${escapeHTML(event.location)}</p>`
                    : ""
                }
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;

  } catch (error) {
    console.error("Erro ao carregar eventos do Google Calendar:", error);

    container.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar sua agenda.
        ${escapeHTML(error.message || "Tente novamente mais tarde.")}
      </div>

      <button type="button" id="reloadCalendarEvents">
        Tentar novamente
      </button>
    `;

    $("reloadCalendarEvents")?.addEventListener(
      "click",
      loadGoogleCalendarEvents
    );

    showMessage(
      feedback,
      "Verifique a conexão com o Google Calendar."
    );
  }
}

async function loadTeacherData() {
  const targetSelect = $("materialTarget");
  const materialsContainer = $("teacherMaterials");

  if (!targetSelect || !materialsContainer) {
    return;
  }

  const [studentsResult, materialsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, plan, is_active")
      .eq("role", "student")
      .order("full_name", { ascending: true }),

    supabase
      .from("materials")
      .select(`
        id,
        title,
        subject,
        description,
        target_id,
        file_path,
        file_name,
        created_at
      `)
      .order("created_at", { ascending: false })
  ]);

  if (studentsResult.error) {
    console.error(studentsResult.error);

    targetSelect.innerHTML = `
      <option value="">Erro ao carregar estudantes</option>
    `;

    return;
  }

  if (materialsResult.error) {
    materialsContainer.innerHTML = `
      <div class="empty-state">
        ${escapeHTML(materialsResult.error.message)}
      </div>
    `;

    console.error(materialsResult.error);
    return;
  }

  const students = studentsResult.data || [];
  const materials = materialsResult.data || [];

  if ($("studentCount")) {
    $("studentCount").textContent = students.length;
  }

  if ($("materialCount")) {
    $("materialCount").textContent = materials.length;
  }

  targetSelect.innerHTML = `
    <option value="">Selecione o destino</option>

    <option value="all">
      Todos os estudantes
    </option>

    ${students.map(student => `
      <option value="${escapeHTML(student.id)}">
        ${escapeHTML(student.full_name || "Estudante")}
      </option>
    `).join("")}
  `;

  renderTeacherMaterials(materials, students);
}

function renderTeacherMaterials(materials, students) {
  const container = $("teacherMaterials");

  if (!container) return;

  if (!materials.length) {
    container.innerHTML = `
      <div class="empty-state">
        Você ainda não publicou nenhum material.
      </div>
    `;

    return;
  }

  const studentNames = new Map(
    students.map(student => [
      student.id,
      student.full_name || "Estudante"
    ])
  );

  container.innerHTML = materials.map(material => {
    const targetName = material.target_id
      ? studentNames.get(material.target_id) || "Estudante"
      : "Todos os estudantes";

    return `
      <article class="material-admin-card">

        <div class="material-admin-top">

          <div>
            <p class="material-meta">
              ${escapeHTML(material.subject || "Material de aula")}
              · ${formatDate(material.created_at)}
            </p>

            <h3>${escapeHTML(material.title)}</h3>

            <p>
              ${escapeHTML(material.description || "Sem descrição.")}
            </p>

            <p>
              <strong>Destino:</strong>
              ${escapeHTML(targetName)}
            </p>

            ${
              material.file_name
                ? `<p>Arquivo: ${escapeHTML(material.file_name)}</p>`
                : ""
            }
          </div>

          <div class="material-actions">
            <button
              type="button"
              class="small-action delete-action"
              data-delete="${escapeHTML(material.id)}"
            >
              Excluir
            </button>
          </div>

        </div>

        <details class="edit-material">

          <summary>Editar informações</summary>

          <form data-edit="${escapeHTML(material.id)}">

            <label>
              Título

              <input
                name="title"
                value="${escapeHTML(material.title)}"
                maxlength="120"
                required
              >
            </label>

            <label>
              Assunto

              <input
                name="subject"
                value="${escapeHTML(material.subject || "")}"
                maxlength="80"
              >
            </label>

            <label>
              Descrição

              <textarea
                name="description"
                rows="3"
                maxlength="1000"
              >${escapeHTML(material.description || "")}</textarea>
            </label>

            <button
              class="portal-button primary-button"
              type="submit"
            >
              Salvar alterações
            </button>

            <p class="form-feedback" role="status"></p>

          </form>

        </details>

      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteMaterial(button.dataset.delete);
    });
  });

  container.querySelectorAll("[data-edit]").forEach(form => {
    form.addEventListener("submit", saveMaterial);
  });
}

async function addMaterial(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = $("publishMaterial");
  const feedback = $("materialFeedback");

  setBusy(button, true, "Publicando...");
  showMessage(feedback, "Enviando material...");

  let uploadedPath = null;

  try {
    const title = $("materialTitle")?.value.trim();
    const subject = $("materialSubject")?.value.trim() || "";
    const description = $("materialDescription")?.value.trim() || "";
    const target = $("materialTarget")?.value;
    const file = $("materialFile")?.files[0];

    if (!title) {
      throw new Error("Informe o título do material.");
    }

    if (!target) {
      throw new Error(
        "Selecione um estudante ou todos os estudantes."
      );
    }

    if (file && file.size > 10 * 1024 * 1024) {
      throw new Error("O arquivo ultrapassa o limite de 10 MB.");
    }

    const user = await getCurrentUser();

    if (!user) return;

    if (file) {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const folder = target === "all"
        ? "all"
        : target;

      uploadedPath =
        `${folder}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    const { error: insertError } = await supabase
      .from("materials")
      .insert({
        title,
        subject,
        description,
        target_id: target === "all" ? null : target,
        file_path: uploadedPath,
        file_name: file?.name || null,
        created_by: user.id
      });

    if (insertError) {
      throw insertError;
    }

    form.reset();

    showMessage(
      feedback,
      "Material publicado com sucesso."
    );

    await loadTeacherData();

  } catch (error) {
    console.error("Erro ao publicar material:", error);

    if (uploadedPath) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([uploadedPath]);

      if (removeError) {
        console.error("Erro ao remover arquivo temporário:", removeError);
      }
    }

    showMessage(
      feedback,
      error.message || "Não foi possível publicar o material."
    );

  } finally {
    setBusy(button, false);
  }
}

async function saveMaterial(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const id = form.dataset.edit;
  const feedback = form.querySelector(".form-feedback");

  const button = form.querySelector(
    "button[type='submit']"
  );

  setBusy(button, true, "Salvando...");

  try {
    const formData = new FormData(form);

    const title = String(
      formData.get("title") || ""
    ).trim();

    const subject = String(
      formData.get("subject") || ""
    ).trim();

    const description = String(
      formData.get("description") || ""
    ).trim();

    if (!title) {
      throw new Error("O título não pode ficar vazio.");
    }

    const { error } = await supabase
      .from("materials")
      .update({
        title,
        subject,
        description
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    showMessage(feedback, "Alterações salvas.");

    await loadTeacherData();

  } catch (error) {
    console.error("Erro ao editar material:", error);

    showMessage(
      feedback,
      error.message || "Não foi possível salvar."
    );

  } finally {
    setBusy(button, false);
  }
}

async function deleteMaterial(id) {
  const confirmed = window.confirm(
    "Tem certeza de que deseja excluir este material?"
  );

  if (!confirmed) return;

  try {
    const { data: material, error: findError } = await supabase
      .from("materials")
      .select("id, file_path")
      .eq("id", id)
      .single();

    if (findError) {
      throw findError;
    }

    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    if (material.file_path) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([material.file_path]);

      if (storageError) {
        alert(
          "O material foi removido da lista, mas houve um erro ao excluir o arquivo: " +
          storageError.message
        );
      }
    }

    await loadTeacherData();

  } catch (error) {
    console.error("Erro ao excluir material:", error);

    alert(
      "Não foi possível excluir o material: " +
      error.message
    );
  }
}

async function loadTeacherStudents() {
  const studentsBody = $("studentsTable");

  if (!studentsBody) return;

  studentsBody.innerHTML = `
    <tr>
      <td colspan="5">Carregando estudantes...</td>
    </tr>
  `;

  const { data: students, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, plan, is_active")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  if (error) {
    studentsBody.innerHTML = `
      <tr>
        <td colspan="5">Erro ao carregar estudantes: ${escapeHTML(error.message)}</td>
      </tr>
    `;

    console.error(error);
    return;
  }

  if (!students || students.length === 0) {
    studentsBody.innerHTML = `
      <tr>
        <td colspan="5">Nenhum estudante cadastrado.</td>
      </tr>
    `;

    return;
  }

  studentsBody.innerHTML = students.map(student => {
    const active = student.is_active !== false;

    return `
      <tr>
        <td>${escapeHTML(student.full_name || "Nome não informado")}</td>

        <td>${escapeHTML(student.email || "Não informado")}</td>

        <td>
          ${escapeHTML(
            PLANS[String(student.plan)]?.title || "Não selecionado"
          )}
        </td>

        <td>
          <span class="student-status ${active ? "active" : "inactive"}">
            ${active ? "Ativo" : "Desativado"}
          </span>
        </td>

        <td>
          <div class="student-actions">
            ${
              active
                ? `
                  <button
                    type="button"
                    class="student-action-btn deactivate"
                    data-student-action="deactivate"
                    data-student-id="${escapeHTML(student.id)}"
                    data-student-name="${escapeHTML(student.full_name || "estudante")}"
                  >
                    Desativar
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="student-action-btn reactivate"
                    data-student-action="reactivate"
                    data-student-id="${escapeHTML(student.id)}"
                    data-student-name="${escapeHTML(student.full_name || "estudante")}"
                  >
                    Reativar
                  </button>
                `
            }

            <button
              type="button"
              class="student-action-btn delete"
              data-student-action="delete"
              data-student-id="${escapeHTML(student.id)}"
              data-student-name="${escapeHTML(student.full_name || "estudante")}"
            >
              Excluir
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  studentsBody.onclick = async event => {
    const button = event.target.closest("[data-student-action]");

    if (!button || button.disabled) return;

    const action = button.dataset.studentAction;
    const studentId = button.dataset.studentId;
    const studentName = button.dataset.studentName;

    const messages = {
      deactivate: `Deseja realmente desativar a conta de ${studentName}?`,

      reactivate: `Deseja reativar a conta de ${studentName}?`,

      delete: `ATENÇÃO: deseja excluir permanentemente a conta de ${studentName}?

Os dados pessoais e o acesso serão removidos. Os registros financeiros e os agendamentos serão preservados sem vínculo com a conta. Esta ação não poderá ser desfeita.`
    };

    if (!messages[action]) return;

    if (!window.confirm(messages[action])) return;

    button.disabled = true;

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const result = await fetch(
        `${SUPABASE_URL}/functions/v1/manage-student-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${sessionData.session.access_token}`
          },
          body: JSON.stringify({
            studentId,
            action
          })
        }
      );

      const data = await result.json().catch(() => ({}));

      if (!result.ok) {
        throw new Error(
          data.error || "Não foi possível executar a ação."
        );
      }

      window.alert(
        data.message || "Operação realizada com sucesso."
      );

      await loadTeacherStudents();

    } catch (error) {
      console.error("Erro ao gerenciar estudante:", error);

      window.alert(error.message || "Ocorreu um erro.");

      button.disabled = false;
    }
  };
}

initYear();

const page = document.body.dataset.page;

if (page === "login") {
  initLogin();
}

if (page === "student") {
  initStudentPage();
}

if (page === "teacher") {
  initTeacherPage();
}
