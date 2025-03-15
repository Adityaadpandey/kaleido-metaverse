"use client";

import axios from "axios";
import { Check, LogOut, Shield, User, UserPlus, Users, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// const toast = useToast()

interface Friend {
  id: string;
  username: string;
  displayName?: string;
  currentAvatar?: string;
  lastOnline?: Date;
  friendshipId?: string;
  status?: string;
}

interface FriendRequest {
  id: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    currentAvatar?: string;
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingFriends, setPendingFriends] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);

  // Dialog states
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Friend | null>(null);
  const [actionType, setActionType] = useState<"remove" | "block" | "unblock">("remove");

  useEffect(() => {
    const fetchFriendsData = async () => {
      if (!session?.accessToken) return;

      try {
        // Fetch Pending Friend Requests
        const pendingResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/friendship/pending`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        setPendingFriends(pendingResponse.data.pendingRequests || []);

        // Fetch Accepted Friends
        const friendsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/friendship`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        setFriends(friendsResponse.data.friends.filter(f => f.status === "Accepted") || []);

        // Filter blocked users from the response
        setBlockedUsers(friendsResponse.data.friends.filter(f => f.status === "Blocked") || []);
      } catch (error) {
        console.error("Error fetching friends:", error);
        // toast({
        //   title: "Error",
        //   description: "Failed to load friends data. Please try again.",
        //   variant: "destructive",
        // });
      }
    };

    fetchFriendsData();
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  // Send a friend request
  const sendFriendRequest = async () => {
    if (!friendUsername.trim()) return;

    setIsSubmitting(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/request`,
        { username: friendUsername },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // toast({
      //   title: "Success",
      //   description: `Friend request sent to ${friendUsername}!`,
      // });

      setAddFriendOpen(false);
      setFriendUsername("");
    } catch (error: any) {
      // toast({
      //   title: "Error",
      //   description: error.response?.data?.error || "Failed to send friend request",
      //   variant: "destructive",
      // });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accept a friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/accept`,
        { friendshipId },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // Update UI
      setPendingFriends(prev => prev.filter(request => request.id !== friendshipId));

      // Refresh friends list
      const friendsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      setFriends(friendsResponse.data.friends.filter(f => f.status === "Accepted") || []);

      // toast({
      //   title: "Success",
      //   description: "Friend request accepted!",
      // });
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to accept friend request",
      //   variant: "destructive",
      // });
    }
  };

  // Reject a friend request
  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/reject`,
        { friendshipId },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // Update UI
      setPendingFriends(prev => prev.filter(request => request.id !== friendshipId));

      // toast({
      //   title: "Success",
      //   description: "Friend request rejected",
      // });
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to reject friend request",
      //   variant: "destructive",
      // });
    }
  };

  // Remove a friend
  const removeFriend = async () => {
    if (!selectedUser?.friendshipId) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/${selectedUser.friendshipId}`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // Update UI
      setFriends(prev => prev.filter(friend => friend.friendshipId !== selectedUser.friendshipId));

      // toast({
      //   title: "Success",
      //   description: `${selectedUser.displayName || selectedUser.username} removed from friends`,
      // });
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to remove friend",
      //   variant: "destructive",
      // });
    } finally {
      setAlertDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // Block a user
  const blockUser = async () => {
    if (!selectedUser?.id) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/block`,
        { userId: selectedUser.id },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // Remove from friends if they were a friend
      setFriends(prev => prev.filter(friend => friend.id !== selectedUser.id));

      // Refresh blocked users
      const friendsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      setBlockedUsers(friendsResponse.data.friends.filter(f => f.status === "Blocked") || []);

      // toast({
      //   title: "Success",
      //   description: `${selectedUser.displayName || selectedUser.username} has been blocked`,
      // });
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to block user",
      //   variant: "destructive",
      // });
    } finally {
      setAlertDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // Unblock a user
  const unblockUser = async () => {
    if (!selectedUser?.friendshipId) return;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/friendship/unblock`,
        { friendshipId: selectedUser.friendshipId },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );

      // Update UI
      setBlockedUsers(prev => prev.filter(user => user.friendshipId !== selectedUser.friendshipId));

      // toast({
      //   title: "Success",
      //   description: `${selectedUser.displayName || selectedUser.username} has been unblocked`,
      // });
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to unblock user",
      //   variant: "destructive",
      // });
    } finally {
      setAlertDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleUserAction = () => {
    if (actionType === "remove") {
      removeFriend();
    } else if (actionType === "block") {
      blockUser();
    } else if (actionType === "unblock") {
      unblockUser();
    }
  };

  const openActionDialog = (user: Friend, action: "remove" | "block" | "unblock") => {
    setSelectedUser(user);
    setActionType(action);
    setAlertDialogOpen(true);
  };

  // Time ago formatter
  const timeAgo = (date: Date) => {
    if (!date) return "Unknown";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const getInitials = (name: string) => {
    return name
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          variant="outline"
          <Button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback>{getInitials(session?.user?.username || session?.user?.name || "User")}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-lg">{session?.user?.name}</h3>
                  <p className="text-muted-foreground">@{session?.user?.username}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{session?.user?.email || "Not available"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">User ID:</span>
                  <span className="text-muted-foreground text-sm">{session?.user?.id || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Friends & Requests Card */}
          <Card className="md:col-span-2">
            <Tabs defaultValue="friends">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>Social</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setAddFriendOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                </div>
                <TabsList className="mt-2">
                  <TabsTrigger value="friends" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Friends ({friends.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Requests ({pendingFriends.length})
                  </TabsTrigger>
                  <TabsTrigger value="blocked" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Blocked ({blockedUsers.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="friends" className="m-0">
                  {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">You haven't added any friends yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setAddFriendOpen(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add a friend
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={friend.currentAvatar} />
                              <AvatarFallback>{getInitials(friend.displayName || friend.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{friend.displayName || friend.username}</p>
                              <p className="text-sm text-muted-foreground">@{friend.username}</p>
                              {friend.lastOnline && (
                                <p className="text-xs text-muted-foreground">Last online: {timeAgo(friend.lastOnline)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              onClick={() => openActionDialog(friend, "block")}
                            >
                              Block
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionDialog(friend, "remove")}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="requests" className="m-0">
                  {pendingFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No friend requests at the moment</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {pendingFriends.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.user.currentAvatar} />
                              <AvatarFallback>{getInitials(request.user.displayName || request.user.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.user.displayName || request.user.username}</p>
                              <p className="text-sm text-muted-foreground">@{request.user.username}</p>
                              <Badge variant="outline" className="mt-1">Pending</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:bg-red-100 hover:text-red-600"
                              onClick={() => rejectFriendRequest(request.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-green-500 hover:bg-green-100 hover:text-green-600"
                              onClick={() => acceptFriendRequest(request.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="blocked" className="m-0">
                  {blockedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">You haven't blocked any users</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {blockedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.currentAvatar} />
                              <AvatarFallback>{getInitials(user.displayName || user.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.displayName || user.username}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                              <Badge variant="outline" className="bg-red-100 text-red-700 mt-1">Blocked</Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog(user, "unblock")}
                          >
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Add Friend Dialog */}
      <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription>
              Enter the username of the person you want to add as a friend.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="Enter username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFriendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendFriendRequest} disabled={isSubmitting || !friendUsername.trim()}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "remove" ? "Remove Friend" :
                actionType === "block" ? "Block User" : "Unblock User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "remove" && "Are you sure you want to remove this friend? You'll need to send a new friend request to connect again."}
              {actionType === "block" && "Are you sure you want to block this user? They won't be able to contact you or see your profile."}
              {actionType === "unblock" && "Are you sure you want to unblock this user? They'll be able to send you friend requests again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUserAction} className={actionType === "block" ? "bg-red-600 hover:bg-red-700" : ""}>
              {actionType === "remove" ? "Remove" :
                actionType === "block" ? "Block" : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
