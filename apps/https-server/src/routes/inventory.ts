import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const inventoryRouter = Router();

// Get user inventory
inventoryRouter.get("/", authMiddleware, async (req, res) => {
    try {
        const inventory = await client.inventoryItem.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                element: true,
            },
            orderBy: {
                acquiredAt: "desc",
            },
        });

        res.json({ inventory });
    } catch (error) {
        console.error("Get Inventory Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Add item to inventory (admin only)
inventoryRouter.post("/add", authMiddleware, async (req, res) => {
    try {
        const { userId, elementId, quantity = 1, expiresAt = null } = req.body;

        // Check if user is admin
        const admin = await client.user.findUnique({
            where: { id: req.user.id },
            select: { role: true },
        });

        if (!admin || admin.role !== "Admin") {
            return res.status(403).json({ error: "Only admins can add items to inventory" });
        }

        // Check if element exists
        const element = await client.element.findUnique({
            where: { id: elementId },
            select: { id: true },
        });

        if (!element) {
            return res.status(404).json({ error: "Element not found" });
        }

        // Check if user exists
        const user = await client.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if item already exists in inventory
        const existingItem = await client.inventoryItem.findFirst({
            where: {
                userId,
                elementId,
            },
        });

        if (existingItem) {
            // Update quantity
            const updatedItem = await client.inventoryItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + quantity,
                    expiresAt: expiresAt ? new Date(expiresAt) : existingItem.expiresAt,
                },
                include: {
                    element: true,
                },
            });

            return res.json({ message: "Item quantity updated", item: updatedItem });
        }

        // Create new inventory item
        const newItem = await client.inventoryItem.create({
            data: {
                userId,
                elementId,
                quantity,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            include: {
                element: true,
            },
        });

        res.status(201).json({ message: "Item added to inventory", item: newItem });
    } catch (error) {
        console.error("Add Inventory Item Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Equip/unequip item
inventoryRouter.put("/:id/toggle-equip", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the item
        const item = await client.inventoryItem.findUnique({
            where: { id },
            select: { userId: true, isEquipped: true },
        });

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Check if user owns the item
        if (item.userId !== req.user.id) {
            return res.status(403).json({ error: "You can only equip/unequip your own items" });
        }

        const updatedItem = await client.inventoryItem.update({
            where: { id },
            data: {
                isEquipped: !item.isEquipped,
            },
            include: {
                element: true,
            },
        });

        res.json({
            message: updatedItem.isEquipped ? "Item equipped" : "Item unequipped",
            item: updatedItem,
        });
    } catch (error) {
        console.error("Toggle Equip Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Remove item from inventory
inventoryRouter.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity = 1 } = req.body;

        // Find the item
        const item = await client.inventoryItem.findUnique({
            where: { id },
            select: { userId: true, quantity: true },
        });

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Check if user owns the item
        if (item.userId !== req.user.id) {
            // Check if user is admin
            const user = await client.user.findUnique({
                where: { id: req.user.id },
                select: { role: true },
            });

            if (!user || user.role !== "Admin") {
                return res.status(403).json({ error: "You can only remove your own items" });
            }
        }

        // If removing fewer than total quantity, just update
        if (quantity < item.quantity) {
            const updatedItem = await client.inventoryItem.update({
                where: { id },
                data: {
                    quantity: item.quantity - quantity,
                },
            });

            return res.json({
                message: "Item quantity reduced",
                remaining: updatedItem.quantity,
            });
        }

        // Otherwise delete the item
        await client.inventoryItem.delete({
            where: { id },
        });

        res.json({ message: "Item removed from inventory" });
    } catch (error) {
        console.error("Remove Inventory Item Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

export default inventoryRouter;
