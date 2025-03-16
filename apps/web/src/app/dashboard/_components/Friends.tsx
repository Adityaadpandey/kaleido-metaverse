"use client";

import axios from "axios";
import { Check, Shield, UserPlus, Users, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Friend {
    id: string;
    username: string;
    displayName?: string;
    currentAvatar?: string;
    lastOnline?: Date;
    friendshipId?: string;
    status?: string;
    user: {
        avatars: any[];
        displayName?: string;
        username: string;
        imgUrl?: string;
        currentAvatar?: string;
        lastOnline?: Date;
        friendshipId?: string;
    };
}

interface FriendRequest {
    id: string;
    user: {
        id: string;
        username: string;
        displayName?: string;
        currentAvatar?: string;
        avatars: any[];
    };
}

const Friends = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [pendingFriends, setPendingFriends] = useState<FriendRequest[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<Friend[]>([]);
    const [addFriendOpen, setAddFriendOpen] = useState(false);
    const [friendUsername, setFriendUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Friend | null>(null);
    const [actionType, setActionType] = useState<"remove" | "block" | "unblock">("remove");


    // Fetch friends data
    useEffect(() => {
        if (!session?.accessToken) return;
        fetchFriendsData();
    }, [session]);

    const fetchFriendsData = async () => {
        if (!session?.accessToken) return;

        try {
            // Fetch all data in parallel
            const [pendingResponse, friendsResponse] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/friendship/pending`, {
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/friendship`, {
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
            ]);

            // Update states
            setPendingFriends(pendingResponse.data.pendingRequests || []);
            setFriends(friendsResponse.data.friends.filter(f => f.status === "Accepted") || []);
            setBlockedUsers(friendsResponse.data.friends.filter(f => f.status === "Blocked") || []);
        } catch (error) {
            console.error("Error fetching friends:", error);
            toast.error("Failed to load friends data");
        }
    };

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-lg">Loading...</p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/auth/login");
        return null;
    }

    // API functions
    const sendFriendRequest = async () => {
        if (!friendUsername.trim()) return;
        setIsSubmitting(true);

        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/friendship/request`,
                { username: friendUsername },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );

            toast.success(`Friend request sent to ${friendUsername}!`);
            setAddFriendOpen(false);
            setFriendUsername("");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to send friend request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFriendRequest = async (friendshipId: string, action: "accept" | "reject") => {
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/friendship/${action}`,
                { friendshipId },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );

            // Update UI
            setPendingFriends(prev => prev.filter(request => request.id !== friendshipId));

            if (action === "accept") {
                fetchFriendsData(); // Refresh friends list
                toast.success("Friend request accepted!");
            } else {
                toast.success("Friend request rejected");
            }
        } catch {
            toast.error(`Failed to ${action} friend request`);
        }
    };


    const handleUserAction = async () => {
        if (!selectedUser) return;

        try {
            switch (actionType) {
                case "remove":
                    if (!selectedUser.friendshipId) return;
                    await axios.delete(
                        `${process.env.NEXT_PUBLIC_API_URL}/friendship/${selectedUser.friendshipId}`,
                        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
                    );
                    setFriends(prev => prev.filter(f => f.friendshipId !== selectedUser.friendshipId));
                    toast.success(`${selectedUser.displayName || selectedUser.username} removed from friends`);
                    break;

                case "block":
                    await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL}/friendship/block`,
                        { userId: selectedUser.id },
                        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
                    );
                    setFriends(prev => prev.filter(f => f.id !== selectedUser.id));
                    fetchFriendsData(); // Refresh blocked users
                    toast.success(`${selectedUser.displayName || selectedUser.username} has been blocked`);
                    break;

                case "unblock":
                    if (!selectedUser.friendshipId) return;
                    await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL}/friendship/unblock`,
                        { friendshipId: selectedUser.friendshipId },
                        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
                    );
                    setBlockedUsers(prev => prev.filter(u => u.friendshipId !== selectedUser.friendshipId));
                    toast.success(`${selectedUser.displayName || selectedUser.username} has been unblocked`);
                    break;
            }
        } catch {
            toast.error(`Failed to ${actionType} user`);
        } finally {
            setAlertDialogOpen(false);
            setSelectedUser(null);
        }
    };

    // Helper functions
    const openActionDialog = (user: Friend, action: "remove" | "block" | "unblock") => {
        setSelectedUser(user);
        setActionType(action);
        setAlertDialogOpen(true);
    };


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

    // Render components
    const renderFriendsList = () => {
        if (friends.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-6">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You haven&apos;t added any friends yet</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setAddFriendOpen(true)}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add a friend
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {friends.map((friend) => (
                    <div
                        key={friend.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={friend.user?.avatars[0]?.imageUrl} />
                                <AvatarFallback>
                                    {friend.user?.displayName || friend.username?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{friend.user?.displayName || friend.username}</p>
                                <p className="text-sm text-muted-foreground">@{friend.user.username}</p>
                                {friend.lastOnline && (
                                    <p className="text-xs text-muted-foreground">
                                        Last online: {timeAgo(friend.lastOnline)}
                                    </p>
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
        );
    };

    const renderRequestsList = () => {
        if (pendingFriends.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-6">
                    <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No friend requests at the moment</p>
                </div>
            );
        }

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {pendingFriends.map((request) => (
                    <div
                        key={request.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={request?.user?.avatars[0]?.imageUrl} />
                                <AvatarFallback>
                                    {(request.user.displayName || request.user.username)?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">
                                    {request.user.displayName || request.user.username}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {/* <pre className="text-amber-50">{request.user?.displayName}</pre> */}
                                    @{request.user?.displayName}
                                </p>
                                <Badge variant="outline" className="mt-1">Pending</Badge>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 hover:bg-red-100 hover:text-red-600"
                                onClick={() => handleFriendRequest(request.id, "reject")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="text-green-500 hover:bg-green-100 hover:text-green-600"
                                onClick={() => handleFriendRequest(request.id, "accept")}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderBlockedList = () => {
        if (blockedUsers.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-6">
                    <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You haven&apos;t blocked any users</p>
                </div>
            );
        }

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {blockedUsers.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={user?.user?.avatars[0]?.imageUrl} />
                                <AvatarFallback>
                                    {(user.displayName || user.username)?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{user.displayName || user.username}</p>
                                <p className="text-sm text-muted-foreground">@{user.displayName}</p>
                                <Badge variant="outline" className="bg-red-100 text-red-700 mt-1">
                                    Blocked
                                </Badge>
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
        );
    };

    // Function to render the add friend dialog
    const renderAddFriendDialog = () => {
        return (
            <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
                <DialogContent>
                    <AlertDialogHeader>
                        <DialogTitle>Add Friend</DialogTitle>
                        <DialogDescription>
                            Enter the username of the person you want to add as a friend.
                        </DialogDescription>
                    </AlertDialogHeader>
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
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setAddFriendOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={sendFriendRequest}
                            disabled={isSubmitting || !friendUsername.trim()}
                        >
                            {isSubmitting ? "Sending..." : "Send Request"}
                        </Button>
                    </AlertDialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

    // Function to render confirmation dialog for actions
    const renderConfirmationDialog = () => {
        return (
            <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === "remove"
                                ? "Remove Friend"
                                : actionType === "block"
                                    ? "Block User"
                                    : "Unblock User"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === "remove" &&
                                "Are you sure you want to remove this friend? You'll need to send a new friend request to connect again."}
                            {actionType === "block" &&
                                "Are you sure you want to block this user? They won't be able to contact you or see your profile."}
                            {actionType === "unblock" &&
                                "Are you sure you want to unblock this user? They'll be able to send you friend requests again."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUserAction}
                            className={
                                actionType === "block" ? "bg-red-600 hover:bg-red-700" : ""
                            }
                        >
                            {actionType === "remove"
                                ? "Remove"
                                : actionType === "block"
                                    ? "Block"
                                    : "Unblock"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    return (
        <div>

            <Card className="w-[100%]">
                <Tabs defaultValue="friends">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle>Social</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddFriendOpen(true)}
                            >
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
                            {renderFriendsList()}
                        </TabsContent>

                        <TabsContent value="requests" className="m-0">
                            {renderRequestsList()}
                        </TabsContent>

                        <TabsContent value="blocked" className="m-0">
                            {renderBlockedList()}
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
            {/* Dialogs */}
            {renderAddFriendDialog()}
            {renderConfirmationDialog()}
        </div>
    )
}

export default Friends
