const express = require('express');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// Set up MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'appealdb', // Replace with your actual database name
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err);
  } else {
    console.log('Connected to MySQL!');
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'your_secret_key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
  })
);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session: ', err);
    }
    res.redirect('/');
  });
});

app.get('/logout1', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session: ', err);
    }
    res.render('adminlogin');
  });
});

app.get('/Admin', (req, res) => {
  res.render('adminlogin');
});

app.get('/view_users', (req, res) => {
  res.render('view_users');
});

app.get('/admin1', (req, res) => {
  res.render('admin');
});



app.get('/', (req, res) => {
  res.render('login', { loginError: '' });
});

app.get('/register', (req, res) => {
  res.render('register', { errors: [] });
});

app.post('/adminlogin', (req, res) => {
  const { username, password } = req.body;

  // Check user credentials in MySQL database
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error logging in: ', err);
      return res.render('adminlogin', { loginError: 'Invalid username or password' });
    }

    // Store user information in session
    req.session.user = results[1];

    // Redirect to profile page with user information
    res.render('admin', { user: req.session.user });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check user credentials in MySQL database
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error logging in: ', err);
      return res.render('login', { loginError: 'Invalid username or password' });
    }

    // Store user information in session
    req.session.user = results[0];

    // Redirect to profile page with user information
    res.render('profile', { user: req.session.user });
  });
});



app.post(
  '/register',
  [
    check('username').isLength({ min: 2 }).matches(/^[a-zA-Z]+$/, 'g').withMessage('Minimum 2 characters, no numbers'),
    check('regNumber').isLength({ min: 13, max: 13 }).isNumeric().withMessage('Exactly 13 digits, numbers only'),
    check('course').isString().withMessage('Invalid course format'),
    check('password').isLength({ min: 8 }).withMessage('Minimum 8 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('register', { errors: errors.array() });
    }

    const { username, regNumber, course, password } = req.body;

    // Insert user into MySQL database
    const registerQuery = 'INSERT INTO users (username, regNumber, course, password) VALUES (?, ?, ?, ?)';
    connection.query(registerQuery, [username, regNumber, course, password], (registerErr) => {
      if (registerErr) {
        console.error('Error registering user: ', registerErr);
        return res.render('register', { registrationError: 'Registration failed' });
      }

      res.render('register', { registrationSuccess: true });
    });
  }
);

app.get('/profile', (req, res) => {
  // Fetch user information and appeals from the database
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    return res.redirect('/');
  }

  const userProfileQuery = 'SELECT * FROM users WHERE id = ?';
  const userAppealsQuery = 'SELECT * FROM appeals WHERE userId = ?';

  connection.query(userProfileQuery, [userId], (profileErr, profileResults) => {
    if (profileErr || profileResults.length === 0) {
      console.error('Error fetching user profile: ', profileErr);
      return res.render('error', { errorMessage: 'Error fetching user profile' });
    }

    const user = profileResults[0];

    connection.query(userAppealsQuery, [userId], (appealsErr, appealsResults) => {
      if (appealsErr) {
        console.error('Error fetching user appeals: ', appealsErr);
        return res.render('error', { errorMessage: 'Error fetching user appeals' });
      }

      const appeals = appealsResults || [];

      res.render('profile', { user, appeals });
    });
  });
});

app.get('/appeal', (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect('/'); // Redirect to login if not logged in
  }

  // Render the appeal page with user information
  res.render('appeal', { user: req.session.user });
});

app.post(
  '/submit-appeal',
  [
    check('name').isString().withMessage('Invalid name format'),
    check('regNumber').isLength({ min: 13, max: 13 }).isNumeric().withMessage('Exactly 13 digits, numbers only'),
    check('course').isString().withMessage('Invalid course format'),
    check('letter').notEmpty().withMessage('Please upload a letter'),
    check('reason').isString().withMessage('Invalid reason format'),
  ],
  (req, res) => {
    const { name, regNumber, course, letter, reason } = req.body;
    const userId = req.session.user ? req.session.user.id : null;

    if (!userId) {
      return res.redirect('/');
    }

    // Validate form data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('appeal', { user: req.session.user, errors: errors.array() });
    }

    // Process the uploaded PDF file (you may need to handle this based on your requirements)

    // Insert appeal into MySQL database
    const insertAppealQuery = 'INSERT INTO appeals (name, regNumber, course, reason, letterPath, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, CURDATE())';
    connection.query(
      insertAppealQuery,
      [name, regNumber, course, reason, 'path_to_uploaded_pdf', userId], // Replace with the actual path
      (insertErr) => {
        if (insertErr) {
          console.error('Error inserting appeal: ', insertErr);
          return res.render('appeal', { user: req.session.user, submissionError: 'Failed to submit appeal' });
        }

        // Redirect back to the profile page after submission
        res.render('submit-success', { user: req.session.user });
      }
    );
  }
);



// ... Other routes

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
