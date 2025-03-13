import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const elementRouter = Router();

// Get all elements (with optional filtering)
elementRouter.get("/", async (req, res) => {
  try {
    const { type, category, tags } = req.query;

    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (tags) {
      filter.tags = {
        contains: tags as string,
      };
    }

    const elements = await client.element.findMany({
      where: filter,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ elements });
  } catch (error) {
    console.error("Get Elements Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Get element by ID
elementRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const element = await client.element.findUnique({
      where: { id },
    });

    if (!element) {
      return res.status(404).json({ error: "Element not found" });
    }

    res.json({ element });
  } catch (error) {
    console.error("Get Element Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Create a new element (admin only)
elementRouter.post("/", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const user = await client.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "Only admins can create elements" });
    }

    const {
      name,
      type,
      width,
      height,
      depth,
      imageUrl,
      modelUrl,
      thumbnailUrl,
      isCollidable,
      tags,
      category,
    } = req.body;

    if (!name || !width || !height) {
      return res.status(400).json({ error: "Name, width, and height are required" });
    }

    const newElement = await client.element.create({
      data: {
        name,
        type: type || "Static",
        width,
        height,
        depth,
        imageUrl,
        modelUrl,
        thumbnailUrl,
        isCollidable: isCollidable || false,
        tags,
        category,
      },
    });

    res.status(201).json({ message: "Element created successfully", element: newElement });
  } catch (error) {
    console.error("Create Element Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Update an element (admin only)
elementRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const user = await client.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "Only admins can update elements" });
    }

    const { id } = req.params;
    const {
      name,
      type,
      width,
      height,
      depth,
      imageUrl,
      modelUrl,
      thumbnailUrl,
      isCollidable,
      tags,
      category,
    } = req.body;

    const updatedElement = await client.element.update({
      where: { id },
      data: {
        name,
        type,
        width,
        height,
        depth,
        imageUrl,
        modelUrl,
        thumbnailUrl,
        isCollidable,
        tags,
        category,
      },
    });

    res.json({ message: "Element updated successfully", element: updatedElement });
  } catch (error) {
    console.error("Update Element Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Delete an element (admin only)
elementRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const user = await client.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "Only admins can delete elements" });
    }

    const { id } = req.params;

    // Delete related records first
    await client.spaceElement.deleteMany({ where: { elementId: id } });
    await client.mapElement.deleteMany({ where: { elementId: id } });
    await client.inventoryItem.deleteMany({ where: { elementId: id } });

    // Delete the element
    await client.element.delete({
      where: { id },
    });

    res.json({ message: "Element deleted successfully" });
  } catch (error) {
    console.error("Delete Element Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

export default elementRouter;
