const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");

const users = [
  { id: 1, email: "bob@yahoo.com", password: "password" },
  { id: 2, email: "john@yahoo.com", password: "password" },
  { id: 3, email: "kevin@yahoo.com", password: "password" },
];

const client = new Redis({});
const store = new RedisStore({ client });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "mysecret$",
    name: "sid",
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
      sameSite: true,
    },
  })
);

app.use((req, res, next) => {
  if (req.session.userId) {
    req.user = users.find((user) => user.id === req.session.userId);
  }

  return next();
});

const ensureAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/home");
  }

  return next();
};

const ensureAuthorized = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  return next();
};

app.get("/", (req, res, next) => {
  if (req.session.page_count) {
    console.log(req.session);
    req.session.page_count++;
    res.send(`You visited the page ${req.session.page_count} times.`);
  } else {
    console.log(req.session);
    req.session.page_count = 1;
    res.send("Welcome to this page for the first time!");
  }
});

app.get("/register", ensureAuthenticated, (req, res) => {
  return res.send(`
        <form method="post" action="/register">
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <input type="submit" />
        </form>
    `);
});

app.get("/login", ensureAuthenticated, (req, res) => {
  return res.send(`
        <form method="post" action="/login">
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <input type="submit" />
        </form>
    `);
});

app.get("/home", ensureAuthorized, (req, res, next) => {
  const { email } = req.user;

  return res.send(`
        Logged in as ${email}

        <form method="post" action="/logout">
            <button type="submit">Logout</button>
        </form>
    `);
});

app.post("/register", (req, res, next) => {
  const { email, password } = req.body;

  // # HASH PASSWORD + PROPER VALIDATION
  if (email && password) {
    // # VALIDATION
    const isExist = users.find((user) => user.email === email);

    // # NO USER EXIST
    if (!isExist) {
      const user = { id: users.length + 1, email, password };
      users.push(user);
      req.session.userId = user.id;
      return res.redirect("/home");
    }
  }
});

app.post("/login", (req, res, next) => {
  const { email, password } = req.body;

  if (email && password) {
    const user = users.find(
      (user) => user.email === email && user.password === password
    );

    if (user) {
      // # save our user id to session
      req.session.userId = user.id;
      return res.redirect("/home");
    }
  }
});

app.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (!err) {
      res.clearCookie("sid");
      res.redirect("/login");
    }
  });
});

app.listen(5000, () => console.log("Server is on port 5000"));
