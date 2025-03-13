import { client } from "@repo/db/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/index.js";

const userRouter = Router();

// Register a new user
userRouter.post("/register", async (req, res) => {
    try {
        const { username, password, email, displayName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Check if username or email already exists
        const existingUser = await client.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: email || undefined },
                ],
            },
        });

        if (existingUser) {
            return res.status(400).json({ error: "Username or email already in use" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await client.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                displayName: displayName || username,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        // Generate token
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully",
            user: newUser,
            token,
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Login user
userRouter.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Find user
        const user = await client.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username },
                ],
            },
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ error: "Account is deactivated" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid username or password" });
        }

        // Update lastOnline
        await client.user.update({
            where: { id: user.id },
            data: { lastOnline: new Date() },
        });

        // Generate token
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get current user profile
userRouter.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await client.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                bio: true,
                role: true,
                createdAt: true,
                lastOnline: true,
                currentAvatar: true,
                _count: {
                    select: {
                        friends: true,
                        ownedSpaces: true,
                        inventory: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update lastOnline
        await client.user.update({
            where: { id: req.user.id },
            data: { lastOnline: new Date() },
        });

        res.json({ user });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get user by id or username
userRouter.get("/:identifier", async (req, res) => {
    try {
        const { identifier } = req.params;

        const user = await client.user.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { username: identifier },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                role: true,
                createdAt: true,
                lastOnline: true,
                currentAvatar: true,
                _count: {
                    select: {
                        friends: true,
                        ownedSpaces: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Update user profile
userRouter.put("/", authMiddleware, async (req, res) => {
    try {
        const { displayName, bio, email, currentAvatarId } = req.body;

        const updates: any = {};

        if (displayName !== undefined) updates.displayName = displayName;
        if (bio !== undefined) updates.bio = bio;
        if (email !== undefined) {
            // Check if email is already in use by another user
            if (email) {
                const existingUser = await client.user.findFirst({
                    where: {
                        email,
                        id: { not: req.user.id },
                    },
                });

                if (existingUser) {
                    return res.status(400).json({ error: "Email already in use" });
                }
            }
            updates.email = email;
        }

        if (currentAvatarId !== undefined) {
            // Check if avatar exists and belongs to user
            if (currentAvatarId) {
                const avatar = await client.avatar.findFirst({
                    where: {
                        id: currentAvatarId,
                        userId: req.user.id,
                    },
                });

                if (!avatar) {
                    return res.status(400).json({ error: "Avatar not found or doesn't belong to you" });
                }
            }
            updates.currentAvatarId = currentAvatarId;
        }

        // Update user
        const updatedUser = await client.user.update({
            where: { id: req.user.id },
            data: updates,
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                bio: true,
                createdAt: true,
                currentAvatar: true,
            },
        });

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Change password
userRouter.put("/change-password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        // Get user with password
        const user = await client.user.findUnique({
            where: { id: req.user.id },
            select: { password: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await client.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Deactivate account
userRouter.put("/deactivate", authMiddleware, async (req, res) => {
    try {
        await client.user.update({
            where: { id: req.user.id },
            data: { isActive: false },
        });

        res.json({ message: "Account deactivated" });
    } catch (error) {
        console.error("Deactivate Account Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Admin: Update user role
userRouter.put("/:id/role", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Check if user is admin
        const admin = await client.user.findUnique({
            where: { id: req.user.id },
            select: { role: true },
        });

        if (!admin || admin.role !== "Admin") {
            return res.status(403).json({ error: "Only admins can change user roles" });
        }

        if (!["Admin", "Moderator", "Creator", "User", "Guest"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const updatedUser = await client.user.update({
            where: { id },
            data: { role },
            select: { id: true, username: true, role: true },
        });

        res.json({ message: "User role updated", user: updatedUser });
    } catch (error) {
        console.error("Update Role Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

export default userRouter;
