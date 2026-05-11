import transporter from "../../src/config/mail.config";
import type { SentMessageInfo } from "nodemailer";

const mockSentMessageInfo: SentMessageInfo = {
  envelope: { from: "no-reply@test.local", to: [] },
  messageId: "mock-message-id",
  accepted: [],
  rejected: [],
  pending: [],
  response: "250 Mock OK",
};

transporter.sendMail = vi
  .fn()
  .mockResolvedValue(
    mockSentMessageInfo,
  ) as unknown as typeof transporter.sendMail;
