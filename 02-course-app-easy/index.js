const express = require('express');
const app = express();

app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

function authorizeAdmin(req, res, next) {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }
  const admin = ADMINS.find((admin) => admin.username === username);

  if (!admin || admin.password != password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  next();
}
function authorizeUser(req, res, next) {
  const { username, password } = req.headers;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }
  const user = USERS.find((user) => user.username === username);

  if (!user || user.password != password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  req.user = user;
  next();
}

// Admin routes
app.post('/admin/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }
  ADMINS.push({ username, password });
  return res.status(200).json({ message: 'Admin created successfully' });
});

app.post('/admin/login', authorizeAdmin, (req, res) => {
  return res.status(200).json({ message: "Logged in successfully" });
});

app.post('/admin/courses', authorizeAdmin, (req, res) => {
  const { title, description, price, imageLink, published } = req.body;
  if (title == "" || description == "" || price == "" || imageLink == "" || published == undefined) {
    return res.status(406).json({ message: 'All fields are required' });
  }
  const courseId = COURSES.length;
  COURSES.push({ courseId, title, description, price, imageLink, published });
  return res.status(200).json({ message: 'Course created successfully' });
});

app.put('/admin/courses/:courseId', authorizeAdmin, (req, res) => {
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
  return res.status(200).json({ message: 'Course updated successfully' });
});

app.get('/admin/courses', authorizeAdmin, (req, res) => {
  return res.status(200).json({ COURSES });
});

// User routes
app.post('/users/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(406).json({ message: 'Username and password are required' });
  }
  const purchasedCourses = [];
  USERS.push({ username, password, purchasedCourses });
  return res.status(200).json({ message: 'User created successfully', USERS });
});

app.post('/users/login', authorizeUser, (req, res) => {
  return res.status(200).json({ message: "Logged in successfully" });
});

app.get('/users/courses', authorizeUser, (req, res) => {
  const courses = COURSES.filter((course) => course.published === true);
  if (!courses) {
    return res.status(404).json({ message: 'No courses found' });
  }
  return res.status(200).json({ courses });
});

app.post('/users/courses/:courseId', authorizeUser, (req, res) => {
  const courseId = req.params.courseId;
  if (isNaN(courseId)) {
    res.status(400).json({ message: 'Invalid course ID' });
  }
  const course = COURSES.find((course) => course.id === Number(courseId));
  console.log("Course ", course)
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }
  const user = USERS.find((user) => user.username === req.user.username);

  user.purchasedCourses.push(course);
  return res.status(200).json({ message: 'Course purchased successfully', USERS });
});

app.get('/users/purchasedCourses', authorizeUser, (req, res) => {
  const user = USERS.find(user => user.username === req.user.username);
  return res.status(200).json({ purchasedCourses: user.purchasedCourses })
});

app.listen(3000, () => {
  console.log(`Server is listening on port http://localhost:3000`);
});
