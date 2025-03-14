import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Configuration - use environment variables when available
const JWT_SECRET = process.env.JWT_SECRET || 'iamthepapaofmybabaiesuiwsdcverfghbnthjnmpoiuhytgfrsdcvb';
const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.WEBSOCKET_URL || `ws://localhost:${PORT}/ws`;

// Utility to create JWT tokens for testing
function createToken(userId: string, username: string, role: string = 'user'): string {
    return jwt.sign({ id: userId, username, role }, JWT_SECRET);
}

// Test user data - ensure these IDs exist in your database or are handled by your mock
const testUsers = [
    {
        "id": "cm85sfm0w0000i0n17axkzvic",
        "username": "testuser",
        "displayName": "Test User",
        "bio": "This is a test bio",
        "role": "User",
    },
    {
        "id": "cm877ccr10000i0zzlk4ypp14",
        "username": "testuse12r1",
        "displayName": "Test User",
        "email": "testu12ser@example.com",
        "role": "User",
    },
];

// Test space data - ensure these IDs exist in your database or are handled by your mock
const testSpace = {
    id: "cm877i3ih0001i0zzhqsv61wo",
    instanceId: "cm88wooe40001i0ogl71iktws",
};

// Connect a WebSocket client with the given user
function connectClient(user: typeof testUsers[0]): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const token = createToken(user.id, user.username, user.role);
        console.log(`Connecting user ${user.username} (${user.id}) with token: ${token.substring(0, 15)}...`);
        const ws = new WebSocket(`${SERVER_URL}?token=${token}`);

        ws.on('open', () => {
            console.log(`Client connected: ${user.username}`);
            resolve(ws);
        });

        ws.on('error', (error) => {
            console.error(`Connection error (${user.username}):`, error);
            reject(error);
        });

        // Add message handler for debugging
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[${user.username}] Received:`, message);
            } catch (error) {
                console.error(`[${user.username}] Failed to parse message:`, data.toString());
            }
        });
    });
}

// Wait for a specific message type with improved error handling
function waitForMessage(ws: WebSocket, type: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for message type: ${type}`));
        }, timeout);

        const messageHandler = (data: WebSocket.Data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === type) {
                    clearTimeout(timer);
                    ws.removeListener('message', messageHandler);
                    resolve(message);
                }
            } catch (error) {
                console.error('Error parsing message:', error, data.toString());
            }
        };

        ws.on('message', messageHandler);
    });
}

// Send a message and wait for a response
async function sendAndWait(ws: WebSocket, message: any, responseType: string): Promise<any> {
    const responsePromise = waitForMessage(ws, responseType);
    const messageStr = JSON.stringify(message);
    console.log('Sending message:', messageStr);
    ws.send(messageStr);
    return responsePromise;
}

// Run all tests
async function runTests() {
    console.log('Starting WebSocket server tests...');
    console.log('Server URL:', SERVER_URL);

    let client1: WebSocket | null = null;
    let client2: WebSocket | null = null;

    try {
        // Test 1: Connect clients
        console.log('\n📋 TEST 1: Connect clients');
        client1 = await connectClient(testUsers[0]);
        client2 = await connectClient(testUsers[1]);
        console.log('✅ Both clients connected successfully');

        // Test 2: Join space
        console.log('\n📋 TEST 2: Join space');
        const joinMessage = {
            type: 'joinSpace',
            spaceId: testSpace.id,
            instanceId: testSpace.instanceId
        };

        // Join space with first client
        const joinResponse1 = await sendAndWait(client1, joinMessage, 'joinSpaceConfirm');
        console.log('✅ Client 1 joined space:', joinResponse1);

        // Join space with second client
        const joinResponse2 = await sendAndWait(client2, joinMessage, 'joinSpaceConfirm');
        console.log('✅ Client 2 joined space:', joinResponse2);

        // Wait for space users message for client 2
        const spaceUsers = await waitForMessage(client2, 'spaceUsers');
        console.log('✅ Client 2 received space users:', spaceUsers);

        // Test 3: Update position
        console.log('\n📋 TEST 3: Update position');
        const positionMessage = {
            type: 'updatePosition',
            spaceId: testSpace.id,
            instanceId: testSpace.instanceId,
            x: 100,
            y: 150,
            z: 200,
            rotationX: 0,
            rotationY: 45,
            rotationZ: 0
        };

        client1.send(JSON.stringify(positionMessage));

        // Client 2 should receive the position update
        const positionUpdate = await waitForMessage(client2, 'userPresenceUpdate');
        console.log('✅ Client 2 received position update:', positionUpdate);

        // Test 4: Send chat message
        console.log('\n📋 TEST 4: Send chat message');
        const chatMessage = {
            type: 'sendChatMessage',
            content: 'Hello, this is a test message!',
            spaceId: testSpace.id
        };

        client1.send(JSON.stringify(chatMessage));

        // Client 2 should receive the chat message
        const receivedChatMessage = await waitForMessage(client2, 'chatMessage');
        console.log('✅ Client 2 received chat message:', receivedChatMessage);

        // Test 5: Update status
        console.log('\n📋 TEST 5: Update status');
        const statusMessage = {
            type: 'updateStatus',
            status: 'Busy'
        };

        const statusResponse = await sendAndWait(client1, statusMessage, 'statusUpdateConfirm');
        console.log('✅ Client 1 status updated:', statusResponse);

        // Client 2 should receive the status update
        const statusUpdate = await waitForMessage(client2, 'userPresenceUpdate');
        console.log('✅ Client 2 received status update:', statusUpdate);

        // Test 6: Direct message
        console.log('\n📋 TEST 6: Direct message');
        const directMessage = {
            type: 'sendChatMessage',
            content: 'This is a direct message',
            recipientId: testUsers[1].id
        };

        client1.send(JSON.stringify(directMessage));

        // Client 2 should receive the direct message
        const receivedDirectMessage = await waitForMessage(client2, 'chatMessage');
        console.log('✅ Client 2 received direct message:', receivedDirectMessage);

        // Test 7: Leave space
        console.log('\n📋 TEST 7: Leave space');
        const leaveMessage = {
            type: 'leaveSpace',
            spaceId: testSpace.id,
            instanceId: testSpace.instanceId
        };

        const leaveResponse = await sendAndWait(client1, leaveMessage, 'leaveSpaceConfirm');
        console.log('✅ Client 1 left space:', leaveResponse);

        // Client 2 should receive the leave notification
        const leaveNotification = await waitForMessage(client2, 'userPresenceUpdate');
        console.log('✅ Client 2 received leave notification:', leaveNotification);

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');

        if (client1) {
            client1.close();
            console.log('Client 1 disconnected');
        }

        if (client2) {
            client2.close();
            console.log('Client 2 disconnected');
        }
    }
}

// Start the tests
console.log('WebSocket Server Test');
console.log('====================');
runTests();
