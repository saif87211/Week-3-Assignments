const express = require('express');
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const userSChema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  purchasedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
}, { timestamps: true });
const User = mongoose.model("User", userSChema);

const adminSChema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
}, { timestamps: true });
const Admin = mongoose.model("Admin", adminSChema);

const courseSChema = new mongoose.Schema({
  title: { type: String, required: true, },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageLink: { type: String, required: true },
  published: { type: Boolean, required: true },
}, { timestamps: true });
const Course = mongoose.model("Course", courseSChema);

mongoose.connect("mongodb+srv://admin:01%40Admin@cluster0.hlsrdz8.mongodb.net/test")
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

const app = express();

const jwtSecret = '04-course-app-hard';

app.use(express.json());
const authorizeAdmin = async (req, res, next) => {
  const token = req.headers?.authorization.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  };
  const decodedToken = await jwt?.verify(token, jwtSecret);
  if (!decodedToken.username) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  }
  const admin = Admin.findOne({ username: decodedToken.username });

  if (!admin) {
    res.status(401).json({ message: 'Unauthorized Request.' });
  }
  next();
};
const authorizeUser = async (req, res, next) => {
  const token = req.headers?.authorization.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  };
  const decodedToken = await jwt.verify(token, jwtSecret);
  if (!decodedToken.username) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  }
  const user = User.findOne({ username: decodedToken.username });

  if (!user) {
    res.status(401).json({ message: 'Unauthorized Request.' });
  }
  req.user = user;
  next();
};
// Admin routes
app.post('/admin/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  const admin = await Admin.create({ username, password });
  if (!admin) {
    res.send(400).json({ message: 'Internal Server error' });
  }
  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
  return res.status(200).json({ message: 'Admin created successfully', token });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  const admin = await Admin.findOne({ username });
  if (!admin || admin.password != password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
  return res.status(200).json({ message: 'Logged in successfully', token });
});

app.post('/admin/courses', authorizeAdmin, async (req, res) => {
  const { title, description, price, imageLink, published } = req.body;
  if (title == "" || description == "" || price == "" || imageLink == "" || published == undefined) {
    return res.status(406).json({ message: 'All fields are required' });
  }

  const course = await Course.create({ title, description, price, imageLink, published });

  if (!course) {
    res.status(400).json({ message: 'Internal Server error' });
  }
  return res.status(200).json({ message: 'Course created successfully' });
});

app.put('/admin/courses/:courseId', authorizeAdmin, async (req, res) => {
  const courseId = req.params.courseId;
  if (isNaN(courseId)) {
    res.status(400).json({ message: 'Invalid course ID' });
  }
  const { title, description, price, imageLink, published } = req.body;
  if (title == "" || description == "" || price == "" || imageLink == "" || published == undefined) {
    return res.status(406).json({ message: 'All fields are required' });
  }
  const course = await Course.findOneAndUpdate(courseId, {
    $set: {
      title,
      description,
      price,
      imageLink,
      published
    }
  }, { new: true },);
  return res.status(200).json({ message: 'Course updated successfully', course });
});

app.get('/admin/courses', authorizeAdmin, async (req, res) => {
  const course = await Course.find();
  return res.status(200).json({ course });
});

// User routes
app.post('/users/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  const user = await User.create({ username, password, purchasedCourses: [] });
  if (!user) {
    res.send(400).json({ message: 'Internal Server error' });
  }
  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });

  return res.status(200).json({ message: 'User created successfully', token });
});

app.post('/users/login', async (req, res) => {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user || user.password != password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
  return res.status(200).json({ message: 'Logged in successfully', token });
});

app.get('/users/courses', authorizeUser, async (req, res) => {
  const courses = Course.find({ published: true });
  if (!courses) {
    return res.status(404).json({ message: 'No courses found' });
  }
  return res.status(200).json({ courses });
});

app.post('/users/courses/:courseId', authorizeUser, async (req, res) => {
  const courseId = req.params.courseId;
  if (isNaN(courseId)) {
    res.status(400).json({ message: 'Invalid course ID' });
  }

  const course = Course.findOne({ courseId });
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  const user = await User.findOneAndUpdate({ username: req.user.username }, {
    $push: { purchasedCourses: course }
  }, { new: true });

  return res.status(200).json({ message: 'Course purchased successfully', user });
});

app.get('/users/purchasedCourses', authorizeUser, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });
  return res.status(200).json({ purchasedCourses: user.purchasedCourses });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
