import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const spaceInstanceRouter = Router();

// Create a new space instance (Protected)
spaceInstanceRouter.post("/:id/instances", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, maxUsers } = req.body;

    const space = await client.space.findUnique({ where: { id } });
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }

    const newInstance = await client.spaceInstance.create({
      data: {
        spaceId: id,
        name,
        maxUsers: maxUsers || 10, // Default max users if not provided
      },
    });

    res
      .status(201)
      .json({ message: "Instance created", instance: newInstance });
  } catch (error) {
    console.error("Create Instance Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Get active instances for a space
spaceInstanceRouter.get("/:id/instances", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const space = await client.space.findUnique({ where: { id } });
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }

    const activeInstances = await client.spaceInstance.findMany({
      where: { spaceId: id, isActive: true },
    });

    res.json({ instances: activeInstances });
  } catch (error) {
    console.error("Get Active Instances Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Delete a space instance (Admin only)
spaceInstanceRouter.delete(
  "/:id/instances/:instanceId",
  authMiddleware,
  async (req, res) => {
    try {
      const { id, instanceId } = req.params;

      const space = await client.space.findUnique({ where: { id } });
      if (!space) {
        return res.status(404).json({ error: "Space not found" });
      }

      // Ensure only the space owner or admin can delete an instance
      if (space.ownerId !== req.user!.id && req.user!.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Unauthorized to delete this instance" });
      }

      await client.spaceInstance.delete({ where: { id: instanceId } });

      res.json({ message: "Instance deleted successfully" });
    } catch (error) {
      console.error("Delete Instance Error:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  },
);

export default spaceInstanceRouter;
