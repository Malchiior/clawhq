import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 Email would be sent (no RESEND_API_KEY configured):')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Body: ${html}`)
      return { success: true, messageId: 'dev-mode' }
    }

    const { data } = await resend.emails.send({
      from: 'ClawHQ <noreply@clawhq.dev>',
      to,
      subject,
      html,
    })

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

export function generatePasswordResetEmailHtml(resetUrl: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset your ClawHQ password</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 14px; }
        .link { word-break: break-all; color: #3b82f6; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🤖 ClawHQ</div>
    </div>
    <div class="content">
        <h2>Reset your password</h2>
        <p>Hi${name ? ` ${name}` : ''},</p>
        <p>We received a request to reset the password for your ClawHQ account. Click the button below to choose a new password.</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}" class="link">${resetUrl}</a></p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class="footer">
        <p>Best regards,<br>The ClawHQ Team</p>
        <p><a href="https://clawhq.dev">clawhq.dev</a></p>
    </div>
</body>
</html>
  `
}

export function generateVerificationEmailHtml(verificationUrl: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify your ClawHQ account</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #3b82f6; 
        }
        .content { 
            background: #f9fafb; 
            padding: 30px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
        }
        .btn { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            font-weight: 500; 
            margin: 20px 0; 
        }
        .footer { 
            text-align: center; 
            color: #666; 
            font-size: 14px; 
        }
        .link { 
            word-break: break-all; 
            color: #3b82f6; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🤖 ClawHQ</div>
    </div>
    
    <div class="content">
        <h2>Verify your email address</h2>
        <p>Hi${name ? ` ${name}` : ''},</p>
        <p>Thank you for signing up for ClawHQ! Please verify your email address to complete your account setup.</p>
        
        <p style="text-align: center;">
            <a href="${verificationUrl}" class="btn">Verify Email Address</a>
        </p>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}" class="link">${verificationUrl}</a></p>
        
        <p><strong>This link will expire in 24 hours.</strong></p>
        
        <p>If you didn't create an account with ClawHQ, you can safely ignore this email.</p>
    </div>
    
    <div class="footer">
        <p>Best regards,<br>The ClawHQ Team</p>
        <p><a href="https://clawhq.dev">clawhq.dev</a></p>
    </div>
</body>
</html>
  `
}