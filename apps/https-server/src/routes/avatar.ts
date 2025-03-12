import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const avatarRouter = Router();

// Get user avatar (public)
avatarRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await client.user.findUnique({
            where: { id },
            select: { avatar: true },
        });

        if (!user || !user.avatar) {
            return res.status(404).json({ error: "Avatar not found" });
        }

        res.json({ avatar: user.avatar });
    } catch (error) {
        console.error("Get Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Create/update avatar (protected)
avatarRouter.post("/", authMiddleware, async (req, res) => {
    try {
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return res.status(400).json({ error: "Avatar URL is required" });
        }

        const updatedUser = await client.user.update({
            where: { id: req.user!.id },
            data: { avatar: avatarUrl },
        });

        res.status(201).json({ message: "Avatar updated successfully", avatar: updatedUser.avatar });
    } catch (error) {
        console.error("Update Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Delete avatar (protected)
avatarRouter.delete("/", authMiddleware, async (req, res) => {
    try {
        await client.user.update({
            where: { id: req.user!.id },
            data: { avatar: null },
        });

        res.json({ message: "Avatar deleted successfully" });
    } catch (error) {
        console.error("Delete Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

export default avatarRouter;
