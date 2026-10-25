import {
  createStationFaq,
  deleteStationFaq,
  getStationFaqs,
  updateStationFaq,
  type StationFaq,
} from "../db/station-faqs";
import { readText } from "./common";

export interface StationFaqsResult {
  redirectTo: string | null;
  faqs: StationFaq[];
  formError: string;
  /** "faq-<id>" or "faq-new" */
  errorFor: string;
  /** Submitted values, so the popup can reopen filled after an error. */
  posted: Record<string, string> | null;
}

export async function handleStationFaqs(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationFaqsResult> {
  const result: StationFaqsResult = {
    redirectTo: null,
    faqs: await getStationFaqs(db, stationId),
    formError: "",
    errorFor: "",
    posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "faq_action");
  const id = Number(readText(fd, "item_id"));
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "faq_action") posted[k] = v;
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.posted = posted;
    result.formError = message;
    return result;
  };

  try {
    if (action === "faq_create" || action === "faq_update") {
      const question = readText(fd, "question");
      const questionJa = readText(fd, "question_japanese") || null;
      const answer = readText(fd, "answer");
      const answerJa = readText(fd, "answer_japanese") || null;
      const order = Number(readText(fd, "sort_order") || "0");
      const scope = action === "faq_create" ? "faq-new" : `faq-${id}`;
      if (!question || !answer) return fail(scope, "The question and the answer are required.");
      if (question.length > 300 || (questionJa ?? "").length > 300) return fail(scope, "A question must be 300 characters or less.");
      if (answer.length > 1500 || (answerJa ?? "").length > 1500) return fail(scope, "An answer must be 1500 characters or less.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      const input = { question, questionJapanese: questionJa, answer, answerJapanese: answerJa, sortOrder: order };
      if (action === "faq_create") await createStationFaq(db, stationId, input);
      else if (result.faqs.some((f) => f.id === id)) await updateStationFaq(db, stationId, id, input);
    } else if (action === "faq_delete") {
      if (result.faqs.some((f) => f.id === id)) await deleteStationFaq(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/faqs#saved`;
  } catch (err) {
    console.error("Failed to save station FAQs:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
