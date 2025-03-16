"use client";

import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import Friends from "./_components/Friends";
import Space from './_components/Space';



export default function Dashboard() {
    const { data: session } = useSession();


    return (
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Button
                        onClick={() => signOut({ callbackUrl: "/auth/login" })}
                        className="flex items-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Info Card */}
                    <Card className="h-fit">
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
                                    {/* <AvatarImage src={session?.user?.imageUrl || undefined} /> */}
                                    <AvatarFallback>
                                        {session?.user?.username?.[0] || session?.user?.name?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-muted-foreground">@{session?.user?.name}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-medium">Email:</span>
                                    <span>{session?.user?.email || "Not available"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">User ID:</span>
                                    <span className="text-muted-foreground text-sm">
                                        {session?.user?.id || "Not available"}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Friends List */}
                    <div className="col-span-2 flex flex-col">
                        <div className="min-h-[calc(100%-1rem)] h-full">
                            <Friends />
                        </div>
                    </div>
                </div>
                <Space />
            </div>
        </div>

    )
}
