
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================================
   CONFIGURAÇÕES
========================================= */

const SUPABASE_URL = "https://eddveobyuaqkkldgekud.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_4HH5hhK270UYXFc9lMR8Dg_9LVFrEyv";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const BUCKET = "payment-proofs";
const PIX_KEY = "11992605395";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const PLANS = {
  "1": {
    title: "1 aula por semana",
    amount: 8000,
    formatted: "R$ 80,00"
  },
  "2": {
    title: "2 aulas por semana",
    amount: 15000,
    formatted: "R$ 150,00"
  },
  "3": {
    title: "3 aulas por semana",
    amount: 22500,
    formatted: "R$ 225,00"
  },
  "4": {
    title: "4 aulas por semana",
    amount: 30000,
    formatted: "R$ 300,00"
  }
};

/* =========================================
   ELEMENTOS E UTILITÁRIOS
========================================= */

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showFeedback(element, message, success = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = success ? "#17643a" : "#a21b45";
}

function formatDate(value) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function getStatusLabel(status) {
  const labels = {
    pending: "Em análise",
    approved: "Aprovado",
    rejected: "Rejeitado"
  };

  return labels[status] || "Desconhecido";
}

function getStatusClass(status) {
  return {
    pending: "status-pending",
    approved: "status-approved",
    rejected: "status-rejected"
  }[status] || "";
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "login.html";
    return null;
  }

  return data.user;
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, plan")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================
   ÁREA DO ALUNO
========================================= */

let studentUser = null;
let studentProfile = null;

function updateStudentPlanDisplay() {
  const planSelect = $("#studentPlanSelect");
  const selectedPlan = planSelect?.value || studentProfile?.plan;

  const plan = PLANS[selectedPlan];

  $("#paymentPlanName").textContent = plan
    ? plan.title
    : "Nenhum plano selecionado";

  $("#paymentPlanAmount").textContent = plan
    ? plan.formatted
    : "Selecione seu plano acima";

  return selectedPlan;
}

async function refreshStudentProfile() {
  studentProfile = await getProfile(studentUser.id);
  updateStudentPlanDisplay();
}

async function copyPixKey() {
  const feedback = $("#pixFeedback");

  try {
    await navigator.clipboard.writeText(PIX_KEY);
    showFeedback(feedback, "Chave PIX copiada!", true);
  } catch {
    showFeedback(
      feedback,
      "Não foi possível copiar automaticamente. Selecione a chave acima."
    );
  }
}

function validateProof(file) {
  if (!file) {
    throw new Error("Selecione o comprovante.");
  }

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Envie um arquivo PDF, PNG ou JPG.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O comprovante deve ter no máximo 5 MB.");
  }
}

async function submitStudentPayment(event) {
  event.preventDefault();

  const feedback = $("#paymentFeedback");
  const button = $("#submitPayment");
  const fileInput = $("#paymentProof");

  try {
    button.disabled = true;
    button.textContent = "Enviando comprovante...";

    await refreshStudentProfile();

    const planCode = studentProfile.plan;
    const plan = PLANS[planCode];

    if (!plan) {
      throw new Error(
        "Você precisa selecionar e salvar seu plano antes de enviar o pagamento."
      );
    }

    const planSelect = $("#studentPlanSelect");

    if (planSelect?.value && planSelect.value !== planCode) {
      throw new Error(
        "Salve seu novo plano antes de enviar o comprovante."
      );
    }

    const file = fileInput.files[0];

    validateProof(file);

    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-100);

    const filePath =
      `${studentUser.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        student_id: studentUser.id,
        plan: planCode,
        amount_cents: plan.amount,
        proof_path: filePath
      });

    if (insertError) {
      await supabase.storage
        .from(BUCKET)
        .remove([filePath]);

      throw insertError;
    }

    fileInput.value = "";

    showFeedback(
      feedback,
      "Comprovante enviado! Aguarde a análise da professora.",
      true
    );

    await loadStudentPayments();

  } catch (error) {
    console.error("Erro ao enviar pagamento:", error);

    showFeedback(
      feedback,
      error.message || "Não foi possível enviar o comprovante."
    );

  } finally {
    button.disabled = false;
    button.textContent = "Enviar comprovante";
  }
}

async function loadStudentPayments() {
  const container = $("#studentPayments");

  container.innerHTML =
    '<div class="loading-state">Carregando pagamentos...</div>';

  const { data, error } = await supabase
    .from("payments")
    .select("id, plan, amount_cents, status, submitted_at, reviewed_at")
    .eq("student_id", studentUser.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);

    container.innerHTML =
      '<div class="payment-empty">Não foi possível consultar seus pagamentos.</div>';

    return;
  }

  if (!data.length) {
    container.innerHTML =
      '<div class="payment-empty">Você ainda não enviou nenhum comprovante.</div>';

    return;
  }

  container.innerHTML = data.map((payment) => {
    const plan = PLANS[payment.plan];

    const amount = plan
      ? plan.formatted
      : `R$ ${(payment.amount_cents / 100).toFixed(2).replace(".", ",")}`;

    return `
      <article class="payment-history-item">
        <strong>${escapeHTML(plan?.title || "Plano")}</strong>

        <span>${amount}</span>

        <span class="payment-status ${getStatusClass(payment.status)}">
          ${getStatusLabel(payment.status)}
        </span>

        <small>Enviado em: ${formatDate(payment.submitted_at)}</small>

        ${
          payment.reviewed_at
            ? `<small>Revisado em: ${formatDate(payment.reviewed_at)}</small>`
            : ""
        }
      </article>
    `;
  }).join("");
}

async function initStudentPayments() {
  studentUser = await getAuthenticatedUser();

  if (!studentUser) return;

  studentProfile = await getProfile(studentUser.id);

  if (studentProfile.role !== "student") {
    window.location.href = "login.html";
    return;
  }

  $("#pixKey").textContent = PIX_KEY;

  $("#copyPixKey").addEventListener("click", copyPixKey);

  $("#paymentForm").addEventListener(
    "submit",
    submitStudentPayment
  );

  $("#studentPlanSelect")?.addEventListener(
    "change",
    updateStudentPlanDisplay
  );

  updateStudentPlanDisplay();

  await loadStudentPayments();
}

/* =========================================
   ÁREA DA PROFESSORA
========================================= */

let teacherUser = null;

async function loadTeacherPayments() {
  const container = $("#teacherPayments");

  container.innerHTML =
    '<div class="loading-state">Atualizando pagamentos...</div>';

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error(error);

    container.innerHTML =
      '<div class="payment-empty">Erro ao consultar pagamentos. Verifique as permissões da tabela.</div>';

    return;
  }

  if (!payments.length) {
    container.innerHTML =
      '<div class="payment-empty">Nenhum pagamento enviado até o momento.</div>';

    return;
  }

  const studentIds = [
    ...new Set(payments.map((payment) => payment.student_id))
  ];

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", studentIds);

  if (studentsError) {
    console.error(studentsError);
  }

  const studentMap = new Map(
    (students || []).map((student) => [student.id, student])
  );

  const renderedPayments = await Promise.all(
    payments.map(async (payment) => {
      const student = studentMap.get(payment.student_id);
      const plan = PLANS[payment.plan];

      const { data: signedData, error: signedError } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(payment.proof_path, 300);

      const proofLink = !signedError && signedData?.signedUrl
        ? `<a class="proof-link" href="${escapeHTML(signedData.signedUrl)}" target="_blank" rel="noopener">Visualizar comprovante ↗</a>`
        : `<p>Não foi possível gerar o link do comprovante.</p>`;

      const amount = plan
        ? plan.formatted
        : `R$ ${(payment.amount_cents / 100).toFixed(2).replace(".", ",")}`;

      const isPending = payment.status === "pending";

      return `
        <article class="payment-admin-card">
          <div class="payment-admin-top">
            <div>
              <h3>${escapeHTML(student?.full_name || "Estudante")}</h3>
              <p>${escapeHTML(student?.email || "E-mail indisponível")}</p>
            </div>

            <span class="payment-status ${getStatusClass(payment.status)}">
              ${getStatusLabel(payment.status)}
            </span>
          </div>

          <p><strong>Plano:</strong> ${escapeHTML(plan?.title || payment.plan)}</p>
          <p><strong>Valor:</strong> ${amount}</p>
          <p><strong>Enviado:</strong> ${formatDate(payment.submitted_at)}</p>

          ${proofLink}

          ${
            isPending
              ? `
                <div class="payment-admin-actions">
                  <button
                    type="button"
                    class="small-action approve-action"
                    data-payment-action="approved"
                    data-payment-id="${payment.id}"
                  >
                    Aprovar pagamento
                  </button>

                  <button
                    type="button"
                    class="small-action reject-action"
                    data-payment-action="rejected"
                    data-payment-id="${payment.id}"
                  >
                    Rejeitar pagamento
                  </button>
                </div>
              `
              : ""
          }
        </article>
      `;
    })
  );

  container.innerHTML = renderedPayments.join("");
}

async function reviewPayment(paymentId, status, button) {
  const action = status === "approved" ? "aprovar" : "rejeitar";

  if (!window.confirm(`Tem certeza de que deseja ${action} este pagamento?`)) {
    return;
  }

  button.disabled = true;

  try {
    const { data, error } = await supabase
      .from("payments")
      .update({ status })
      .eq("id", paymentId)
      .eq("status", "pending")
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      throw new Error(
        "O pagamento não foi atualizado. Talvez já tenha sido revisado."
      );
    }

    await loadTeacherPayments();

  } catch (error) {
    console.error("Erro ao revisar pagamento:", error);

    alert(error.message || "Não foi possível atualizar o pagamento.");

    button.disabled = false;
  }
}

async function initTeacherPayments() {
  teacherUser = await getAuthenticatedUser();

  if (!teacherUser) return;

  const profile = await getProfile(teacherUser.id);

  if (profile.role !== "teacher") {
    window.location.href = "login.html";
    return;
  }

  $("#refreshPayments").addEventListener(
    "click",
    loadTeacherPayments
  );

  $("#teacherPayments").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-payment-action]");

    if (!button) return;

    await reviewPayment(
      button.dataset.paymentId,
      button.dataset.paymentAction,
      button
    );
  });

  await loadTeacherPayments();
}

/* =========================================
   INICIALIZAÇÃO
========================================= */

async function initPayments() {
  try {
    const page = document.body.dataset.page;

    if (page === "student") {
      await initStudentPayments();
    }

    if (page === "teacher") {
      await initTeacherPayments();
    }

  } catch (error) {
    console.error("Erro ao inicializar pagamentos:", error);

    const studentFeedback = $("#paymentFeedback");

    if (studentFeedback) {
      showFeedback(
        studentFeedback,
        "Não foi possível carregar o sistema de pagamentos."
      );
    }

    const teacherContainer = $("#teacherPayments");

    if (teacherContainer) {
      teacherContainer.innerHTML =
        '<div class="payment-empty">Erro ao carregar o painel de pagamentos. Verifique sua conexão e permissões.</div>';
    }
  }
}

initPayments();
