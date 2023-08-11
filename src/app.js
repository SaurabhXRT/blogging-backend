const express = require("express");
const app = express();
const session = require("express-session");
const PORT = process.env.PORT || 3000;
const hbs = require("hbs");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const User = require("./model/userModel");
const Article = require("./model/articlePost");
const Comment = require("./model/commentModel");
const crypto = require("crypto");
const secretKey = crypto.randomBytes(32).toString("hex");
console.log(secretKey);

// Custom helper function to format the date as "dd/mm/yyyy"
hbs.registerHelper("formatDate", (date) => {
  const formattedDate = new Date(date).toLocaleDateString("en-GB");
  return formattedDate;
});

// Set up express-session
app.use(
  session({
    secret: "40b9ab0a7eb539acaf148d2ac4a417c22aa6443324a473b8b70a3c5f8eac6d0f",
    resave: false,
    saveUninitialized: true,
  })
);

//require('dotenv').config()
//dotenv.config();

// Middleware function to check if the user is authenticated
const checkAuth = (req, res, next) => {
  if (req.session && req.session.username) {
    res.locals.username = req.session.username; 
    return next(); 
  } else { 
    return res.redirect("/login");
  }
};

//multer to store image
/*const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/uploads");
    },
    filename: function (req, file, cb) {
      const filename = Date.now() + path.extname(file.originalname);
      const url = path.join("/uploads", filename).replace(/\\/g, "/");
      cb(null, filename, url);
    },
  }),
});*/

const uploadsPath = path.join(__dirname, 'public/uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
      const filename = Date.now() + path.extname(file.originalname);
      const url = path.join('/uploads', filename).replace(/\\/g, '/');
      cb(null, filename, url);
    },
  }),
});

app.use('/uploads', express.static(uploadsPath));

app.use(bodyParser.json());
//const uri = process.env.MONGO_URL;
const uri =
  "mongodb+srv://saurabhkumar:rVKACHYbuzYy7VMs@cluster0.n4zogin.mongodb.net/bloggingg?retryWrites=true&w=majority";

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const db = mongoose.connection;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  //we are connected
  console.log("we are connected...");
});

/*const adminUsername = "saurabhxrt";
const adminPassword = "prince";
(async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Check if the admin user already exists
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      // If the admin user does not exist, create it
      //const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: "Admin",
        username: adminUsername,
        password: adminPassword,
        isAdmin: true, // Set the isAdmin field to true for the admin user
      });
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists.");
    }

    // Close the database connection
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error creating admin user:", err);
  }
})();*/

app.use(express.static(path.join(__dirname, "../views")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const template_path = path.join(__dirname, "../views");

app.set("views", template_path);
app.set("view engine", "hbs");

app.get("/signup", (req, res) => {
  res.render("signup");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/article", checkAuth, (req, res) => {
  res.render("articlewrite");
});

app.get("/username", checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.username }).populate({
      path: 'articles',
      populate: { path: 'author', select: 'username' }
    });
    
    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("profile", { user });
  } catch (err) {
    console.log(err);
    res.send("Error loading profile.");
  }
});



app.get("/", async (req, res) => {
  try {
    const carouselArticles = await Article.find({ category: "education" })
      .limit(5)
      .populate("author", "username");

    const featuredArticles = await Article.find({
      category: "technology",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("author", "username");

    const latestArticle = await Article.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("author", "username");

    res.render("indexview", {
      carouselArticles,
      featuredArticles,
      latestArticle,
    });
  } catch (err) {
    console.log(err);
    res.send("Error fetching articles");
  }
});

app.post("/signuppost", async (req, res) => {
  try {
    const { name, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.send("Passwords don't match");
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send("Username already exists");
    }
    const newUser = new User({
      name,
      username,
      password,
    });

    await newUser.save();

    /* req.session.username = newUser.username;
    console.log(newUser);
    return res.redirect("/home");*/
    if (req.session.redirectTo) {
      const redirectTo = req.session.redirectTo; 
      delete req.session.redirectTo; 
      res.redirect(redirectTo); 
    } else {
      req.session.username = newUser.username;
      res.redirect("/home");
    }
  } catch (err) {
    console.log(err);
    return res.send("Error during signup");
  }
});

app.get("/home", checkAuth, async (req, res) => {
  /* const username = req.session.username;
   /* console.log(username);*/
  try {
   
    const carouselArticles = await Article.find({ articleCategory: "Carousel" , status: "Approved" })
      .limit(5)
      .populate("author", "username");

    const featuredArticles = await Article.find({ articleCategory: "Featured" , status: "Approved" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("author", "username");

    const latestArticle = await Article.find({ articleCategory: "Normal" , status: "Approved" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("author", "username");

    res.render("afterlogin", {
      carouselArticles,
      featuredArticles,
      latestArticle,
    });
  } catch (err) {
    console.log(err);
    res.send("Error fetching articles");
  }
});

app.post("/loginpost", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      res.send("User not found");
      return;
    }
    if (user.isAdmin && user.password === password) {
      req.session.username = user.username;
      res.redirect("/admin");
    }
    /* else if (!user.isAdmin && user.password === password) {
      req.session.username = user.username;
      res.redirect("/home");
    } */
    else if (!user.isAdmin && user.password === password) {
      if (req.session.redirectTo) {
        const redirectTo = req.session.redirectTo;
        delete req.session.redirectTo;
        req.session.username = user.username;
        return res.redirect(redirectTo); // Use return to prevent further execution
      } else {
        req.session.username = user.username;
        return res.redirect("/home"); // Use return to prevent further execution
      }
    }
     else {
      res.send("Invalid password");
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});




app.get("/admin", checkAuth, async (req,res) =>{
  try {
    const pendingArticles = await Article.find({ status: "Pending" })
      .sort({ createdAt: -1 })
      .populate("author", "username");

    res.render("admin", { pendingArticles });
  } catch (err) {
    console.log(err);
    res.send("Error fetching pending articles");
  }
});
app.post('/verifyArticle/:articleId', checkAuth, async (req, res) => {
  const { status, category } = req.body;
  const articleId = req.params.articleId;

  try {
    
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).send('Article not found.');
    }

    article.status = status;
    article.articleCategory = category;

    await article.save();

   // res.redirect('/admin');
   res.send("article verified");
  } catch (err) {
    console.error('Error verifying article:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.post(
  "/articlepost",
  upload.single("postimage"),
  checkAuth,
  async (req, res) => {
    try {
      const { title, category, article } = req.body;
      const postimage = req.file ? "/uploads/" + req.file.filename : null;

      const user = await User.findOne({ username: req.session.username });

      if (!user) {
        return res.status(404).send("User not found.");
      }
      const newArticle = new Article({
        title,
        category,
        article,
        postimage: postimage,
        author: user._id,
      });
      
      await newArticle.save();
      user.articles.push(newArticle._id);
      await user.save();
      const message = "Your article has been submitted for review. Please wait for verification.";
      res.json({ message });

     // res.redirect("/home");
    } catch (err) {
      console.log(err);
      res.send("Error posting article");
    }
  }
);

app.get("/:urlTitle", async (req, res) => {
  try {
   /* const articleId = req.params.id;
    const article = await Article.findById(articleId)*/
    const urlTitle = req.params.urlTitle;
    const article = await Article.findOne({ urlTitle })
      .populate("author", "username")
      .populate({
        path: "comments",
        populate: { path: "author", select: "username" },
        options: { sort: { createdAt: -1 }, strictPopulate: false },
      })
      .sort({ createdAt: -1 });
    if (!article) {
      return res.status(404).send("Article not found");
    }
    const featuredArticles = await Article.find({
      articleCategory: "Featured" , status: "Approved"
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("author", "username");

    const latestArticle = await Article.find({ articleCategory: "Normal" , status: "Approved" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("author", "username");
    article.views++;
    await article.save();
    const username = req.session.username || null;
    res.render("blogview", { 
      article, 
      username , 
      featuredArticles,
      latestArticle,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching article");
  }
});

app.get("/viewpendingarticle/:urlTitle", checkAuth, async (req, res) => {
  try {
   /* const articleId = req.params.id;
    const article = await Article.findById(articleId)*/
    const urlTitle = req.params.urlTitle;
    const article = await Article.findOne({ urlTitle })
      .populate("author", "username")
      .populate({
        path: "comments",
        populate: { path: "author", select: "username" },
        options: { sort: { createdAt: -1 }, strictPopulate: false },
      })
      .sort({ createdAt: -1 });
    if (!article) {
      return res.status(404).send("Article not found");
    }
    article.views++;
    await article.save();
    const username = req.session.username || null;
    res.render("viewpendingarticle", { 
      article, 
      username , 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching article");
  }
});

app.post("/like-post/:id", checkAuth, async function (req, res) {
  const articleId = req.params.id;

  try {
    if (!req.session.username) {
      req.session.redirectTo = req.originalUrl; 
      res.redirect("/login");
      return;
    }
    const post = await Article.findById(articleId);
    if (!post) {
      return res.status(404).send("article not found");
    }
    const user = await User.findOne({ username: req.session.username });

    const userLikedPost = post.likes.some((like) => {
      return like.user.toString() === user._id.toString();
    });

    if (userLikedPost) {
      post.likes = post.likes.filter((like) => {
        return like.user.toString() !== user._id.toString();
      });
    } else {
      post.likes.push({
        user: user._id,
      });
    }

    await post.save();
    const likesCount = post.likes.length;
    console.log("like added");
    res.json({ likesCount });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

app.post("/comment", checkAuth, async (req, res) => {
  try {
    if (!req.session.username) {
      req.session.redirectTo = req.headers.referer; 
      res.redirect("/login");
      return;
    }
    const { comment, postid } = req.body;
    const userid = await User.findOne({ username: req.session.username });
    const user = userid._id;

    const commentNew = new Comment({
      comment,
      author: user,
    });
    await commentNew.save();

    const article = await Article.findById(postid);
    article.comments.push(commentNew._id);
    await article.save();

    console.log("comment added");

    // Send the response as JSON
    const userr = await User.findById(user); 
    const response = {
      postid: postid,
      username: userr.username,
      comment: comment,
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding comment");
  }
});



//app listening
app.listen(PORT, () => {
  console.log(`server is running at port no ${PORT}`);
});
