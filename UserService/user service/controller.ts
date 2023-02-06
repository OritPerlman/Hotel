import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './model.ts';

const app = express();
app.use(express.json());

app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.headers;
        const { id } = jwt.verify(token, 'secret');
        req.user = { id };
        next();
    } catch (err) {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// Public API for user registration and authorization
app.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.create({ email, password });
        const token = jwt.sign({ id: user.id }, 'secret');
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/users', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User.create({ email, password });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'User created', token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const valid = await user.isValidPassword(password);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id }, 'secret');
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/rooms/:id/users/:userId/:status', async (req: Request, res: Response) => {
    try {
        const { id, userId, status } = req.params;
        const room   = {
            url: `http://userservice:3001/rooms/${userId}/room`,
            method: 'GET',
        };
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if(req.headers.authorization !== 'Bearer YOUR_SECRET_JWT_TOKEN'){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if(status === 'entered'){
            const options = {
                url: `http://userservice:3001/rooms/${userId}/status`,
                method: 'POST',
                json: { status: 'entered' }
            };
            res.json({ message: 'User entered room' });
        }
        else if(status === 'exited'){
            const options = {
                url: `http://userservice:3001/rooms/${userId}/status`,
                method: 'POST',
                json: { status: 'exited' }
            };            res.json({ message: 'User exited room' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/users/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const user = await User.findByPk(id);
        user.status = status;
        await user.save();
        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/users/:id/room', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const roomId = user.roomId;
        res.json({ roomId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
