require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log("ENV CHECK:", process.env.MONGODB_URI ? "FOUND" : "MISSING");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Models
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    profilePic: { type: String, default: 'https://via.placeholder.com/150' },
    createdAt: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['available', 'rented'], default: 'available' },
    createdAt: { type: Date, default: Date.now }
});

// Add Rental model
const RentalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: Number, required: true },  // Changed from ObjectId to Number
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String },
    status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Rejected'], 
        default: 'Pending' 
    },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Item = mongoose.model('Item', ItemSchema);
const Rental = mongoose.model('Rental', RentalSchema);

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Incoming token:', token); // Add this line
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET || 'rentease', (err, user) => {
        if (err) {
            console.error('JWT verification error:', err); // Add this line
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}

// Routes
// Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check for existing user
        const existingUser = await User.findOne({ $or: [{ email }, { name }] });
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({ message: `${field} already in use` });
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword 
        });
        await newUser.save();

        // Generate token
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            process.env.JWT_SECRET || 'rentease',
            { expiresIn: '1h' }
        );

        res.status(201).json({ 
            token,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'rentease',
            { expiresIn: '1h' }
        );

        res.json({ 
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// User Routes
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

app.put('/api/user', authenticateToken, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            req.body,
            { new: true }
        ).select('-password');
        
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user data' });
    }
});

app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { profilePic: `/uploads/${req.file.filename}` },
            { new: true }
        ).select('-password');
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ message: 'Error updating avatar' });
    }
});

// Item Routes
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        console.log(`Fetching items for user ${req.user.userId}`);
        const items = await Item.find({ owner: req.user.userId });
        if (!items || items.length === 0) {
            console.log('No items found for user');
            return res.json([]); // Return empty array instead of 404
        }
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items' });
    }
});
// Change this endpoint to handle file uploads
app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        const { title, description, price, location, category, imageUrl } = req.body;
        
        console.log('Authenticated user:', req.user); // Add this line
        
        
        console.log('Request body:', req.body);

        // Validate all fields
        const requiredFields = {
            title: 'Title is required',
            description: 'Description is required',
            price: 'Price is required',
            location: 'Location is required',
            category: 'Category is required',
            imageUrl: 'Image URL is required'
        };
        
        for (const [field, message] of Object.entries(requiredFields)) {
            if (!req.body[field]) {
                return res.status(400).json({ message });
            }
        }

        // Validate price is a positive number
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({ message: 'Price must be a positive number' });
        }

        // Validate image URL
        try {
            new URL(imageUrl);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid image URL format' });
        }

        // Create the item
        const newItem = new Item({
            title,
            description,
            price: Number(price),
            location,
            category,
            image: imageUrl,
            owner: req.user.userId
        });

        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ 
            message: 'Error creating item',
            error: error.message 
        });
    }
});

// Update item endpoint
app.put('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        console.log('Incoming update for item:', req.params.id);
        console.log('Update data:', req.body);
        console.log('Updating user:', req.user.userId);

        // Verify the item exists and belongs to the user
        const existingItem = await Item.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!existingItem) {
            console.log('Item not found or not owned by user');
            return res.status(404).json({ message: 'Item not found or not owned by you' });
        }

        const { title, description, price, location, category, imageUrl } = req.body;

        // Optional: Validate fields if you require them in updates (I recommend at least price and title)
        if (price && (isNaN(price) || price <= 0)) {
            return res.status(400).json({ message: 'Price must be a positive number' });
        }

        if (imageUrl) {
            try {
                new URL(imageUrl);
            } catch (err) {
                return res.status(400).json({ message: 'Invalid image URL format' });
            }
        }

        // Update fields (only if provided)
        if (title) existingItem.title = title;
        if (description) existingItem.description = description;
        if (price) existingItem.price = Number(price);
        if (location) existingItem.location = location;
        if (category) existingItem.category = category;
        if (imageUrl) existingItem.image = imageUrl;

        const updatedItem = await existingItem.save();
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
});

// Delete item endpoint
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const deletedItem = await Item.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Error deleting item' });
    }
});

// Add rental endpoints
app.post('/api/rentals', authenticateToken, async (req, res) => {
    try {
        const { itemId, title, price, image, location } = req.body;
        
        // Validate required fields
        if (!itemId || !title || !price || !image || !location) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create rental with random status for demo
        const statuses = ['Pending', 'Accepted', 'Rejected'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const rental = new Rental({
            user: req.user.userId,
            itemId: Number(itemId), // Ensure it's a number
            title,
            price,
            image,
            location,
            description: req.body.description,
            status
        });

        await rental.save();

        res.status(201).json(rental);
        
    } catch (error) {
        console.error('Create rental error:', error);
        res.status(500).json({ 
            message: 'Error creating rental',
            error: error.message 
        });
    }
});
// Rental Routes
app.get('/api/rentals', authenticateToken, async (req, res) => {
    try {
        const rentals = await Rental.find({ user: req.user.userId });
        res.json(rentals);
    } catch (error) {
        console.error('Error fetching rentals:', error);
        res.status(500).json({ message: 'Error fetching rentals' });
    }
});

// DELETE /api/rentals/:id - Cancel a rental
app.delete('/api/rentals/:id', authenticateToken, async (req, res) => {
    try {
        const rentalId = req.params.id;
        const userId = req.user.userId;

        // Find and delete the rental, ensuring it belongs to the user
        const deletedRental = await Rental.findOneAndDelete({
            _id: rentalId,
            user: userId
        });

        if (!deletedRental) {
            return res.status(404).json({ 
                success: false,
                message: 'Rental not found or you do not have permission to cancel it'
            });
        }

        res.json({ 
            success: true,
            message: 'Rental cancelled successfully'
        });

    } catch (error) {
        console.error('Error cancelling rental:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to cancel rental',
            error: error.message
        });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error("MongoDB connection error:", err));