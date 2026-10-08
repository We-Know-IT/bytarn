// Server-only email module. Do not import from client components — it
// reads SMTP credentials with the Supabase service role.
export {
  getSmtpConfig,
  readSmtpSettingsRow,
  envSmtpPresent,
  smtpConfigFromEnv,
  smtpConfigFromRow,
  normalizePassword,
  isGmailHost,
  GMAIL_PRESET,
  DEFAULT_FROM_NAME,
  type SmtpConfig,
  type SmtpSource,
  type SmtpSettingsRow,
} from './config'
export { sendEmail, explainSmtpError, type SendEmailInput, type SendEmailResult } from './send'
export {
  escapeHtml,
  snippet,
  householdInviteEmail,
  newMessageEmail,
  newMatchingListingEmail,
  interestEmail,
  settingsUrl,
  NOTIFICATION_SETTINGS_PATH,
  testEmail,
  type EmailContent,
} from './templates'
export { isValidEmail, validateSmtpInput, type SmtpSettingsInput } from './validate'
export { appBaseUrl } from './url'
export {
  isDeliverableEmail,
  savedSearchMatches,
  selectListingRecipients,
  MAX_LISTING_RECIPIENTS,
  type AlertListing,
  type AlertSavedSearch,
  type AlertPreferences,
  type ListingRecipient,
} from './alerts'
