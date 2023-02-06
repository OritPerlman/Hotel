import express, { Request, Response } from 'express';
import { Room } from './model';
import request from 'request';
import amqp from 'amqplib';

const app = express();
app.use(express.json());

let channel: amqp.ConfirmChannel;

// Connect to RabbitMQ
(async () => {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        channel = await connection.createConfirmChannel();
    } catch (err) {
        console.error(err);
    }
})();

// Public API for creating/deleting/viewing a room and entering/exiting a room
app.post('/rooms', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const room = await Room.create({ name });
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/rooms/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/rooms/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        await room.destroy();
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/rooms/:id/enter', async (req: Request, res: Response) => {
    try {
        // Validate input
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        // Check if room exists
        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        // Check if user is allowed to enter the room
        const options = {
            url: `http://userservice:3000/users/${userId}`,
            method: 'GET',
        };
        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                console.log(error);
                return res.status(404).json({ message: 'User not found' });
            }
            const user = JSON.parse(body);
            if (!user.canEnterRoom(room)) {
                return res.status(401).json({ message: 'User is not allowed to enter this room' });
            }
            // Add user to the room
            await room.addUser(user);
            // Send event to RabbitMQ
            const userData = { id: userId, email: user.email };
            const buffer = Buffer.from(JSON.stringify(userData));
            channel.sendToQueue('user_entered_room', buffer);
            // Send response to client
            res.json({ message: 'User entered room' });
            // Make an HTTP request to the User service to update the user's status
            const options = {
                url: `http://userservice:3000/users/${userId}/status`,
                method: 'PUT',
                json: { status: 'entered' }
            };
            request(options, (error: any, response: any, body: any) => {
                if (error) {
                    console.log(error);
                }
            });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/rooms/:id/exit', async (req: Request, res: Response) => {
    try {
        // Validate input
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        // Check if room exists
        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        const options = {
            url: `http://userservice:3000/users/${userId}/room`,
            method: 'GET',
        };
        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                console.log(error);
                return res.status(404).json({ message: 'User not found' });
            }
            const roomId = JSON.parse(body);
            if(roomId !== id){
                return res.status(401).json({ message: 'User is not in this room' });
            }
            await room.removeUser(userId);
            const options = {
                url: `http://userservice:3000/users/${userId}/status`,
                method: 'PUT',
                json: { status: 'exited' }
            };
            request(options, (error: any, response: any, body: any) => {
                if (error) {
                    console.log(error);
                }
            });
            res.json({ message: 'User exited room' });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
