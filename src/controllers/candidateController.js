import { getCandidateApplicationById, getCandidateApplications, countCandidateApplications } from "../models/applicationModel.js";
import { buildPagination, toPositiveInt } from "../middleware/pagination.js";

export async function candidateDashboardPage(req, res) {
  const userId = req.session.user.id;
  const page = toPositiveInt(req.query.page, 1);
  const pageSize = 8;

  const total = await countCandidateApplications({ userId });
  const pagination = buildPagination({ total, page, pageSize });

  const applications = await getCandidateApplications({
    userId,
    page: pagination.page,
    pageSize
  });

  return res.render("candidate/dashboard", {
    applications,
    pagination
  });
}

export async function candidateApplicationDetailPage(req, res) {
  const applicationId = Number(req.params.id);
  const userId = req.session.user.id;

  const application = await getCandidateApplicationById({
    applicationId,
    userId
  });

  if (!application) {
    return res.status(404).send("Candidature introuvable");
  }

  return res.render("candidate/application_detail", {
    application
  });
}
