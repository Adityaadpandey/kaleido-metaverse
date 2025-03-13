import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const avatarRouter = Router();

// Function to generate a DiceBear avatar URL
const generateDiceBearAvatar = (id: string) => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`;
};

// Get user avatar
avatarRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const user = await client.avatar.findUnique({
            where: { id },
            select: { imageUrl: true },
        });

        // If no avatar, generate a default DiceBear avatar
        const avatarUrl = user?.imageUrl || generateDiceBearAvatar(id);

        res.json({ avatar: avatarUrl });
    } catch (error) {
        console.error("Get Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Create/update avatar
avatarRouter.post("/", authMiddleware, async (req, res) => {
    try {
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return res.status(400).json({ error: "Avatar URL is required" });
        }

        const updatedUser = await client.avatar.upsert({
            where: { id: req.user!.id },
            update: { imageUrl: avatarUrl },
            create: { id: req.user!.id, imageUrl: avatarUrl },
        });

        res.status(201).json({ message: "Avatar updated successfully", avatar: updatedUser.imageUrl });
    } catch (error) {
        console.error("Update Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// delete avatar
avatarRouter.delete("/", authMiddleware, async (req, res) => {
    try {
        await client.avatar.update({
            where: { id: req.user!.id },
            update: { imageUrl: null },
        });

        res.json({ message: "Avatar deleted successfully" });
    } catch (error) {
        console.error("Delete Avatar Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

export default avatarRouter;
