import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { auth, AuthRequest } from '../middleware/auth';
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail } from '../services/emailService';

const router = express.Router();

// Signup
// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare user data
        const userData: any = {
            email,
            password: hashedPassword,
            full_name: fullName,
            email_verified: false
        };

        // Try/catch block for the whole verification setup
        try {
            const verificationToken = generateVerificationToken();
            const tokenExpires = new Date();
            tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 hours

            userData.verification_token = verificationToken;
            userData.verification_token_expires = tokenExpires;

            const user = new User(userData);
            await user.save();

            // Send verification email - fail silently if config missing
            try {
                await sendVerificationEmail(email, fullName, verificationToken);
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                // Continue with signup even if email fails
            }

            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    full_name: user.full_name,
                    email_verified: false
                },
                message: 'Account created successfully'
            });

        } catch (saveError) {
            // If saving with verification token fails (e.g. validation), try without
            console.log('Error saving user with verification, trying without:', saveError);

            // Reset relevant fields
            delete userData.verification_token;
            delete userData.verification_token_expires;
            userData.email_verified = true; // Auto-verify as fallback

            const user = new User(userData);
            await user.save();

            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    full_name: user.full_name,
                    email_verified: true
                },
                message: 'Account created successfully (verification bypassed)'
            });
        }
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Signin
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check if email is verified
        // if (!user.email_verified) {
        //     return res.status(403).json({
        //         error: 'Email not verified',
        //         message: 'Please verify your email before signing in. Check your inbox for the verification link.'
        //     });
        // }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                email_verified: user.email_verified
            }
        });
    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ error: 'Error signing in' });
    }
});

// Me
router.get('/me', auth, async (req: AuthRequest, res) => {
    try {
        const user = await User.findById(req.user?.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: { id: user._id, email: user.email, full_name: user.full_name } });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Update user profile
router.put('/profile', auth, async (req: AuthRequest, res) => {
    try {
        const { full_name, avatar_url, default_tryon_image, style_preferences, onboarding_completed } = req.body;

        // Build update object
        const updateData: any = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (default_tryon_image !== undefined) updateData.default_tryon_image = default_tryon_image;
        // Add other fields if needed

        const user = await User.findByIdAndUpdate(
            req.user?.userId,
            { $set: updateData },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            verification_token: token,
            verification_token_expires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Update user
        user.email_verified = true;
        user.verification_token = undefined;
        user.verification_token_expires = undefined;
        await user.save();

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.json({ message: 'Email verified successfully! You can now sign in.' });
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Error verifying email' });
    }
});

export default router;
