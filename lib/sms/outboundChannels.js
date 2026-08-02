/** Channels written by sendOutboundSms / gateway queue. */
export const SMS_OUTBOUND_CHANNELS = ['AFRICALA', 'CUSTOM_GATEWAY']

/** Prisma `where` fragment: all durable outbound SMS (AT + Android gateway). */
export function outboundSmsWhere(extra = {}) {
  return {
    channel: { in: SMS_OUTBOUND_CHANNELS },
    ...extra,
  }
}
