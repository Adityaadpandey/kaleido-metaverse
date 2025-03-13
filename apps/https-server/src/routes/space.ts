import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const spaceRouter = Router();

// Get all public spaces
spaceRouter.get("/public", async (req, res) => {
    try {
        const spaces = await client.space.findMany({
            where: { isPublic: true },
            select: {
                id: true,
                name: true,
                description: true,
                thumbnail: true,
                owner: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
                _count: {
                    select: { userPresences: true },
                },
            },
        });

        res.json({ spaces });
    } catch (error) {
        console.error("Get Public Spaces Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get a specific space
spaceRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const space = await client.space.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
                elements: {
                    include: {
                        element: true,
                    },
                },
                userPresences: {
                    where: { isActive: true },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                currentAvatar: true,
                            },
                        },
                    },
                },
            },
        });

        if (!space) {
            return res.status(404).json({ error: "Space not found" });
        }

        res.json({ space });
    } catch (error) {
        console.error("Get Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Create a new space
spaceRouter.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, description, isPublic, width, height, depth, backgroundImage, gravity, lightingTheme } = req.body;

        if (!name || !width || !height) {
            return res.status(400).json({ error: "Name, width, and height are required" });
        }

        const newSpace = await client.space.create({
            data: {
                name,
                description,
                isPublic: isPublic ?? true,
                width,
                height,
                depth,
                backgroundImage,
                gravity,
                lightingTheme,
                owner: {
                    connect: { id: req.user.id },
                },
            },
        });

        res.status(201).json({ message: "Space created successfully", space: newSpace });
    } catch (error) {
        console.error("Create Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Update a space
spaceRouter.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isPublic, width, height, depth, backgroundImage, gravity, lightingTheme } = req.body;

        // Check if space exists and user is the owner
        const existingSpace = await client.space.findUnique({
            where: { id },
            select: { ownerId: true },
        });

        if (!existingSpace) {
            return res.status(404).json({ error: "Space not found" });
        }

        if (existingSpace.ownerId !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to update this space" });
        }

        const updatedSpace = await client.space.update({
            where: { id },
            data: {
                name,
                description,
                isPublic,
                width,
                height,
                depth,
                backgroundImage,
                gravity,
                lightingTheme,
            },
        });

        res.json({ message: "Space updated successfully", space: updatedSpace });
    } catch (error) {
        console.error("Update Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Delete a space
spaceRouter.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if space exists and user is the owner
        const existingSpace = await client.space.findUnique({
            where: { id },
            select: { ownerId: true },
        });

        if (!existingSpace) {
            return res.status(404).json({ error: "Space not found" });
        }

        if (existingSpace.ownerId !== req.user.id) {
            return res.status(403).json({ error: "You don't have permission to delete this space" });
        }

        // Delete related records first
        await client.spaceElement.deleteMany({ where: { spaceId: id } });
        await client.spacePresence.deleteMany({ where: { spaceId: id } });
        await client.spaceInstance.deleteMany({ where: { spaceId: id } });

        // Delete the space
        await client.space.delete({ where: { id } });

        res.json({ message: "Space deleted successfully" });
    } catch (error) {
        console.error("Delete Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Join a space
spaceRouter.post("/:id/join", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { x, y, z } = req.body;

        // Check if the space exists
        const space = await client.space.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!space) {
            return res.status(404).json({ error: "Space not found" });
        }

        // Create or update presence
        const presence = await client.spacePresence.upsert({
            where: {
                userId_spaceId_instanceId: {
                    userId: req.user.id,
                    spaceId: id,
                    instanceId: null,
                },
            },
            update: {
                x: x || 0,
                y: y || 0,
                z: z || 0,
                isActive: true,
                lastUpdated: new Date(),
            },
            create: {
                userId: req.user.id,
                spaceId: id,
                x: x || 0,
                y: y || 0,
                z: z || 0,
                isActive: true,
            },
        });

        res.json({ message: "Joined space successfully", presence });
    } catch (error) {
        console.error("Join Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Leave a space
spaceRouter.post("/:id/leave", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await client.spacePresence.updateMany({
            where: {
                userId: req.user.id,
                spaceId: id,
            },
            data: {
                isActive: false,
                lastUpdated: new Date(),
            },
        });

        res.json({ message: "Left space successfully" });
    } catch (error) {
        console.error("Leave Space Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Update position in space
spaceRouter.put("/:id/position", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { x, y, z, rotationX, rotationY, rotationZ } = req.body;

        const updatedPresence = await client.spacePresence.updateMany({
            where: {
                userId: req.user.id,
                spaceId: id,
                isActive: true,
            },
            data: {
                x,
                y,
                z,
                rotationX,
                rotationY,
                rotationZ,
                lastUpdated: new Date(),
            },
        });

        res.json({ message: "Position updated", updated: updatedPresence.count > 0 });
    } catch (error) {
        console.error("Update Position Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

export default spaceRouter;
