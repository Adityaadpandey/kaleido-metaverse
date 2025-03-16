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

    console.log("Looking for avatar for user ID:", id);

    // First check if the user exists
    const user = await client.user.findUnique({
      where: { id },
      include: { currentAvatar: true }
    });

    if (!user) {
      console.log("User not found:", id);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Found user:", user.username || id);

    // Check if user has an avatar already
    let avatarData;

    if (user.currentAvatarId && user.currentAvatar?.imageUrl) {
      console.log("User already has an avatar:", user.currentAvatar);
      avatarData = user.currentAvatar;
    } else {
      console.log("Generating new avatar for user");
      // Generate a DiceBear avatar URL
      const generatedAvatarUrl = generateDiceBearAvatar(id);
      console.log("Generated avatar URL:", generatedAvatarUrl);

      try {
        // Create a new avatar with explicit connection to the user
        avatarData = await client.avatar.create({
          data: {
            imageUrl: generatedAvatarUrl,
            name: `Generated Avatar for ${user.username || id}`,
            user: {
              connect: {
                id: user.id
              }
            }
          },
        });

        console.log("Created new avatar:", avatarData);

        // Update the user to set this as their current avatar
        const updatedUser = await client.user.update({
          where: { id },
          data: { currentAvatarId: avatarData.id },
        });

        console.log("Updated user with avatar:", updatedUser.currentAvatarId);
      } catch (createError) {
        console.error("Error creating avatar:", createError);

        // Fallback approach - create avatar without user connection first
        avatarData = await client.avatar.create({
          data: {
            imageUrl: generatedAvatarUrl,
            name: `Generated Avatar for ${user.username || id}`,
          },
        });

        console.log("Created fallback avatar:", avatarData);

        // Then update the avatar with userId
        avatarData = await client.avatar.update({
          where: { id: avatarData.id },
          data: { userId: user.id },
        });

        console.log("Updated avatar with userId:", avatarData);

        // Update the user to set this as their current avatar
        await client.user.update({
          where: { id },
          data: { currentAvatarId: avatarData.id },
        });
      }
    }

    res.json({ avatar: avatarData });
  } catch (error) {
    console.error("Get Avatar Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Create/update avatar
avatarRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { avatarUrl, name } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ error: "Avatar URL is required" });
    }

    // Create a new avatar and update the user's currentAvatar
    const newAvatar = await client.avatar.create({
      data: {
        imageUrl: avatarUrl,
        name: name || `Avatar ${Date.now()}`,
        userId: req.user.id,
      },
    });

    // Update the user's currentAvatarId
    await client.user.update({
      where: { id: req.user.id },
      data: { currentAvatarId: newAvatar.id },
    });

    res.status(201).json({
      message: "Avatar created and set as current successfully",
      avatar: newAvatar,
    });
  } catch (error) {
    console.error("Update Avatar Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Delete current avatar
avatarRouter.delete("/", authMiddleware, async (req, res) => {
  try {
    // First, find the current avatar id
    const user = await client.user.findUnique({
      where: { id: req.user.id },
      select: { currentAvatarId: true },
    });

    if (!user?.currentAvatarId) {
      return res.status(404).json({ error: "No current avatar found" });
    }

    // Set the user's current avatar to null
    await client.user.update({
      where: { id: req.user.id },
      data: { currentAvatarId: null },
    });

    // Optionally, delete the avatar entirely
    await client.avatar.delete({
      where: { id: user.currentAvatarId },
    });

    res.json({ message: "Avatar removed successfully" });
  } catch (error) {
    console.error("Delete Avatar Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

export default avatarRouter;
