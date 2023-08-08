import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

main().catch(err => console.log(err));

//Manage User Sessions
app.use(session({           
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); //Initialize passport
app.use(passport.session());    //Use passport to deal with sessions

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');

    const userSchema = new mongoose.Schema({
        email: String,
        password: String
    });

    //plugin passportLocalMongoose for facilitate hash and salting
    userSchema.plugin(passportLocalMongoose, { usernameField: "email"});

    const User = new mongoose.model('User', userSchema);

    //Create Local Strategy to authenticate with email and password entered in form
    passport.use(User.createStrategy());

    passport.serializeUser(User.serializeUser()); //To serialize user
    passport.deserializeUser(User.deserializeUser()); //To deserialize user
    
    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/secrets", (req, res) => {
        if (req.isAuthenticated()){
            res.render("secrets");
        } else {
            res.redirect("/login");
        }
    });

    app.get("/logout", async (req,res) => {
        req.logout((err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Logout failed");
            } else {
                res.redirect("/");
            }
        });
    });

    app.post("/register", async (req, res) => {
        try {
            await User.register({ email: req.body.email }, req.body.password);
            const authenticate = await passport.authenticate("local");
            authenticate(req, res, () => {
                res.redirect("/secrets");
            });
        } catch (error) {
            console.log('Error:' + error);
            res.redirect("/register");
        }
    });

    app.post("/login", passport.authenticate("local", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
    }));

    app.listen(3000, () => {
        console.log("Server started at port 3000");
    });
}