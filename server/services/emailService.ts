import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
    email: string,
    fullName: string,
    token: string
): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
        from: `"Clovet" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Clovet Account',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Clovet!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${fullName},</h2>
                        <p>Thank you for signing up! Please verify your email address to get started with Clovet.</p>
                        <p>Click the button below to verify your account:</p>
                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 Clovet. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent to:', email);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const mailOptions = {
        from: `"Clovet" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Clovet!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 You're All Set!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${fullName},</h2>
                        <p>Your email has been verified successfully! Welcome to Clovet.</p>
                        <p>You can now:</p>
                        <ul>
                            <li>Build your digital wardrobe</li>
                            <li>Get AI-powered outfit recommendations</li>
                            <li>Try on clothes virtually</li>
                            <li>Discover sustainable fashion</li>
                        </ul>
                        <p>Happy styling!</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', email);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Don't throw error for welcome email, it's not critical
    }
}
