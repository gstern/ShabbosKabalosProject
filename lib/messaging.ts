import { prisma } from "@/lib/db";

export type OutboundMessage = {
  subject: string; // email subject; ignored for SMS/WhatsApp
  text: string; // plain text body (works for all channels)
};

type Channel = "whatsapp" | "sms" | "email" | "console";

function twilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

async function sendTwilio(to: string, body: string, whatsapp: boolean): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = whatsapp
    ? process.env.TWILIO_WHATSAPP_FROM!
    : process.env.TWILIO_FROM_NUMBER!;
  const dest = whatsapp ? `whatsapp:${to}` : to;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: dest, From: from, Body: body }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${detail.slice(0, 300)}`);
  }
}

async function sendResend(to: string[], subject: string, text: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Elul Shabbos Project <onboarding@resend.dev>",
      to,
      subject,
      text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Send a message to a household over the best available channel:
 * WhatsApp (if configured) → SMS → email → console log (dev fallback).
 * Logs the send to MessageLog. Returns the channel used, or null on failure.
 */
export async function sendToHousehold(
  household: {
    id: string;
    phone: string | null;
    email: string | null;
    email2?: string | null;
    email3?: string | null;
    smsOptIn: boolean;
    emailOptIn: boolean;
  },
  message: OutboundMessage,
  kind: string,
  week: number
): Promise<Channel | null> {
  const attempts: { channel: Channel; run: () => Promise<void> }[] = [];

  if (household.phone && household.smsOptIn && twilioConfigured()) {
    if (process.env.TWILIO_WHATSAPP_FROM) {
      attempts.push({
        channel: "whatsapp",
        run: () => sendTwilio(household.phone!, message.text, true),
      });
    }
    attempts.push({
      channel: "sms",
      run: () => sendTwilio(household.phone!, message.text, false),
    });
  }
  const emails = [household.email, household.email2, household.email3].filter(
    (e): e is string => !!e
  );
  if (emails.length && household.emailOptIn && process.env.RESEND_API_KEY) {
    attempts.push({
      channel: "email",
      run: () => sendResend(emails, message.subject, message.text),
    });
  }
  if (attempts.length === 0) {
    attempts.push({
      channel: "console",
      run: async () => {
        console.log(
          `[message:${kind}] household=${household.id} (no provider configured)\n${message.text}`
        );
      },
    });
  }

  for (const attempt of attempts) {
    try {
      await attempt.run();
      await prisma.messageLog.create({
        data: { householdId: household.id, kind, channel: attempt.channel, week },
      });
      return attempt.channel;
    } catch (e) {
      console.error(
        `[message:${kind}] ${attempt.channel} failed for household ${household.id}:`,
        e
      );
    }
  }
  return null;
}
