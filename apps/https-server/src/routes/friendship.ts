import { client } from "@repo/db/client";
import { Router } from "express";
import authMiddleware from "../middleware/index.js";

const friendshipRouter = Router();

// Get all friends
friendshipRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const friendships = await client.friendship.findMany({
      where: {
        OR: [
          { userId: req.user.id, status: "Accepted" },
          { friendId: req.user.id, status: "Accepted" },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            lastOnline: true,
            avatars: {
              select: {
                id: true,
                imageUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            lastOnline: true,
            avatars: {
              select: {
                id: true,
                imageUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    // Format the response to show the other user in each friendship
    const friends = friendships.map((friendship) => {
      const isFriendInitiator = friendship.userId === req.user.id;
      return {
        id: friendship.id,
        friendshipId: friendship.id,
        user: isFriendInitiator ? friendship.friend : friendship.user,
        createdAt: friendship.createdAt,
        status: friendship.status,
      };
    });

    res.json({ friends });
  } catch (error) {
    console.error("Get Friends Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Get pending friend requests
friendshipRouter.get("/pending", authMiddleware, async (req, res) => {
  try {
    const pendingRequests = await client.friendship.findMany({
      where: {
        friendId: req.user.id,
        status: "Pending",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            currentAvatar: {
              select: {
                id: true,
                imageUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({ pendingRequests });
  } catch (error) {
    console.error("Get Pending Requests Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Send friend request
// Send friend request by username
friendshipRouter.post("/request", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Find the user by username
    const friend = await client.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!friend) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendId = friend.id;

    if (friendId === req.user.id) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // Check if friendship already exists
    const existingFriendship = await client.friendship.findFirst({
      where: {
        OR: [
          { userId: req.user.id, friendId },
          { userId: friendId, friendId: req.user.id },
        ],
      },
    });

    if (existingFriendship) {
      return res.status(400).json({
        error: "Friendship already exists",
        status: existingFriendship.status,
      });
    }

    // Create friendship request
    const friendship = await client.friendship.create({
      data: {
        userId: req.user.id,
        friendId,
        status: "Pending",
      },
    });

    res.status(201).json({ message: "Friend request sent", friendship });
  } catch (error) {
    console.error("Send Friend Request Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Accept friend request
friendshipRouter.post("/accept", authMiddleware, async (req, res) => {
  try {
    const { friendshipId } = req.body;

    if (!friendshipId) {
      return res.status(400).json({ error: "Friendship ID is required" });
    }

    // Find the friendship
    const friendship = await client.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: req.user.id,
        status: "Pending",
      },
    });

    if (!friendship) {
      return res
        .status(404)
        .json({ error: "Friend request not found or already processed" });
    }

    // Update friendship
    const updatedFriendship = await client.friendship.update({
      where: { id: friendshipId },
      data: { status: "Accepted" },
    });

    res.json({
      message: "Friend request accepted",
      friendship: updatedFriendship,
    });
  } catch (error) {
    console.error("Accept Friend Request Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Reject/cancel friend request
friendshipRouter.post("/reject", authMiddleware, async (req, res) => {
  try {
    const { friendshipId } = req.body;

    if (!friendshipId) {
      return res.status(400).json({ error: "Friendship ID is required" });
    }

    // Find the friendship
    const friendship = await client.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [{ userId: req.user.id }, { friendId: req.user.id }],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    // Delete friendship
    await client.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: "Friend request rejected/canceled" });
  } catch (error) {
    console.error("Reject Friend Request Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Block a user
friendshipRouter.post("/block", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    // Check if friendship exists
    const existingFriendship = await client.friendship.findFirst({
      where: {
        OR: [
          { userId: req.user.id, friendId: userId },
          { userId, friendId: req.user.id },
        ],
      },
    });

    if (existingFriendship) {
      // Update existing friendship to blocked
      const updatedFriendship = await client.friendship.update({
        where: { id: existingFriendship.id },
        data: {
          userId: req.user.id, // Make sure requester is the blocker
          friendId: userId,
          status: "Blocked",
        },
      });
      return res.json({
        message: "User blocked",
        friendship: updatedFriendship,
      });
    }

    // Create new blocked friendship
    const friendship = await client.friendship.create({
      data: {
        userId: req.user.id,
        friendId: userId,
        status: "Blocked",
      },
    });

    res.status(201).json({ message: "User blocked", friendship });
  } catch (error) {
    console.error("Block User Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Unblock a user
friendshipRouter.post("/unblock", authMiddleware, async (req, res) => {
  try {
    const { friendshipId } = req.body;

    if (!friendshipId) {
      return res.status(400).json({ error: "Friendship ID is required" });
    }

    // Find the blocked friendship
    const friendship = await client.friendship.findFirst({
      where: {
        id: friendshipId,
        userId: req.user.id,
        status: "Blocked",
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Blocked user not found" });
    }

    // Delete the friendship
    await client.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: "User unblocked" });
  } catch (error) {
    console.error("Unblock User Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Remove a friend
friendshipRouter.delete("/:friendshipId", authMiddleware, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    // Find the friendship
    const friendship = await client.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [{ userId: req.user.id }, { friendId: req.user.id }],
        status: "Accepted",
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    // Delete friendship
    await client.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Remove Friend Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

export default friendshipRouter;
