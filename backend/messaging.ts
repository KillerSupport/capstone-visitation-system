import nodemailer from 'nodemailer';
import { normalizePhilippineMobileNumber } from './identity.js';

export type ContactChannel = 'email' | 'sms';
export interface Contact { channel: ContactChannel; destination: string; }
export interface DeliveryResult { status: 'ACCEPTED' | 'MOCK'; providerId?: string; }
export class DeliveryUnavailable extends Error {}

export function pendingContact(user: any): Contact | null {
  if(user.contactAccessPolicy==='LEGACY_VERIFIED' && ((user.email && user.emailVerified)||(user.mobileNumber && user.phoneVerified)))return null;
  if (user.mobileNumber && !user.phoneVerified) return {channel:'sms',destination:user.mobileNumber};
  if (user.email && !user.emailVerified) return {channel:'email',destination:user.email};
  return null;
}
export function loginContact(user: any): Contact | null {
  if (user.mobileNumber) return {channel:'sms',destination:user.mobileNumber};
  return user.email ? {channel:'email',destination:user.email} : null;
}
export function maskContact(contact: Contact) {
  if (contact.channel === 'sms') return `••••••${contact.destination.slice(-4)}`;
  const [local,domain] = contact.destination.split('@');
  return `${local.slice(0,2)}•••@${domain}`;
}
export async function deliverMessage(contact: Contact, subject: string, text: string): Promise<DeliveryResult> {
  if (contact.channel === 'email') {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const missing = ['SMTP_HOST','SMTP_USER','SMTP_PASS'].filter(key => !process.env[key]);
      throw new DeliveryUnavailable(`Email delivery is not configured. Add ${missing.join(', ')} to the project .env file.`);
    }
    const transport = nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000});
    const result = await transport.sendMail({from:process.env.SMTP_FROM || process.env.SMTP_USER,to:contact.destination,subject,text});
    if (!result.accepted?.length) throw new Error('Email was not accepted by the delivery service.');
    return {status:'ACCEPTED',providerId:result.messageId};
  }
  const phone = normalizePhilippineMobileNumber(contact.destination);
  if (!phone) throw new Error('A valid Philippine mobile number is required.');
  if (process.env.SMS_PROVIDER === 'mock' && process.env.NODE_ENV !== 'production') return {status:'MOCK'};
  if (process.env.SMS_PROVIDER === 'textbee') {
    const apiKey = process.env.TEXTBEE_API_KEY?.trim();
    const deviceId = process.env.TEXTBEE_DEVICE_ID?.trim();
    if (!apiKey || !deviceId) throw new DeliveryUnavailable('SMS delivery is not configured.');

    const response = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, recipients: [phone], message: text }),
    });
    const result = await response.json().catch(() => null);
    const data = result?.data;
    if (response.ok && data?.success === true && typeof data.smsBatchId === 'string' && data.smsBatchId) {
      return { status: 'ACCEPTED', providerId: data.smsBatchId };
    }
    if (response.ok && data?.successCount === 1 && data.failureCount === 0) {
      return { status: 'ACCEPTED' };
    }
    throw new Error('SMS was not accepted by the delivery service.');
  }
  const {SMS_ACCOUNT_ID:accountId,SMS_AUTH_TOKEN:authToken,SMS_FROM:from} = process.env;
  if (process.env.SMS_PROVIDER !== 'twilio' || !accountId || !authToken || !from) throw new DeliveryUnavailable('SMS delivery is not configured.');
  const endpoint = new URL((process.env.SMS_API_URL || 'https://api.twilio.com/2010-04-01/Accounts/{accountId}/Messages.json').replace('{accountId}',encodeURIComponent(accountId)));
  if (endpoint.protocol !== 'https:') throw new DeliveryUnavailable('The SMS service requires an HTTPS endpoint.');
  const response = await fetch(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Basic ${Buffer.from(`${accountId}:${authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:phone,From:from,Body:text})});
  const result = await response.json().catch(()=>null) as any;
  if (!response.ok || !result?.sid || ['failed','undelivered','canceled'].includes(result.status)) throw new Error('SMS was not accepted by the delivery service.');
  return {status:'ACCEPTED',providerId:result.sid};
}
export function appointmentConfirmation(appointment: any, changed = false) {
  return `BJMP Imus City Jail: ${appointment.visitorName?`Visitor: ${appointment.visitorName}. `:''}${changed ? 'Your visitation date was changed and the new date is confirmed.' : 'Your visitation appointment is confirmed.'} ${appointment.jailFacilityName ? 'Facility: ' + appointment.jailFacilityName + '. ' : ''}Date: ${appointment.visitDate}. Time: ${appointment.timeSlot}. Reference: ${appointment.appointmentReference}. Bring your original government ID and follow facility dress rules. Complete fingerprint verification FIRST, then present your appointment QR code. Companions require separate identity and entry authorization. PDL details are available in your protected website account.`;
}
