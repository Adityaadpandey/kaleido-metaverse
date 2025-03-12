import { Prisma } from "@prisma/client"; // Import Prisma for error handling
import { client } from "@repo/db/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/index.js";

const user = Router();

// Signup: Create a new user
user.post('/signup', async (req, res) => {
    try {
        const { username, password, email, displayName, bio } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: "Missing required fields: username, password, and email are mandatory." });
        }

        const existingUser = await client.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ error: "Username already exists. Please choose a different one." });
        }

        const existingEmail = await client.user.findUnique({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ error: "Email is already in use. Try another one." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await client.user.create({
            data: { username, password: hashedPassword, email, displayName, bio },
        });

        res.status(201).json({ message: "User created successfully!", user: newUser });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "An unexpected error occurred while creating the user." });
    }
});

// Login user
user.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Missing fields: username and password are required." });
        }

        const user = await client.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(404).json({ error: "User not found. Please sign up first." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect password. Please try again." });
        }
        console.log(process.env.JWT_SECRET);
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "1d" });

        res.json({ message: "Login successful", token, user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "An error occurred during login. Please try again later." });
    }
});

// Get user profile
user.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const user = await client.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(404).json({ error: `User with ID ${username} not found.` });
        }

        res.json(user);
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({ error: "Failed to fetch user details. Please try again later." });
    }
});

// Update user profile
user.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email } = req.body;

        // Check if username or email already exists
        if (username) {
            const existingUser = await client.user.findUnique({ where: { username } });
            if (existingUser && existingUser.id !== id) {
                return res.status(409).json({ error: "Username already taken. Choose a different one." });
            }
        }

        if (email) {
            const existingEmail = await client.user.findUnique({ where: { email } });
            if (existingEmail && existingEmail.id !== id) {
                return res.status(409).json({ error: "Email is already in use." });
            }
        }

        const updatedUser = await client.user.update({
            where: { id },
            data: req.body,
        });

        res.json({ message: "User updated successfully!", user: updatedUser });
    } catch (error) {
        console.error("Update User Error:", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                return res.status(404).json({ error: "User not found. Update failed." });
            }
        }

        res.status(500).json({ error: "An error occurred while updating the user." });
    }
});

// Delete user
user.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await client.user.delete({ where: { id } });
        res.json({ message: `User with ID ${id} deleted successfully.` });
    } catch (error) {
        console.error("Delete User Error:", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                return res.status(404).json({ error: "User not found. Deletion failed." });
            }
        }

        res.status(500).json({ error: "An error occurred while deleting the user." });
    }
});

export default user;
