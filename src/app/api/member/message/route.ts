import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HAKAN_EMAIL = 'hhisim@hotmail.com';

export async function POST(request: Request) {
  try {
    const { email, subject, content, plan } = await request.json();

    if (!email || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const planLabel = plan === 'master' ? 'Master' : plan === 'initiate' ? 'Initiate' : 'Free';
    const priority = plan === 'master' || plan === 'initiate' ? '★' : '';
    
    const htmlContent = `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #e5e5e5; min-height: 100vh;">
        <div style="border: 1px solid rgba(217,70,239,0.3); padding: 24px; background: rgba(217,70,239,0.04);">
          <div style="font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(212,168,71,0.6); margin-bottom: 12px;">
            [MEMBER — PRIORITY] ${priority}
          </div>
          <div style="font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 20px;">
            ${planLabel} Member
          </div>
          
          <h2 style="font-size: 18px; margin: 0 0 16px; color: #fff;">${subject}</h2>
          
          <div style="font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.7); white-space: pre-wrap;">${content}</div>
          
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin: 0;">
              From: ${email}<br/>
              Plan: ${planLabel}<br/>
              Priority Channel: ${plan === 'master' || plan === 'initiate' ? 'Yes ★' : 'No'}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 24px; font-size: 10px; letter-spacing: 0.3em; color: rgba(255,255,255,0.2);">
          UNIVERSAL TRANSMISSIONS — MEMBER SANCTUM
        </div>
      </div>
    `;

    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'UT Member Portal <noreply@universal-transmissions.com>',
      to: HAKAN_EMAIL,
      replyTo: email,
      subject: `[MEMBER — PRIORITY] ${priority} ${subject}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Message route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
