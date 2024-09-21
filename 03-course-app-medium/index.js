const express = require('express');
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

try {
  ADMINS = JSON.parse(fs.readFileSync('admins.json', 'utf8'));
  USERS = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  COURSES = JSON.parse(fs.readFileSync('courses.json', 'utf8'));
} catch {
  ADMINS = [];
  USERS = [];
  COURSES = [];
}
console.log(ADMINS);
const jwtSecret = '03-course-app-medium';

const authorizeAdmin = async (req, res, next) => {
  const token = req.headers?.authorization.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  };
  const decodedToken = await jwt?.verify(token, jwtSecret);
  if (!decodedToken.username) {
    return res.status(401).json({ message: 'Unauthorized Request.' });
  }
  const admin = ADMINS.find(admin => admin.username === decodedToken.username);

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
  const user = USERS.find(user => user.username === decodedToken.username);

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
  ADMINS.push({ username, password });

  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
  await fs.writeFile('admins.json', JSON.stringify(ADMINS), (err) => console.log(err));

  return res.status(200).json({ message: 'Admin created successfully', token });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  const admin = ADMINS.find((admin) => admin.username === username);
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

  const courseId = COURSES.length;
  COURSES.push({ courseId, title, description, price, imageLink, published });

  await fs.writeFile('courses.json', JSON.stringify(COURSES), (err) => console.log(err));

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
  const course = COURSES.find((course) => course.courseId == courseId);
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }
  course.title = title;
  course.description = description;
  course.price = price;
  course.imageLink = imageLink;
  course.published = published;

  await fs.writeFile('courses.json', JSON.stringify(COURSES), (err) => console.log(err));
  return res.status(200).json({ message: 'Course updated successfully', COURSES });
});

app.get('/admin/courses', (req, res) => {
  res.status(200).json(COURSES);
});

// User routes
app.post('/users/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }

  USERS.push({ username, password, purchasedCourses: [] });

  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
  await fs.writeFile('users.json', JSON.stringify(USERS), (err) => console.log(err));

  return res.status(200).json({ message: 'User created successfully', token });
});

app.post('/users/login', async (req, res) => {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }
  const user = USERS.find((admin) => admin.username === username);

  const token = await jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });

  if (!user || user.password != password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  return res.status(200).json({ message: 'Logged in successfully', token });
});

app.get('/users/courses', authorizeUser, (req, res) => {
  const courses = COURSES.filter((course) => course.published === true);

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

  const course = COURSES.find((course) => course.courseId === Number(courseId));
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  const user = USERS.find((user) => user.username === req.user.username);
  user.purchasedCourses.push(course);

  await fs.writeFile('users.json', JSON.stringify(USERS), (err) => console.log(err));
  return res.status(200).json({ message: 'Course purchased successfully', USERS });
});

app.get('/users/purchasedCourses', authorizeUser, (req, res) => {
  const user = USERS.find(user => user.username === req.user.username);
  return res.status(200).json({ purchasedCourses: user.purchasedCourses });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
