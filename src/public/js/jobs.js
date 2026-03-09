/**
 * Gestion du chargement dynamique des détails d'offres d'emploi
 * Compatible Helmet/CSP - script externe
 */

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('learn-more-content');
  const learnMoreButtons = document.querySelectorAll('.js-learn-more');

  /**
   * Formate le salaire pour l'affichage
   */
  function salaryLabel(job) {
    if (job.salary_min && job.salary_max) return `${job.salary_min} - ${job.salary_max} €`;
    if (job.salary_min) return `À partir de ${job.salary_min} €`;
    if (job.salary_max) return `Jusqu'à ${job.salary_max} €`;
    return 'Salaire non communiqué';
  }

  /**
   * Échappe les caractères HTML pour éviter les injections XSS
   */
  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Met à jour l'état actif du bouton sélectionné
   */
  function setActiveButton(jobId) {
    learnMoreButtons.forEach((button) => {
      if (button.dataset.jobId === String(jobId)) {
        button.classList.add('is-active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('is-active');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Charge et affiche les détails d'une offre via l'API
   */
  async function loadJobDetails(jobId) {
    panel.innerHTML = "<p class='muted'>Chargement...</p>";
    try {
      const response = await fetch(`/api/public/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const job = payload.data;

      if (!job) {
        throw new Error('Données invalides');
      }

      setActiveButton(jobId);

      const remoteTag = job.remote
        ? '<span class="tag is-info is-light">Télétravail</span>'
        : '<span class="tag is-light">Sur site</span>';

      panel.innerHTML = `
        <h3 class="title is-5">${escapeHtml(job.title)}</h3>
        <p class="muted"><strong>${escapeHtml(job.company_name)}</strong> · ${escapeHtml(job.location)}</p>
        <div class="tags mt-3">
          <span class="tag is-light">${escapeHtml(job.contract_type)}</span>
          ${remoteTag}
          <span class="tag is-light">${escapeHtml(salaryLabel(job))}</span>
        </div>
        <div class="content mt-4"><p style="white-space:pre-line;">${escapeHtml(job.description)}</p></div>
        <div class="buttons mt-4">
          <a class="button is-primary is-small" href="/jobs/${job.id}">Postuler</a>
          <a class="button is-light is-small" href="/jobs/${job.id}">Voir l'offre</a>
        </div>
      `;
    } catch (error) {
      console.error('Erreur chargement offre:', error);
      panel.innerHTML = "<div class='empty-state'>Erreur lors du chargement des détails.</div>";
    }
  }

  // Attacher les écouteurs de clic sur les boutons
  learnMoreButtons.forEach((button) => {
    button.addEventListener('click', () => {
      loadJobDetails(button.dataset.jobId);
    });
  });

  // Charger automatiquement la première offre si disponible
  if (learnMoreButtons.length > 0) {
    loadJobDetails(learnMoreButtons[0].dataset.jobId);
  }
});
