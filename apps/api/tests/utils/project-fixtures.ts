import transporter from "../../src/config/mail.config";

/** Base URL path for `/api/v1/projects` integration tests */
export const projectsRoot = "/api/v1/projects";

export const extractInviteTokenFromLastEmail = (): string => {
  const sendMail = vi.mocked(transporter.sendMail);
  const calls = sendMail.mock.calls;
  const last = calls.length > 0 ? (calls[calls.length - 1][0] as { html?: string }) : undefined;
  const html = last?.html;
  if (typeof html !== "string") {
    throw new Error("Expected sendMail to be called with html content");
  }
  const match = html.match(/token=([a-f0-9]+)/);
  if (!match) {
    throw new Error("Could not parse invite token from email html");
  }
  return match[1];
};
